import { Router } from 'express';
import { z } from 'zod';
import { many, one, q } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const listQuery = z.object({
  body: z.string().optional(),
  brand: z.string().optional(),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(['price-asc', 'price-desc', 'power', 'rec']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

router.get('/', async (req, res, next) => {
  try {
    let q;
    try { q = listQuery.parse(req.query); }
    catch (e) { return res.status(400).json({ error: 'Bad query', detail: e.errors }); }

    const where = [`status = 'published'`];
    const params = [];
    const add = (sql, value) => { params.push(value); where.push(sql.replace('$?', `$${params.length}`)); };

    if (q.body) add('body = $?', q.body);
    if (q.brand) add('LOWER(brand) = LOWER($?)', q.brand);
    if (q.price_min != null) add('price_per_day >= $?', q.price_min);
    if (q.price_max != null) add('price_per_day <= $?', q.price_max);
    if (q.from && q.to) {
      params.push(q.from); const pFrom = params.length;
      params.push(q.to); const pTo = params.length;
      where.push(`id NOT IN (
        SELECT car_id FROM bookings
        WHERE status IN ('pending','active')
          AND NOT (to_dt <= $${pFrom} OR from_dt >= $${pTo})
      )`);
    }

    let order = 'created_at DESC, id';
    if (q.sort === 'price-asc') order = 'price_per_day ASC';
    else if (q.sort === 'price-desc') order = 'price_per_day DESC';
    else if (q.sort === 'power') order = 'power_hp DESC NULLS LAST';

    params.push(q.limit); const pLimit = params.length;
    params.push(q.offset); const pOffset = params.length;

    const sql = `SELECT * FROM cars WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT $${pLimit} OFFSET $${pOffset}`;
    const items = await many(sql, params);
    const countSql = `SELECT COUNT(*)::int AS c FROM cars WHERE ${where.join(' AND ')}`;
    const countRow = await one(countSql, params.slice(0, params.length - 2));
    res.json({ items, total: countRow?.c ?? 0 });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const car = await one(`SELECT * FROM cars WHERE id = $1 AND status = 'published'`, [req.params.id]);
    if (!car) return res.status(404).json({ error: 'Not found' });
    res.json(car);
  } catch (e) { next(e); }
});

export default router;

// Reviews
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const items = await many(
      `SELECT r.*, u.name as user_name, u.avatar_url as user_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.car_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json(items);
  } catch (e) {
    next(e);
  }
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().optional()
});

router.post('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const body = reviewSchema.parse(req.body);

    // Check if user has a completed booking for this car
    const hasCompletedBooking = await one(
      `SELECT id FROM bookings
       WHERE user_id = $1 AND car_id = $2 AND status = 'completed'
       LIMIT 1`,
      [req.user.id, req.params.id]
    );

    if (!hasCompletedBooking && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Отзыв могут оставить только пользователи, которые успешно арендовали этот автомобиль.' });
    }

    const { rows } = await q(
      `INSERT INTO reviews (car_id, user_id, rating, text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, req.user.id, body.rating, body.text || null]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad input', detail: e.errors });
    }
    next(e);
  }
});
