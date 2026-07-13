import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { many, q, one, getCashbackPercent } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { logAudit } from '../audit.js';

const router = Router();
router.use(requireRole('admin'));

// ── Этапы воронки бронирования ──
// Каждый этап маппится на «грубый» status, на котором держится дашборд.
const STAGES = ['new', 'docs', 'prepay', 'manager', 'issued', 'completed', 'cancelled'];
function statusForStage(stage) {
  if (stage === 'issued') return 'active';
  if (stage === 'completed') return 'completed';
  if (stage === 'cancelled') return 'cancelled';
  return 'pending'; // new / docs / prepay / manager
}
function stageForStatus(status) {
  if (status === 'active') return 'issued';
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'new';
}

// Начислить кэшбэк при переходе брони в «completed» (если ещё не начислялся)
async function awardCashbackIfNeeded(booking) {
  if (booking.status !== 'completed') return;
  const already = await one(
    `SELECT 1 FROM user_points WHERE user_id = $1 AND reason LIKE '%аренды #' || $2`,
    [booking.user_id, booking.id]
  );
  if (already) return;
  const pct = await getCashbackPercent();
  const cashback = Math.round(Number(booking.total) * pct / 100);
  if (cashback <= 0) return;
  await q(`UPDATE users SET points = COALESCE(points,0) + $1 WHERE id = $2`, [cashback, booking.user_id]);
  await q(`INSERT INTO user_points (user_id, amount, reason) VALUES ($1, $2, $3)`,
    [booking.user_id, cashback, `Кэшбэк ${pct}% за завершение аренды #${booking.id}`]);
}

// Dashboard analytics
router.get('/dashboard', async (req, res, next) => {
  try {
    // KPI metrics
    const [revenue, monthRevenue, bookingStats, clientCount, carCount, topCars, revenueByMonth, calendar] = await Promise.all([
      // Total revenue (completed bookings)
      one(`SELECT COALESCE(SUM(total), 0) AS total FROM bookings WHERE status = 'completed'`),
      // Revenue this month
      one(`SELECT COALESCE(SUM(total), 0) AS total FROM bookings WHERE status = 'completed' AND from_dt >= date_trunc('month', CURRENT_DATE)`),
      // Booking counts by status
      one(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'active') AS active,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
        COALESCE(AVG(total) FILTER (WHERE status = 'completed'), 0) AS avg_total
      FROM bookings`),
      // Number of clients (non-admin users)
      one(`SELECT COUNT(*) AS total FROM users WHERE role = 'user'`),
      // Number of cars
      one(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'published') AS published FROM cars`),
      // Top 5 cars by revenue
      many(`SELECT c.id, c.name, c.brand, c.image_url,
        COALESCE(SUM(b.total), 0) AS revenue,
        COUNT(b.id) AS rentals
      FROM cars c
      LEFT JOIN bookings b ON b.car_id = c.id AND b.status = 'completed'
      GROUP BY c.id, c.name, c.brand, c.image_url
      ORDER BY revenue DESC
      LIMIT 5`),
      // Revenue by month (last 6 months)
      many(`SELECT
        to_char(date_trunc('month', from_dt), 'YYYY-MM') AS month,
        to_char(date_trunc('month', from_dt), 'TMMonth') AS month_name,
        COALESCE(SUM(total), 0) AS revenue,
        COUNT(*) AS count
      FROM bookings
      WHERE status = 'completed'
        AND from_dt >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY date_trunc('month', from_dt)
      ORDER BY month`),
      // Calendar: all active/pending bookings from today onward (next 14 days)
      many(`SELECT b.id, b.car_id, c.name AS car_name, c.brand, b.from_dt, b.to_dt, b.status,
        u.name AS user_name
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      JOIN users u ON b.user_id = u.id
      WHERE b.status IN ('pending', 'active')
        AND b.to_dt >= CURRENT_DATE
        AND b.from_dt <= CURRENT_DATE + INTERVAL '14 days'
      ORDER BY b.from_dt`)
    ]);

    res.json({
      revenue: Number(revenue?.total || 0),
      month_revenue: Number(monthRevenue?.total || 0),
      bookings_total: Number(bookingStats?.total || 0),
      bookings_active: Number(bookingStats?.active || 0),
      bookings_pending: Number(bookingStats?.pending || 0),
      bookings_completed: Number(bookingStats?.completed || 0),
      bookings_cancelled: Number(bookingStats?.cancelled || 0),
      avg_booking: Math.round(Number(bookingStats?.avg_total || 0)),
      clients: Number(clientCount?.total || 0),
      cars_total: Number(carCount?.total || 0),
      cars_published: Number(carCount?.published || 0),
      top_cars: topCars,
      revenue_by_month: revenueByMonth,
      calendar: calendar
    });
  } catch (e) {
    next(e);
  }
});


