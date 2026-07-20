import { Router } from 'express';
import { z } from 'zod';
import { q, one } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { pushToSalebot } from '../salebot.js';

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
    // Бронь только для верифицированных (документы проверены). Админ — без ограничений.
    if (!req.user.is_verified && req.user.role !== 'admin') {
      return res.status(403).json({
        code: 'NOT_VERIFIED',
        error: 'Чтобы бронировать, сначала пройдите верификацию с документами в личном кабинете.',
      });
    }

    const body = bookSchema.parse(req.body);

    // Валидация дат: возврат позже получения; начало — не в глубоком прошлом
    // (допуск сутки, чтобы бронь «сегодня утром» не резало по часовому поясу)
    if (new Date(body.to_dt) <= new Date(body.from_dt)) {
      return res.status(400).json({ error: 'Дата возврата должна быть позже даты получения' });
    }
    if (new Date(body.from_dt) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      return res.status(400).json({ error: 'Дата начала аренды уже прошла' });
    }

    // Verify car exists and is published
    const car = await one(`SELECT * FROM cars WHERE id = $1 AND status = 'published'`, [body.car_id]);
    if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });

    // Машина «закрыта до даты» — бронь, начинающаяся раньше открытия, невозможна
    if (car.closed_until && new Date(body.from_dt) < new Date(car.closed_until)) {
      const openDate = new Date(car.closed_until).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      return res.status(400).json({ error: `Автомобиль в аренде — будет доступен с ${openDate}` });
    }

    // Проверка пересечений: занятыми считаем только оплаченные (booked) и выданные (active).
    // Новые/на проверке документов/ожидающие оплаты — не блокируют даты.
    const overlap = await one(
      `SELECT id FROM bookings
       WHERE car_id = $1 AND status IN ('booked', 'active')
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

    // Подкрепляем данные брони в SaleBot для рассылок (не блокируем ответ)
    pushToSalebot('booking', {
      booking_id: rows[0].id,
      user_id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      car_id: body.car_id,
      car_name: car.name,
      from_dt: body.from_dt,
      to_dt: body.to_dt,
      total,
    }).catch(() => {});

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad input', detail: e.errors });
    }
    // 23P01 — EXCLUDE-констрейнт bookings_no_overlap: гонка двух броней,
    // проверку выше оба прошли, но вставилась только первая
    if (e && e.code === '23P01') {
      return res.status(400).json({ error: 'Автомобиль занят на выбранные даты' });
    }
    next(e);
  }
});

// Клиент может только ОТМЕНИТЬ свою бронь (или продлить дату). При отмене
// запись не удаляется — остаётся «след» (status=cancelled, cancelled_by).
const patchSchema = z.object({
  status: z.enum(['cancelled']).optional(),
  to_dt: z.string().datetime().optional()
});

router.patch('/:id', async (req, res, next) => {
  try {
    const booking = await one(`SELECT * FROM bookings WHERE id = $1`, [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Бронирование не найдено' });

    const isOwner = booking.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const updates = patchSchema.parse(req.body);
    let setClauses = [];
    let params = [];

    if (updates.status === 'cancelled') {
      if (!isAdmin && !['pending', 'active'].includes(booking.status)) {
        return res.status(400).json({ error: 'Эту бронь уже нельзя отменить' });
      }
      params.push('cancelled'); setClauses.push(`status = $${params.length}`);
      params.push('cancelled'); setClauses.push(`stage = $${params.length}`);
      params.push(new Date().toISOString()); setClauses.push(`cancelled_at = $${params.length}`);
      params.push(isAdmin ? 'admin' : 'user'); setClauses.push(`cancelled_by = $${params.length}`);
    }

    if (updates.to_dt) {
      // Продлить можно только живую бронь; дата возврата — позже начала
      if (!['pending', 'active'].includes(booking.status)) {
        return res.status(400).json({ error: 'Эту бронь уже нельзя изменить' });
      }
      if (new Date(updates.to_dt) <= new Date(booking.from_dt)) {
        return res.status(400).json({ error: 'Дата возврата должна быть позже даты получения' });
      }
      // Продление не должно наехать на чужую бронь этой машины
      const clash = await one(
        `SELECT id FROM bookings
         WHERE car_id = $1 AND id <> $2 AND status IN ('booked','active')
           AND NOT (to_dt <= $3::timestamptz OR from_dt >= $4::timestamptz)`,
        [booking.car_id, booking.id, booking.from_dt, updates.to_dt]
      );
      if (clash) {
        return res.status(400).json({ error: 'Автомобиль уже занят на эти даты — продление невозможно' });
      }
      // Пересчитываем сумму по тем же ступенчатым тарифам, что и при создании
      const car = await one(`SELECT * FROM cars WHERE id = $1`, [booking.car_id]);
      if (car) {
        const ms = new Date(updates.to_dt).getTime() - new Date(booking.from_dt).getTime();
        let days = Math.ceil(ms / (1000 * 60 * 60 * 24));
        if (days < 1) days = 1;
        const total = days * getDayPrice(car, days);
        params.push(total);
        setClauses.push(`total = $${params.length}`);
      }
      params.push(updates.to_dt);
      setClauses.push(`to_dt = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return res.json(booking);
    }

    params.push(booking.id);
    const { rows } = await q(
      `UPDATE bookings SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    res.json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad input', detail: e.errors });
    }
    if (e && e.code === '23P01') {
      return res.status(400).json({ error: 'Автомобиль уже занят на эти даты' });
    }
    next(e);
  }
});

export default router;
