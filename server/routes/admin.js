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
    const body = z.object({ status: z.enum(['published', 'hidden', 'pending', 'rejected']) }).parse(req.body);
    const { rows } = await q(
      `UPDATE cars SET status = $1 WHERE id = $2 RETURNING *`,
      [body.status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

// Users
router.get('/users', async (req, res, next) => {
  try {
    const items = await many(`SELECT id, email, name, phone, role, created_at FROM users ORDER BY created_at DESC`);
    res.json(items);
  } catch (e) {
    next(e);
  }
});

export default router;
