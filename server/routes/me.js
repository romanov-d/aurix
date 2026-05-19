import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { many, q } from '../db.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ user: req.user });
});

router.get('/bookings', async (req, res, next) => {
  try {
    const items = await many(
      `SELECT b.*,
        json_build_object(
          'id', c.id, 'name', c.name, 'brand', c.brand, 'image_url', c.image_url,
          'year', c.year, 'body', c.body
        ) as car
       FROM bookings b
       JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Favorites
router.get('/favorites', async (req, res, next) => {
  try {
    const items = await many(`SELECT car_id FROM favorites WHERE user_id = $1`, [req.user.id]);
    res.json(items.map(i => i.car_id));
  } catch (e) {
    next(e);
  }
});

router.post('/favorites/:carId', async (req, res, next) => {
  try {
    await q(`INSERT INTO favorites (user_id, car_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.user.id, req.params.carId]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete('/favorites/:carId', async (req, res, next) => {
  try {
    await q(`DELETE FROM favorites WHERE user_id = $1 AND car_id = $2`, [req.user.id, req.params.carId]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
