// Общая обвязка интеграционных тестов.
//
// База — PGlite: настоящий Postgres, собранный в WASM. Это принципиально:
// тесты выполняют ТОТ ЖЕ SQL, что и прод, вместе со схемой, констрейнтами и
// сидами. Заглушек вместо базы нет.
//
// R2 подменён на простую карту в памяти — поведение настоящего R2 проверяется
// отдельно, в наборе worker, где биндинг реальный.

import { PGlite } from '@electric-sql/pglite';
// btree_gist нужен для EXCLUDE-констрейнта, который на уровне БД не даёт
// создать две пересекающиеся брони. Без расширения эта защита в тестах
// просто не существовала бы, и гонку мы бы не проверили.
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import app from '../../worker/index.js';
import { resetInit } from '../../worker/db.js';
import { __resetRateLimit } from '../../worker/middleware/rateLimit.js';

export const ADMIN_PASSWORD = 'test-admin-password';

function memoryBucket() {
  const files = new Map();
  return {
    async put(key, value) { files.set(key, new Uint8Array(value)); },
    async get(key) {
      if (!files.has(key)) return null;
      const data = files.get(key);
      return { arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) };
    },
    async delete(key) { files.delete(key); },
    __files: files,
  };
}

const KEY_32 = Buffer.from('aurix-test-key-32-bytes-exactly!').toString('base64');

// Поднимает чистую базу и окружение для одного теста.
export async function createApp() {
  const pg = new PGlite({ extensions: { btree_gist } });
  const driver = async (text, params = []) => {
    const r = await pg.query(text, params);
    return { rows: r.rows };
  };
  const env = {
    __dbDriver: driver,
    DATABASE_URL: 'pglite://memory',
    JWT_SECRET: 'test-secret-not-for-production',
    NODE_ENV: 'test',
    ADMIN_SEED_PASSWORD: ADMIN_PASSWORD,
    SITE_URL: 'https://test.local',
    DOCS: memoryBucket(),
    DOCS_ENCRYPTION_KEY: KEY_32,
  };
  resetInit();
  __resetRateLimit();

  const call = async (method, path, { body, cookie, headers = {} } = {}) => {
    const init = { method, headers: { ...headers } };
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    if (cookie) init.headers.Cookie = cookie;
    const res = await app.fetch(new Request('https://test.local' + path, init), env);
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* не JSON — оставляем текст */ }
    return { status: res.status, json, text, headers: res.headers, raw: res };
  };

  return {
    env, pg, call,
    // Лимитер общий на процесс: между сценариями сбрасываем, иначе
    // соседние тесты упираются в 429 друг из-за друга
    resetLimits: __resetRateLimit,
    get: (p, o) => call('GET', p, o),
    post: (p, body, o) => call('POST', p, { ...o, body }),
    patch: (p, body, o) => call('PATCH', p, { ...o, body }),
    del: (p, o) => call('DELETE', p, o),
    close: () => pg.close(),
  };
}

// Достаёт cookie сессии из ответа логина/регистрации
export function sessionCookie(res) {
  const raw = res.headers.get('set-cookie') || '';
  const m = /aurix_token=([^;]+)/.exec(raw);
  return m ? `aurix_token=${m[1]}` : null;
}
