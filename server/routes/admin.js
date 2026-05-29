import { Router } from 'express';
import { z } from 'zod';
import { many, q, one } from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireRole('admin'));

// Bookings
router.get('/bookings', async (req, res, next) => {
  try {
    const items = await many(
      `SELECT b.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone) as user,
        json_build_object('id', c.id, 'name', c.name, 'brand', c.brand) as car
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN cars c ON b.car_id = c.id
       ORDER BY b.created_at DESC`
    );
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.patch('/bookings/:id', async (req, res, next) => {
  try {
    const body = z.object({ status: z.enum(['pending', 'active', 'completed', 'cancelled']) }).parse(req.body);
    const { rows } = await q(
      `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [body.status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

// Cars
router.get('/cars', async (req, res, next) => {
  try {
    // Return all cars including hidden/pending
    const items = await many(`SELECT * FROM cars ORDER BY created_at DESC`);
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.patch('/cars/:id', async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(['published', 'hidden', 'pending', 'rejected']).optional(),
      badge: z.string().max(60).nullable().optional(),
    }).parse(req.body);

    const sets = [];
    const vals = [];
    if (body.status !== undefined) { vals.push(body.status);  sets.push(`status = $${vals.length}`); }
    if (body.badge  !== undefined) { vals.push(body.badge);   sets.push(`badge  = $${vals.length}`); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(req.params.id);
    const { rows } = await q(
      `UPDATE cars SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

const createCarSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  brand: z.string().min(2),
  year: z.coerce.number().int().min(1900).max(2100),
  body: z.string().min(2),
  fuel: z.string().min(2),
  engine: z.string().min(2),
  power_hp: z.coerce.number().int().min(1),
  drive: z.string().min(2),
  price_per_day: z.coerce.number().int().min(0),
  deposit: z.coerce.number().int().min(0),
  mileage_limit: z.coerce.number().int().min(0),
  overmileage_rate: z.coerce.number().int().min(0),
  photo_rate: z.coerce.number().int().min(0),
  price_6_12: z.coerce.number().int().optional().nullable(),
  price_30: z.coerce.number().int().optional().nullable(),
  image_url: z.string().min(1),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  badge: z.string().optional().nullable()
});

router.post('/cars', async (req, res, next) => {
  try {
    const body = createCarSchema.parse(req.body);

    const exists = await one(`SELECT id FROM cars WHERE id = $1`, [body.id]);
    if (exists) {
      return res.status(400).json({ error: 'Автомобиль с таким ID уже существует' });
    }

    const { rows } = await q(
      `INSERT INTO cars (
        id, name, brand, year, body, fuel, engine, power_hp, drive,
        price_per_day, deposit, mileage_limit, overmileage_rate, photo_rate,
        price_6_12, price_30, image_url, description, color, badge, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'published')
      RETURNING *`,
      [
        body.id, body.name, body.brand, body.year, body.body, body.fuel, body.engine, body.power_hp, body.drive,
        body.price_per_day, body.deposit, body.mileage_limit, body.overmileage_rate, body.photo_rate,
        body.price_6_12 || null, body.price_30 || null, body.image_url, body.description || null,
        body.color || null, body.badge || null
      ]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Неверно заполнены обязательные поля формы', detail: e.errors });
    }
    next(e);
  }
});

// Car photos
router.get('/cars/:id/photos', async (req, res, next) => {
  try {
    const photos = await many(
      `SELECT id, url, sort_order FROM car_photos WHERE car_id = $1 ORDER BY sort_order, id`,
      [req.params.id]
    );
    res.json(photos);
  } catch (e) { next(e); }
});

router.post('/cars/:id/photos', async (req, res, next) => {
  try {
    const { url } = z.object({ url: z.string().url() }).parse(req.body);
    const maxOrder = await one(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM car_photos WHERE car_id = $1`,
      [req.params.id]
    );
    const { rows } = await q(
      `INSERT INTO car_photos (car_id, url, sort_order) VALUES ($1, $2, $3) RETURNING id, url, sort_order`,
      [req.params.id, url, maxOrder?.next ?? 0]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/cars/:id/photos/:photoId', async (req, res, next) => {
  try {
    await q(`DELETE FROM car_photos WHERE id = $1 AND car_id = $2`, [req.params.photoId, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Users
router.get('/users', async (req, res, next) => {
  try {
    const items = await many(`SELECT id, email, name, phone, role, is_verified, created_at FROM users ORDER BY created_at DESC`);
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const body = z.object({ is_verified: z.boolean() }).parse(req.body);
    const { rows } = await q(
      `UPDATE users SET is_verified = $1 WHERE id = $2 RETURNING id, email, name, phone, role, is_verified, created_at`,
      [body.is_verified, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

export default router;
