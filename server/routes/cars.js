import { Router } from 'express';
import { z } from 'zod';
import { many, one, q } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { FLEET } from '../../src/data/fleet.js';

const router = Router();

const DB_AVAILABLE = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

// Normalize fleet.js shape to match DB row shape
function fleetToRow(c) {
  return {
    id: c.id, name: c.name,
    brand: c.name.split(/[\s-]/)[0],
    year: c.year, body: c.body, fuel: c.fuel,
    engine: c.engine, power_hp: parseInt(c.power) || null,
    drive: c.drive, price_per_day: c.price,
    price_6_12: c.price_6_12 ?? null,
    price_30: c.price_30 ?? null,
    deposit: c.deposit ?? 0,
    mileage_limit: c.mileage_limit ?? 250,
    overmileage_rate: c.overmileage_rate ?? 200,
    photo_rate: c.photo_rate ?? 0,
    badge: c.badge ?? null, image_url: c.img,
    description: null, status: 'published',
    owner_id: null, created_at: new Date().toISOString(),
  };
}

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
    let qs;
    try { qs = listQuery.parse(req.query); }
    catch (e) { return res.status(400).json({ error: 'Bad query', detail: e.errors }); }

    if (!DB_AVAILABLE) {
      let rows = FLEET.map(fleetToRow);
      if (qs.body) rows = rows.filter(c => c.body === qs.body);
      if (qs.brand) rows = rows.filter(c => c.brand.toLowerCase() === qs.brand.toLowerCase());
      if (qs.price_min != null) rows = rows.filter(c => c.price_per_day >= qs.price_min);
      if (qs.price_max != null) rows = rows.filter(c => c.price_per_day <= qs.price_max);
      if (qs.sort === 'price-asc') rows.sort((a, b) => a.price_per_day - b.price_per_day);
      else if (qs.sort === 'price-desc') rows.sort((a, b) => b.price_per_day - a.price_per_day);
      else if (qs.sort === 'power') rows.sort((a, b) => (b.power_hp || 0) - (a.power_hp || 0));
      const total = rows.length;
      rows = rows.slice(qs.offset, qs.offset + qs.limit);
      return res.json({ items: rows, total });
    }

    const where = [`status = 'published'`];
    const params = [];
    const add = (sql, value) => { params.push(value); where.push(sql.replace('$?', `$${params.length}`)); };

    if (qs.body) add('body = $?', qs.body);
    if (qs.brand) add('LOWER(brand) = LOWER($?)', qs.brand);
    if (qs.price_min != null) add('price_per_day >= $?', qs.price_min);
    if (qs.price_max != null) add('price_per_day <= $?', qs.price_max);
    if (qs.from && qs.to) {
      params.push(qs.from); const pFrom = params.length;
      params.push(qs.to); const pTo = params.length;
      where.push(`id NOT IN (
        SELECT car_id FROM bookings
        WHERE status IN ('pending','active')
          AND NOT (to_dt <= $${pFrom} OR from_dt >= $${pTo})
      )`);
    }

    let order = 'created_at DESC, id';
    if (qs.sort === 'price-asc') order = 'price_per_day ASC';
    else if (qs.sort === 'price-desc') order = 'price_per_day DESC';
    else if (qs.sort === 'power') order = 'power_hp DESC NULLS LAST';

    params.push(qs.limit); const pLimit = params.length;
    params.push(qs.offset); const pOffset = params.length;

    const sql = `SELECT * FROM cars WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT $${pLimit} OFFSET $${pOffset}`;
    const items = await many(sql, params);
    const countSql = `SELECT COUNT(*)::int AS c FROM cars WHERE ${where.join(' AND ')}`;
    const countRow = await one(countSql, params.slice(0, params.length - 2));
    res.json({ items, total: countRow?.c ?? 0 });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!DB_AVAILABLE) {
      const car = FLEET.map(fleetToRow).find(c => c.id === req.params.id);
      if (!car) return res.status(404).json({ error: 'Not found' });
      return res.json(car);
    }
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
