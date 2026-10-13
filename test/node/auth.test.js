import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp, sessionCookie, ADMIN_PASSWORD } from './helpers.js';

describe('регистрация, вход и сессия', () => {
  let app;
  beforeAll(async () => {
    app = await createApp();
    await app.get('/api/cars'); // поднимаем схему до тестов
  }, 120000);
  afterAll(async () => { await app?.close(); });
  beforeEach(() => app.resetLimits());

  const newUser = (over = {}) => ({
    email: `u${Math.random().toString(36).slice(2, 8)}@example.com`,
    name: 'Тестовый Клиент',
    phone: '+79001112233',
    password: 'secret123',
    consent: true,
    cross_border_consent: true,
    ...over,
  });

  it('без согласия на обработку данных не регистрирует', async () => {
    const r = await app.post('/api/auth/register', newUser({ consent: undefined }));
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.json)).toContain('consent');
  });

  it('без согласия на трансграничную передачу не регистрирует', async () => {
    const r = await app.post('/api/auth/register', newUser({ cross_border_consent: undefined }));
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.json)).toContain('cross_border_consent');
  });

  it('регистрирует и записывает согласия с версией документа', async () => {
    const body = newUser({ marketing_consent: true });
    const r = await app.post('/api/auth/register', body);
    expect(r.status).toBe(200);
    expect(r.json.user.email).toBe(body.email);

    const { rows } = await app.pg.query(
      `SELECT kind, doc_version, source FROM consents WHERE subject = $1 ORDER BY kind`, [body.email]
    );
    expect(rows.map((x) => x.kind).sort()).toEqual(['cross_border', 'marketing', 'pdn']);
    expect(rows.every((x) => x.doc_version && x.source === 'register')).toBe(true);
  });

  it('не отдаёт наружу хеш пароля', async () => {
    const r = await app.post('/api/auth/register', newUser());
    expect(r.text).not.toContain('password_hash');
    expect(r.json.user.password_hash).toBeUndefined();
  });

  it('не регистрирует второй раз на тот же email', async () => {
    const body = newUser();
    expect((await app.post('/api/auth/register', body)).status).toBe(200);
    const again = await app.post('/api/auth/register', body);
    expect(again.status).toBe(409);
  });

  it('вход выдаёт httpOnly-куку, по ней работает /auth/me', async () => {
    const r = await app.post('/api/auth/login', { email: 'admin@aurix.local', password: ADMIN_PASSWORD });
    expect(r.status).toBe(200);
    const setCookie = r.headers.get('set-cookie') || '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');

    const me = await app.get('/api/auth/me', { cookie: sessionCookie(r) });
    expect(me.status).toBe(200);
    expect(me.json.user.role).toBe('admin');
  });

  it('неверный пароль не пускает', async () => {
    const r = await app.post('/api/auth/login', { email: 'admin@aurix.local', password: 'wrong-password' });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  it('подделанный токен не принимается', async () => {
    const r = await app.get('/api/auth/me', { cookie: 'aurix_token=eyJhbGciOiJIUzI1NiJ9.forged.signature' });
    // Гость — значит токен отвергнут, а не принят как валидный
    expect(r.json?.user == null || r.status === 401).toBe(true);
  });

  it('без куки профиль не отдаётся', async () => {
    const r = await app.get('/api/me');
    expect(r.status).toBe(401);
  });

  it('выход чистит куку', async () => {
    const login = await app.post('/api/auth/login', { email: 'admin@aurix.local', password: ADMIN_PASSWORD });
    const out = await app.post('/api/auth/logout', {}, { cookie: sessionCookie(login) });
    expect(out.status).toBe(200);
    expect(out.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
