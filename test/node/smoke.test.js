import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from './helpers.js';

describe('запуск приложения на чистой базе', () => {
  let app;
  beforeAll(async () => { app = await createApp(); }, 120000);
  afterAll(async () => { await app?.close(); });

  it('health отвечает не трогая базу', async () => {
    const r = await app.get('/api/health');
    expect(r.status).toBe(200);
    expect(r.json.ok).toBe(true);
    expect(r.json.runtime).toBe('workers');
  });

  it('первый запрос к данным поднимает схему с нуля', async () => {
    const r = await app.get('/api/cars');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.json.items)).toBe(true);
    // Сид засевает эталонный автопарк
    expect(r.json.items.length).toBeGreaterThan(0);
  });

  it('создались все таблицы проекта', async () => {
    const { rows } = await app.pg.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`
    );
    const names = rows.map((r) => r.tablename);
    for (const t of ['users', 'cars', 'bookings', 'consents', 'contact_requests',
                     'user_documents', 'chat_messages', 'audit_log', 'site_content']) {
      expect(names).toContain(t);
    }
  });

  it('неизвестный /api отдаёт JSON-404, а не HTML', async () => {
    const r = await app.get('/api/такого-нет');
    expect(r.status).toBe(404);
    expect(r.json).toEqual({ error: 'Not found' });
  });
});

describe('повторная инициализация не прогоняет схему заново', () => {
  it('второй холодный старт стоит один запрос, а не весь прогон', async () => {
    const app = await createApp();
    await app.get('/api/cars');                       // первый прогон: схема + сиды

    let queries = 0;
    const counting = async (text, params = []) => {
      queries++;
      return { rows: (await app.pg.query(text, params)).rows };
    };
    // Имитируем новый изолят: сбрасываем состояние init, оставляя ту же базу
    const { resetInit, configureDb } = await import('../../worker/db.js');
    resetInit();
    configureDb({ ...app.env, __dbDriver: counting }, counting);
    const { init } = await import('../../worker/db.js');
    await init();

    // Один SELECT отметки о версии — и всё
    expect(queries).toBeLessThanOrEqual(2);
    await app.close();
  }, 120000);
});
