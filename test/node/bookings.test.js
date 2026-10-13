import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp, sessionCookie, ADMIN_PASSWORD } from './helpers.js';

describe('бронирование', () => {
  let app, cookie, carId, photoCarId;

  beforeAll(async () => {
    app = await createApp();
    const cars = (await app.get('/api/cars')).json.items;
    carId = cars[0].id;
    photoCarId = (cars.find((c) => (c.photo_rate || 0) > 0) || cars[0]).id;
    const login = await app.post('/api/auth/login', { email: 'admin@aurix.local', password: ADMIN_PASSWORD });
    cookie = sessionCookie(login);
  }, 120000);
  afterAll(async () => { await app?.close(); });
  beforeEach(() => app.resetLimits());

  const day = (offset) => {
    const d = new Date(Date.now() + offset * 86400000);
    d.setUTCHours(12, 0, 0, 0);
    return d.toISOString();
  };

  it('без согласия бронь не создаётся', async () => {
    const r = await app.post('/api/bookings',
      { car_id: carId, from_dt: day(10), to_dt: day(12) }, { cookie });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.json)).toContain('consent');
  });

  it('без авторизации бронь не создаётся', async () => {
    const r = await app.post('/api/bookings',
      { car_id: carId, from_dt: day(10), to_dt: day(12), consent: true });
    expect(r.status).toBe(401);
  });

  it('создаёт бронь и считает цену на сервере', async () => {
    const r = await app.post('/api/bookings',
      { car_id: carId, from_dt: day(20), to_dt: day(23), consent: true }, { cookie });
    expect(r.status).toBe(201);
    expect(r.json.total).toBeGreaterThan(0);
    expect(r.json.kind).toBe('rent');
    // Цену клиент не диктует: она берётся из тарифа машины
    const car = (await app.get(`/api/cars/${carId}`)).json;
    expect(r.json.total).toBe(car.price_per_day * 3);
  });

  it('цену из тела запроса игнорирует', async () => {
    const r = await app.post('/api/bookings',
      { car_id: carId, from_dt: day(40), to_dt: day(42), consent: true, total: 1 }, { cookie });
    expect(r.status).toBe(201);
    expect(r.json.total).not.toBe(1);
  });

  it('дата возврата раньше получения отклоняется', async () => {
    const r = await app.post('/api/bookings',
      { car_id: carId, from_dt: day(30), to_dt: day(28), consent: true }, { cookie });
    expect(r.status).toBe(400);
  });

  it('несуществующая машина отклоняется', async () => {
    const r = await app.post('/api/bookings',
      { car_id: 'нет-такой-машины', from_dt: day(10), to_dt: day(12), consent: true }, { cookie });
    expect(r.status).toBe(404);
  });

  it('фотосессия считается почасово, подача бесплатна от 3 часов', async () => {
    const car = (await app.get(`/api/cars/${photoCarId}`)).json;
    const rate = car.photo_rate;
    const start = new Date(Date.now() + 60 * 86400000); start.setUTCHours(9, 0, 0, 0);
    const plus = (h) => new Date(start.getTime() + h * 3600000).toISOString();

    const twoHours = await app.post('/api/bookings', {
      car_id: photoCarId, kind: 'photo', consent: true,
      from_dt: start.toISOString(), to_dt: plus(2), with_delivery: true,
    }, { cookie });
    expect(twoHours.status).toBe(201);
    // 2 часа съёмки + 1 час подачи
    expect(twoHours.json.total).toBe(rate * 3);

    const start2 = new Date(Date.now() + 61 * 86400000); start2.setUTCHours(9, 0, 0, 0);
    const threeHours = await app.post('/api/bookings', {
      car_id: photoCarId, kind: 'photo', consent: true,
      from_dt: start2.toISOString(), to_dt: new Date(start2.getTime() + 3 * 3600000).toISOString(),
      with_delivery: true,
    }, { cookie });
    expect(threeHours.status).toBe(201);
    // От 3 часов подача бесплатная
    expect(threeHours.json.total).toBe(rate * 3);
  });

  it('база не даёт создать две пересекающиеся оплаченные брони', async () => {
    const from = day(100), to = day(103);
    const first = await app.post('/api/bookings',
      { car_id: carId, from_dt: from, to_dt: to, consent: true }, { cookie });
    expect(first.status).toBe(201);
    // Занятыми считаются оплаченные и выданные — переводим в booked
    await app.pg.query(`UPDATE bookings SET status = 'booked' WHERE id = $1`, [first.json.id]);

    const overlap = await app.post('/api/bookings',
      { car_id: carId, from_dt: day(101), to_dt: day(105), consent: true }, { cookie });
    expect(overlap.status).toBe(400);
    expect(JSON.stringify(overlap.json)).toMatch(/занят/i);

    // Прямая вставка в обход приложения тоже должна упереться в констрейнт
    await expect(app.pg.query(
      `INSERT INTO bookings (car_id, user_id, from_dt, to_dt, total, status)
       VALUES ($1, 1, $2, $3, 1, 'booked')`, [carId, day(101), day(104)]
    )).rejects.toThrow();
  });

  it('занятые даты видны в /busy вместе с видом брони', async () => {
    const r = await app.get(`/api/cars/${carId}/busy`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.json.ranges)).toBe(true);
    if (r.json.ranges.length) expect(r.json.ranges[0]).toHaveProperty('kind');
  });
});
