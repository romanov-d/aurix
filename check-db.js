import 'dotenv/config';
import pg from 'pg';

// Быстрая проверка связи сервера с БД. Запускать НА VPS: `node check-db.js`
// Показывает, доступна ли БД и за сколько отвечает простой запрос.
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('❌ DATABASE_URL не задан в окружении (.env / pm2 env).');
  process.exit(1);
}
try {
  console.log('Host:', new URL(url).hostname);
} catch {}

const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
  statement_timeout: 8000,
  query_timeout: 8000,
});

const t0 = Date.now();
try {
  const r = await pool.query('SELECT 1 AS ok');
  console.log(`✅ БД отвечает за ${Date.now() - t0} мс:`, r.rows[0]);
  const cars = await pool.query('SELECT count(*) FROM cars');
  console.log('   машин в таблице cars:', cars.rows[0].count);
} catch (e) {
  console.error(`❌ Запрос к БД упал за ${Date.now() - t0} мс:`, e.message);
  console.error('   → именно это и морозило сайт. Чините доступ сервера к БД.');
} finally {
  await pool.end();
}