router.get('/bookings', async (req, res, next) => {
  try {
    const items = await many(
      `SELECT b.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone, 'is_verified', u.is_verified) as user,
        json_build_object('id', c.id, 'name', c.name, 'brand', c.brand, 'image_url', c.image_url) as car
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

const patchBookingSchema = z.object({
  status: z.enum(['pending', 'active', 'completed', 'cancelled']).optional(),
  stage: z.enum(STAGES).optional(),
  total: z.coerce.number().int().min(0).optional(),
  manager: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  pickup_city: z.string().optional().nullable(),
  with_delivery: z.boolean().optional(),
  from_dt: z.string().datetime().optional(),
  to_dt: z.string().datetime().optional(),
  deposit_amount: z.coerce.number().int().min(0).optional(),
  deposit_returned: z.coerce.number().int().min(0).optional(),
  deposit_status: z.enum(['held', 'partial', 'returned']).optional().nullable(),
});

// Детали брони + удержания (для карточки брони, Блок 1)
router.get('/bookings/:id', async (req, res, next) => {
  try {
    const booking = await one(
      `SELECT b.*, json_build_object('id', c.id, 'name', c.name, 'image_url', c.image_url) AS car,
              json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone, 'is_verified', u.is_verified) AS "user"
       FROM bookings b JOIN cars c ON b.car_id = c.id JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`, [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Бронь не найдена' });
    const charges = await many(
      `SELECT id, type, amount, note, photo_url, created_at FROM rental_charges WHERE booking_id = $1 ORDER BY created_at DESC`,
      [req.params.id]);
    res.json({ booking, charges });
  } catch (e) { next(e); }
});

// Добавить удержание/штраф по аренде
const chargeSchema = z.object({
  type: z.string().max(80).optional().nullable(),
  amount: z.coerce.number().int(),
  note: z.string().max(500).optional().nullable(),
  photo_url: z.string().optional().nullable(),
});
router.post('/bookings/:id/charges', async (req, res, next) => {
  try {
    const body = chargeSchema.parse(req.body);
    const { rows } = await q(
      `INSERT INTO rental_charges (booking_id, type, amount, note, photo_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, type, amount, note, photo_url, created_at`,
      [req.params.id, body.type || null, body.amount, body.note || null, body.photo_url || null, req.user.id]);
    logAudit(req, 'booking', req.params.id, 'charge_add', { type: body.type, amount: body.amount });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверные поля', detail: e.errors });
    next(e);
  }
});
router.delete('/bookings/:id/charges/:chargeId', async (req, res, next) => {
  try {
    await q(`DELETE FROM rental_charges WHERE id = $1 AND booking_id = $2`, [req.params.chargeId, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.patch('/bookings/:id', async (req, res, next) => {
  try {
    const body = patchBookingSchema.parse(req.body);

    // Воронка ↔ статус: что бы ни прислали (stage или status) — синхронизируем оба
    if (body.stage) body.status = statusForStage(body.stage);
    else if (body.status) body.stage = stageForStatus(body.status);

    if (body.status === 'cancelled') {
      body.cancelled_at = new Date().toISOString();
      body.cancelled_by = 'admin';
    }

    const sets = [];
    const vals = [];
    let idx = 1;
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(v); }
    }
    if (!sets.length) return res.status(400).json({ error: 'Нечего обновлять' });

    vals.push(req.params.id);
    const { rows } = await q(`UPDATE bookings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    await awardCashbackIfNeeded(rows[0]);
    logAudit(req, 'booking', req.params.id, 'update', body);
    res.json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверные поля брони', detail: e.errors });
    // EXCLUDE-констрейнт: перенос дат наехал на другую бронь этой машины
    if (e && e.code === '23P01') return res.status(400).json({ error: 'Даты пересекаются с другой бронью этого автомобиля' });
    next(e);
  }
});

// Ручное создание брони (клиент позвонил/пришёл). Можно по существующему user_id
// или по контактам нового клиента (создадим пользователя на лету).
const manualBookingSchema = z.object({
  car_id: z.string(),
  user_id: z.coerce.number().int().optional(),
  client_name: z.string().min(2).optional(),
  client_email: z.string().email().optional(),
  client_phone: z.string().optional(),
  from_dt: z.string().datetime(),
  to_dt: z.string().datetime(),
  total: z.coerce.number().int().min(0),
  pickup_city: z.string().optional().nullable(),
  with_delivery: z.boolean().default(false),
  manager: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  stage: z.enum(STAGES).default('new'),
});

router.post('/bookings', async (req, res, next) => {
  try {
    const body = manualBookingSchema.parse(req.body);

    const car = await one(`SELECT id FROM cars WHERE id = $1`, [body.car_id]);
    if (!car) return res.status(400).json({ error: 'Автомобиль не найден' });

    let userId = body.user_id;
    if (!userId) {
      if (!body.client_email || !body.client_name) {
        return res.status(400).json({ error: 'Укажите клиента (user_id) или имя + email нового клиента' });
      }
      const existing = await one(`SELECT id FROM users WHERE email = $1`, [body.client_email.toLowerCase()]);
      if (existing) {
        userId = existing.id;
      } else {
        const hash = bcrypt.hashSync(Math.random().toString(36).slice(2) + 'Aurix!', 10);
        const created = await one(
          `INSERT INTO users (email, name, phone, password_hash, role)
           VALUES ($1, $2, $3, $4, 'user') RETURNING id`,
          [body.client_email.toLowerCase(), body.client_name, body.client_phone || null, hash]
        );
        userId = created.id;
      }
    }

    const status = statusForStage(body.stage);
    const { rows } = await q(
      `INSERT INTO bookings (car_id, user_id, from_dt, to_dt, pickup_city, with_delivery, total, status, stage, manager, notes, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'manual') RETURNING *`,
      [body.car_id, userId, body.from_dt, body.to_dt, body.pickup_city || null,
       body.with_delivery, body.total, status, body.stage, body.manager || null, body.notes || null]
    );
    await awardCashbackIfNeeded(rows[0]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверные поля брони', detail: e.errors });
    if (e && e.code === '23P01') return res.status(400).json({ error: 'Автомобиль занят на выбранные даты (пересечение с другой бронью)' });
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

const updateCarSchema = z.object({
  id: z.string().min(2).regex(/^[a-z0-9-]+$/, 'ID: только латиница, цифры и дефис').optional(),
  sort_order: z.coerce.number().int().optional(),
  name: z.string().min(2).optional(),
  brand: z.string().min(2).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  body: z.string().min(2).optional(),
  fuel: z.string().min(2).optional(),
  engine: z.string().min(2).optional(),
  power_hp: z.coerce.number().int().min(1).optional(),
  drive: z.string().min(2).optional(),
  price_per_day: z.coerce.number().int().min(0).optional(),
  deposit: z.coerce.number().int().min(0).optional(),
  mileage_limit: z.coerce.number().int().min(0).optional(),
  overmileage_rate: z.coerce.number().int().min(0).optional(),
  photo_rate: z.coerce.number().int().min(0).optional(),
  price_6_12: z.coerce.number().int().optional().nullable(),
  price_30: z.coerce.number().int().optional().nullable(),
  image_url: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  // «Закрыта до даты»: YYYY-MM-DD (или ISO), пустая строка/null — открыть машину
  closed_until: z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Дата в формате ГГГГ-ММ-ДД').nullable().optional()
  ),
  status: z.enum(['published', 'hidden', 'pending', 'rejected']).optional()
});

router.patch('/cars/:id', async (req, res, next) => {
  try {
    const body = updateCarSchema.parse(req.body);

    // Переименование ID (для поиска) — проверяем уникальность; FK обновятся каскадом
    if (body.id && body.id !== req.params.id) {
      const clash = await one(`SELECT id FROM cars WHERE id = $1`, [body.id]);
      if (clash) return res.status(400).json({ error: 'Машина с таким ID уже существует' });
    } else {
      delete body.id;
    }

    const sets = [];
    const vals = [];
    let idx = 1;

    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) {
        sets.push(`${k} = $${idx++}`);
        vals.push(v);
      }
    }

    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(req.params.id);
    const { rows } = await q(
      `UPDATE cars SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'car', req.params.id, 'update', body);
    res.json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Неверно заполнены поля формы', detail: e.errors });
    }
    next(e);
  }
});

// Удаление машины. Если на неё есть брони — БД не даст удалить (FK RESTRICT),
// тогда отдаём понятное сообщение: лучше скрыть.
router.delete('/cars/:id', async (req, res, next) => {
  try {
    const used = await one(`SELECT 1 FROM bookings WHERE car_id = $1 LIMIT 1`, [req.params.id]);
    if (used) {
      return res.status(409).json({ error: 'У машины есть бронирования — её нельзя удалить. Скройте её вместо удаления.' });
    }
    const { rows } = await q(`DELETE FROM cars WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Смена порядка машин на сайте: принимаем массив id в нужном порядке
router.post('/cars/reorder', async (req, res, next) => {
  try {
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    for (let i = 0; i < ids.length; i++) {
      await q(`UPDATE cars SET sort_order = $1 WHERE id = $2`, [(i + 1) * 10, ids[i]]);
    }
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Bad input', detail: e.errors });
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

    const maxRow = await one(`SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM cars`);
    const { rows } = await q(
      `INSERT INTO cars (
        id, name, brand, year, body, fuel, engine, power_hp, drive,
        price_per_day, deposit, mileage_limit, overmileage_rate, photo_rate,
        price_6_12, price_30, image_url, description, color, badge, sort_order, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'published')
      RETURNING *`,
      [
        body.id, body.name, body.brand, body.year, body.body, body.fuel, body.engine, body.power_hp, body.drive,
        body.price_per_day, body.deposit, body.mileage_limit, body.overmileage_rate, body.photo_rate,
        body.price_6_12 || null, body.price_30 || null, body.image_url, body.description || null,
        body.color || null, body.badge || null, maxRow?.next ?? 10
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
    const { url } = z.object({
      url: z.string().min(1).refine(
        v => /^https?:\/\//.test(v) || v.startsWith('data:image/') || v.startsWith('/'),
        'Нужна ссылка (http/https), путь /cars/... или загруженный файл'
      )
    }).parse(req.body);
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
const USER_LIST_COLS = `id, email, name, phone, role, is_verified, points, manager, dob, admin_note,
  passport_url, license_url, passport_page_url, registration_url, created_at`;

router.get('/users', async (req, res, next) => {
  try {
    const items = await many(`SELECT ${USER_LIST_COLS} FROM users ORDER BY created_at DESC`);
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Ручное создание клиента
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().min(5),
  password: z.string().min(6).optional(),
  role: z.enum(['user', 'partner', 'admin']).default('user'),
  is_verified: z.boolean().default(false),
  manager: z.string().optional().nullable(),
  admin_note: z.string().optional().nullable(),
});

router.post('/users', async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const exists = await one(`SELECT id FROM users WHERE email = $1`, [body.email.toLowerCase()]);
    if (exists) return res.status(409).json({ error: 'Email уже зарегистрирован' });

    const hash = bcrypt.hashSync(body.password || (Math.random().toString(36).slice(2) + 'Aurix!'), 10);
    const { rows } = await q(
      `INSERT INTO users (email, name, phone, password_hash, role, is_verified, manager, admin_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${USER_LIST_COLS}`,
      [body.email.toLowerCase(), body.name, body.phone, hash, body.role, body.is_verified,
       body.manager || null, body.admin_note || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверные поля', detail: e.errors });
    next(e);
  }
});

const patchUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['user', 'partner', 'admin']).optional(),
  is_verified: z.boolean().optional(),
  manager: z.string().optional().nullable(),
  admin_note: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const body = patchUserSchema.parse(req.body);
    if (body.email) body.email = body.email.toLowerCase();
    if (body.dob === '') body.dob = null;

    const sets = [];
    const vals = [];
    let idx = 1;
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(v); }
    }
    if (!sets.length) return res.status(400).json({ error: 'Нечего обновлять' });

    vals.push(req.params.id);
    const { rows } = await q(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING ${USER_LIST_COLS}`, vals);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'user', req.params.id, 'update', body);
    res.json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверные поля', detail: e.errors });
    if (e && e.code === '23505') return res.status(400).json({ error: 'Этот email уже используется' });
    next(e);
  }
});

// Начислить / списать баллы клиента (без платёжной системы — вручную менеджером)
router.post('/users/:id/points', async (req, res, next) => {
  try {
    const { amount, reason } = z.object({
      amount: z.coerce.number().int().refine(v => v !== 0, 'Сумма не может быть 0'),
      reason: z.string().min(2),
    }).parse(req.body);

    const user = await one(`SELECT id, points FROM users WHERE id = $1`, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    if (amount < 0 && (user.points || 0) + amount < 0) {
      return res.status(400).json({ error: 'Недостаточно баллов на балансе клиента' });
    }

    await q(`UPDATE users SET points = COALESCE(points,0) + $1 WHERE id = $2`, [amount, req.params.id]);
    await q(`INSERT INTO user_points (user_id, amount, reason) VALUES ($1,$2,$3)`, [req.params.id, amount, reason]);
    const fresh = await one(`SELECT ${USER_LIST_COLS} FROM users WHERE id = $1`, [req.params.id]);
    logAudit(req, 'user', req.params.id, 'points', { amount, reason });
    res.json(fresh);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверные поля', detail: e.errors });
    next(e);
  }
});

// Full client profile — for the bookings → client view in admin
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await one(
      `SELECT id, email, name, phone, role, is_verified, points, manager, dob, admin_note,
              passport_url, license_url, passport_page_url, registration_url, created_at,
              money_balance, deposit_balance
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const bookings = await many(
      `SELECT b.id, b.status, b.stage, b.from_dt, b.to_dt, b.total, b.manager, b.notes,
              b.pickup_city, b.with_delivery, b.source, b.created_at,
        json_build_object('id', c.id, 'name', c.name) as car
       FROM bookings b JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [req.params.id]
    );
    const points = await many(
      `SELECT id, amount, reason, created_at FROM user_points WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    const transactions = await many(
      `SELECT id, kind, target, amount, reason, booking_id, created_at
       FROM balance_transactions WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ user, bookings, points, transactions });
  } catch (e) {
    next(e);
  }
});

// Пополнение/списание баланса клиента (денежный или депозитный) — вручную
// менеджером, с пояснением. Атомарно: движение баланса + запись в историю.
const balanceSchema = z.object({
  kind: z.enum(['topup', 'charge']),
  target: z.enum(['money', 'deposit']),
  amount: z.coerce.number().int().positive(),
  reason: z.string().max(500).optional().nullable(),
  booking_id: z.coerce.number().int().optional().nullable(),
});

router.post('/users/:id/balance', async (req, res, next) => {
  try {
    const body = balanceSchema.parse(req.body);
    const col = body.target === 'money' ? 'money_balance' : 'deposit_balance';
    const delta = body.kind === 'topup' ? body.amount : -body.amount;

    const user = await one(`SELECT id, ${col} AS bal FROM users WHERE id = $1`, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Клиент не найден' });
    if ((user.bal || 0) + delta < 0) {
      return res.status(400).json({ error: 'Недостаточно средств на балансе для списания' });
    }

    const updated = await one(
      `UPDATE users SET ${col} = COALESCE(${col}, 0) + $1 WHERE id = $2
       RETURNING money_balance, deposit_balance`,
      [delta, req.params.id]
    );
    const { rows } = await q(
      `INSERT INTO balance_transactions (user_id, kind, target, amount, reason, booking_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, kind, target, amount, reason, booking_id, created_at`,
      [req.params.id, body.kind, body.target, body.amount, body.reason || null, body.booking_id || null, req.user.id]
    );
    logAudit(req, 'user', req.params.id, 'balance', { kind: body.kind, target: body.target, amount: body.amount, reason: body.reason });
    res.status(201).json({ ...updated, transaction: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверные поля', detail: e.errors });
    next(e);
  }
});

// ── Журнал аудита (Блок 3) ──
router.get('/audit', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const entity = req.query.entity;
    const where = entity ? `WHERE entity_type = $2` : '';
    const params = entity ? [limit, entity] : [limit];
    const rows = await many(
      `SELECT id, entity_type, entity_id, action, actor_id, actor_name, actor_role, changes, created_at
       FROM audit_log ${where} ORDER BY created_at DESC LIMIT $1`, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// ── Настройки (кэшбэк %) ──
router.get('/settings', async (req, res, next) => {
  try {
    const rows = await many(`SELECT key, value FROM app_settings`);
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(settings);
  } catch (e) { next(e); }
});

router.patch('/settings', async (req, res, next) => {
  try {
    const { cashback_percent } = z.object({
      cashback_percent: z.coerce.number().min(0).max(100),
    }).parse(req.body);
    await q(
      `INSERT INTO app_settings (key, value) VALUES ('cashback_percent', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [String(cashback_percent)]
    );
    res.json({ cashback_percent: String(cashback_percent) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверное значение', detail: e.errors });
    next(e);
  }
});

export default router;
