import { Router } from 'express';
import { z } from 'zod';
import { q, one } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const bookSchema = z.object({
  car_id: z.string(),
  from_dt: z.string().datetime(),
  to_dt: z.string().datetime(),
  pickup_city: z.string().optional(),
  return_city: z.string().optional(),
  with_driver: z.boolean().default(false),
  with_delivery: z.boolean().default(false),
});

function getDayPrice(car, days) {
  if (days >= 30 && car.price_30) return car.price_30;
  if (days >= 6 && car.price_6_12) return car.price_6_12;
  return car.price_per_day;
}

router.post('/', async (req, res, next) => {
  try {
    const body = bookSchema.parse(req.body);

    // Verify car exists and is published
    const car = await one(`SELECT * FROM cars WHERE id = $1 AND status = 'published'`, [body.car_id]);
    if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });

    // Check overlaps (exclude cancelled bookings)
    const overlap = await one(
      `SELECT id FROM bookings
       WHERE car_id = $1 AND status IN ('pending', 'active')
         AND NOT (to_dt <= $2::timestamptz OR from_dt >= $3::timestamptz)`,
      [body.car_id, body.from_dt, body.to_dt]
    );

    if (overlap) {
      return res.status(400).json({ error: 'Автомобиль занят на выбранные даты' });
    }

    // Calculate duration in days (naive: 1 day minimum)
    const d1 = new Date(body.from_dt);
    const d2 = new Date(body.to_dt);
    const ms = d2.getTime() - d1.getTime();
    let days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days < 1) days = 1;

    // Calculate total price using tiered rates (mirrors frontend logic)
    const dayPrice = getDayPrice(car, days);
    const total = days * dayPrice;

    const { rows } = await q(
      `INSERT INTO bookings (car_id, user_id, from_dt, to_dt, pickup_city, return_city, with_driver, with_delivery, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [
        body.car_id,
        req.user.id,
        body.from_dt,
        body.to_dt,
        body.pickup_city || null,
        body.return_city || null,
        body.with_driver,
        body.with_delivery,
        total
      ]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad input', detail: e.errors });
    }
    next(e);
  }
});

const patchSchema = z.object({
  status: z.enum(['cancelled', 'active', 'completed']).optional(),
  to_dt: z.string().datetime().optional()
});

router.patch('/:id', async (req, res, next) => {
  try {
    const booking = await one(`SELECT * FROM bookings WHERE id = $1`, [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Бронирование не найдено' });
    
    // Only user or admin can modify
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const updates = patchSchema.parse(req.body);
    let setClauses = [];
    let params = [];
    
    if (updates.status) {
      params.push(updates.status);
      setClauses.push(`status = $${params.length}`);
    }
    
    if (updates.to_dt) {
      params.push(updates.to_dt);
      setClauses.push(`to_dt = $${params.length}`);
      
      // recalculate total? Simple implementation: keep original total for now
      // Or we can recalculate it here. For now, leave total as is.
    }
    
    if (setClauses.length === 0) {
      return res.json(booking);
    }
    
    params.push(booking.id);
    const { rows } = await q(
      `UPDATE bookings SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    
    const updated = rows[0];

    // Award cashback points if status transitions to completed
    if (updates.status === 'completed' && booking.status !== 'completed') {
      const cashback = Math.round(updated.total * 0.05);
      if (cashback > 0) {
        await q(`UPDATE users SET points = points + $1 WHERE id = $2`, [cashback, updated.user_id]);
        await q(
          `INSERT INTO user_points (user_id, amount, reason) VALUES ($1, $2, $3)`,
          [updated.user_id, cashback, `Кэшбэк 5% за завершение аренды #${updated.id}`]
        );
      }
    }
    
    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad input', detail: e.errors });
    }
    next(e);
  }
});

export default router;
