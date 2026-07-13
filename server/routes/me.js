import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { many, q } from '../db.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ user: req.user });
});

const DOC_FIELDS = ['passport_url', 'license_url', 'passport_page_url', 'registration_url'];

router.patch('/', async (req, res, next) => {
  try {
    const { name, phone, email, avatar_url, dob,
            passport_url, license_url, passport_page_url, registration_url } = req.body;

    // Документы можно редактировать только до прохождения верификации
    const docChange = { passport_url, license_url, passport_page_url, registration_url };
    const editingDocs = DOC_FIELDS.some(f => docChange[f] !== undefined);
    if (editingDocs && req.user.is_verified) {
      return res.status(403).json({ error: 'Документы уже проверены и заблокированы. Для изменений обратитесь к менеджеру.' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
    if (dob !== undefined) { fields.push(`dob = $${idx++}`); values.push(dob || null); }
    if (email !== undefined) {
      const clean = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return res.status(400).json({ error: 'Некорректный email' });
      }
      fields.push(`email = $${idx++}`); values.push(clean);
    }
    if (avatar_url !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(avatar_url); }
    if (passport_url !== undefined) { fields.push(`passport_url = $${idx++}`); values.push(passport_url); }
    if (license_url !== undefined) { fields.push(`license_url = $${idx++}`); values.push(license_url); }
    if (passport_page_url !== undefined) { fields.push(`passport_page_url = $${idx++}`); values.push(passport_page_url); }
    if (registration_url !== undefined) { fields.push(`registration_url = $${idx++}`); values.push(registration_url); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    values.push(req.user.id);
    const { rows } = await q(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, name, phone, avatar_url, role, points, is_verified, dob, passport_url, license_url, passport_page_url, registration_url, created_at`,
      values
    );

    res.json({ user: rows[0] });
  } catch (e) {
    if (e && e.code === '23505') {
      return res.status(400).json({ error: 'Этот email уже используется' });
    }
    next(e);
  }
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

// Partner flow: Submit car for moderation
import { z } from 'zod';
const carSchema = z.object({
  name: z.string().min(2),
  brand: z.string().min(2),
  year: z.number().int().min(1900).max(2100),
  body: z.string().optional(),
  fuel: z.string().optional(),
  engine: z.string().optional(),
  power_hp: z.number().int().optional(),
  drive: z.string().optional(),
  price_per_day: z.number().int().min(1000),
  image_url: z.string().url(),
  description: z.string().optional()
});

router.post('/cars', async (req, res, next) => {
  try {
    const body = carSchema.parse(req.body);
    const id = 'C-' + Date.now(); // Generate simple ID
    
    const { rows } = await q(
      `INSERT INTO cars (
        id, name, brand, year, body, fuel, engine, power_hp, drive, 
        price_per_day, image_url, description, status, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13)
      RETURNING *`,
      [
        id, body.name, body.brand, body.year, body.body || null, 
        body.fuel || null, body.engine || null, body.power_hp || null, 
        body.drive || null, body.price_per_day, body.image_url, 
        body.description || null, req.user.id
      ]
    );

    // If user is 'user', upgrade them to 'partner'
    if (req.user.role === 'user') {
      await q(`UPDATE users SET role = 'partner' WHERE id = $1`, [req.user.id]);
    }

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad input', detail: e.errors });
    }
    next(e);
  }
});

router.get('/points', async (req, res, next) => {
  try {
    const items = await many(
      `SELECT * FROM user_points WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Финансовая витрина клиента (Блок 1+2): балансы, движения по счёту,
// штрафы/удержания и календарь возврата залога по всем его арендам.
router.get('/finances', async (req, res, next) => {
  try {
    const [me] = await many(
      `SELECT money_balance, deposit_balance FROM users WHERE id = $1`, [req.user.id]);
    const transactions = await many(
      `SELECT id, kind, target, amount, reason, booking_id, created_at
       FROM balance_transactions WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]);
    const charges = await many(
      `SELECT rc.id, rc.type, rc.amount, rc.note, rc.photo_url, rc.created_at,
              rc.booking_id, c.name AS car_name
       FROM rental_charges rc
       JOIN bookings b ON rc.booking_id = b.id
       JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = $1 ORDER BY rc.created_at DESC`,
      [req.user.id]);
    const deposits = await many(
      `SELECT b.id AS booking_id, c.name AS car_name, b.deposit_amount,
              b.deposit_returned, b.deposit_status
       FROM bookings b JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = $1 AND b.deposit_amount > 0
       ORDER BY b.created_at DESC`,
      [req.user.id]);
    const movements = await many(
      `SELECT dm.id, dm.booking_id, c.name AS car_name, dm.kind, dm.amount,
              dm.note, to_char(dm.due_date, 'YYYY-MM-DD') AS due_date, dm.status, dm.done_at
       FROM deposit_movements dm
       JOIN bookings b ON dm.booking_id = b.id
       JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = $1 ORDER BY dm.due_date NULLS LAST, dm.created_at`,
      [req.user.id]);
    res.json({
      money_balance: me?.money_balance || 0,
      deposit_balance: me?.deposit_balance || 0,
      transactions, charges, deposits, movements,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
