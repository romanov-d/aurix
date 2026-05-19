import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { many } from '../db.js';

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

export default router;
