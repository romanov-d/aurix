import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp, sessionCookie, ADMIN_PASSWORD } from './helpers.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('заявки с сайта', () => {
  let app;
  beforeAll(async () => { app = await createApp(); await app.get('/api/cars'); }, 120000);
  afterAll(async () => { await app?.close(); });
  beforeEach(() => app.resetLimits());

  it('без согласия заявку не принимает', async () => {
    const r = await app.post('/api/contact', { name: 'Пётр', phone: '+79001112233' });
    expect(r.status).toBe(400);
  });

  it('сохраняет заявку в базу и пишет согласие', async () => {
    const r = await app.post('/api/contact',
      { name: 'Виктор', phone: '+79166815938', car: 'Urus', message: '29-30', consent: true });
    expect(r.status).toBe(200);
    const { rows } = await app.pg.query(`SELECT name, phone, status FROM contact_requests ORDER BY id DESC LIMIT 1`);
    expect(rows[0]).toMatchObject({ name: 'Виктор', phone: '+79166815938', status: 'new' });
    const c = await app.pg.query(`SELECT kind, source FROM consents WHERE subject = '+79166815938'`);
    expect(c.rows[0]).toMatchObject({ kind: 'pdn', source: 'contact_form' });
  });

  it('длинные поля отсекаются валидацией', async () => {
    const r = await app.post('/api/contact',
      { name: 'x'.repeat(500), phone: '+79001112233', consent: true });
    expect(r.status).toBe(400);
  });
});

describe('документы клиента', () => {
  let app, cookie;
  beforeAll(async () => {
    app = await createApp();
    await app.get('/api/cars');
    const login = await app.post('/api/auth/login', { email: 'admin@aurix.local', password: ADMIN_PASSWORD });
    cookie = sessionCookie(login);
  }, 120000);
  afterAll(async () => { await app?.close(); });
  beforeEach(() => app.resetLimits());

  it('без авторизации не принимает', async () => {
    const r = await app.post('/api/me/documents', { kind: 'passport', data: PNG, docs_consent: true });
    expect(r.status).toBe(401);
  });

  it('без отдельного согласия не принимает', async () => {
    const r = await app.post('/api/me/documents', { kind: 'passport', data: PNG }, { cookie });
    expect(r.status).toBe(400);
    expect(r.json.code).toBe('DOCS_CONSENT_REQUIRED');
  });

  it('неизвестный вид документа отклоняет', async () => {
    const r = await app.post('/api/me/documents', { kind: 'справка', data: PNG, docs_consent: true }, { cookie });
    expect(r.status).toBe(400);
  });

  it('исполняемый файл вместо скана отклоняет', async () => {
    const r = await app.post('/api/me/documents',
      { kind: 'passport', data: 'data:application/x-sh;base64,cm0gLXJmIC8=', docs_consent: true }, { cookie });
    expect(r.status).toBe(400);
    expect(r.json.error).toMatch(/JPEG|PNG/);
  });

  it('сохраняет документ в хранилище, а в базе только метаданные', async () => {
    const r = await app.post('/api/me/documents', { kind: 'passport', data: PNG, docs_consent: true }, { cookie });
    expect(r.status).toBe(201);

    const { rows } = await app.pg.query(`SELECT kind, mime, bytes, filename FROM user_documents WHERE kind = 'passport'`);
    expect(rows[0].mime).toBe('image/png');
    expect(rows[0].filename).toMatch(/\.enc$/);
    // В базе лежит только ссылка на файл, самого содержимого там нет
    expect(JSON.stringify(rows[0])).not.toContain('iVBORw0');

    // Файл в хранилище зашифрован
    const stored = app.env.DOCS.__files.get(rows[0].filename);
    expect(new TextDecoder().decode(stored)).not.toContain('PNG');

    const consent = await app.pg.query(`SELECT kind FROM consents WHERE kind = 'docs'`);
    expect(consent.rows.length).toBeGreaterThan(0);
  });

  it('владелец читает свой документ, профиль отдаёт только флаги', async () => {
    const got = await app.get('/api/me/documents/passport', { cookie });
    expect(got.status).toBe(200);
    expect(got.headers.get('cache-control')).toContain('no-store');

    const me = await app.get('/api/auth/me', { cookie });
    expect(me.json.user.documents.passport).toBe(true);
    // Base64 сканов в профиле быть не должно
    expect(me.text).not.toContain('iVBORw0');
    expect(me.text).not.toContain('passport_url');
  });

  it('чужой документ не отдаётся', async () => {
    const other = await app.post('/api/auth/register', {
      email: `o${Math.random().toString(36).slice(2, 7)}@example.com`, name: 'Чужой',
      phone: '+79005550202', password: 'secret123', consent: true, cross_border_consent: true,
    });
    const r = await app.get('/api/me/documents/passport', { cookie: sessionCookie(other) });
    expect(r.status).toBe(404);
  });
});

describe('права доступа в админке', () => {
  let app, adminCookie, userCookie;
  beforeAll(async () => {
    app = await createApp();
    await app.get('/api/cars');
    adminCookie = sessionCookie(await app.post('/api/auth/login',
      { email: 'admin@aurix.local', password: ADMIN_PASSWORD }));
    userCookie = sessionCookie(await app.post('/api/auth/register', {
      email: `c${Math.random().toString(36).slice(2, 7)}@example.com`, name: 'Клиент',
      phone: '+79005550303', password: 'secret123', consent: true, cross_border_consent: true,
    }));
  }, 120000);
  afterAll(async () => { await app?.close(); });
  beforeEach(() => app.resetLimits());

  it('аноним в админку не попадает', async () => {
    expect((await app.get('/api/admin/users')).status).toBe(401);
    expect((await app.get('/api/admin/contact-requests')).status).toBe(401);
  });

  it('обычный клиент в админку не попадает', async () => {
    expect((await app.get('/api/admin/users', { cookie: userCookie })).status).toBe(403);
    expect((await app.get('/api/admin/bookings', { cookie: userCookie })).status).toBe(403);
  });

  it('админ получает списки', async () => {
    const users = await app.get('/api/admin/users', { cookie: adminCookie });
    expect(users.status).toBe(200);
    expect(Array.isArray(users.json)).toBe(true);
    // Сканы документов в списке клиентов не выгружаются — только перечень видов
    expect(users.text).not.toContain('passport_url');
    expect(users.json[0]).toHaveProperty('doc_kinds');
  });

  it('заявки видны админу и меняют статус с записью в журнал', async () => {
    await app.post('/api/contact', { name: 'Мария', phone: '+79031112233', consent: true });
    const list = await app.get('/api/admin/contact-requests', { cookie: adminCookie });
    expect(list.status).toBe(200);
    const id = list.json[0].id;

    const bad = await app.patch(`/api/admin/contact-requests/${id}`, { status: 'чепуха' }, { cookie: adminCookie });
    expect(bad.status).toBe(400);

    const ok = await app.patch(`/api/admin/contact-requests/${id}`,
      { status: 'in_progress', notes: 'перезвонил' }, { cookie: adminCookie });
    expect(ok.status).toBe(200);
    expect(ok.json.status).toBe('in_progress');

    const audit = await app.pg.query(`SELECT entity_type, action FROM audit_log ORDER BY id DESC LIMIT 1`);
    expect(audit.rows[0]).toMatchObject({ entity_type: 'contact_request', action: 'update' });
  });

  it('удаление несуществующей заявки — 404, а не «успешно»', async () => {
    const r = await app.del('/api/admin/contact-requests/999999', { cookie: adminCookie });
    expect(r.status).toBe(404);
  });
});
