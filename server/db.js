import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLEET } from '../src/data/fleet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.warn('[db] DATABASE_URL is not set');
}

// HTTP-based Neon client — works perfectly in serverless cold starts, no connections to manage
const sql = connectionString ? neon(connectionString) : null;

function assertSql() {
  if (!sql) throw new Error('Database is not configured: set DATABASE_URL');
}

// Lazy init: triggered by the first DB call, runs once per cold start.
// If it ever fails, the promise is reset so a later request can retry.
let initPromise = null;
export function init() {
  if (!sql) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      await ensureSchema();
      await seedIfEmpty();
      await seedAdmin();
    })().catch((e) => { initPromise = null; throw e; });
  }
  return initPromise;
}

// Helpers compatible with the rest of the code base.
// `sql.query(text, params)` returns an array of row objects directly.
export async function q(text, params = []) {
  assertSql();
  await init();
  const rows = await sql.query(text, params);
  return { rows };
}
export async function one(text, params = []) {
  assertSql();
  await init();
  const rows = await sql.query(text, params);
  return rows[0] || null;
}
export async function many(text, params = []) {
  assertSql();
  await init();
  const rows = await sql.query(text, params);
  return rows;
}

export async function ensureSchema() {
  const sqlText = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // Neon HTTP client doesn't support multi-statement queries — split & run each.
  const statements = sqlText
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
  for (const s of statements) {
    await sql.query(s);
  }
}

export async function seedIfEmpty() {
  const rows = await sql.query('SELECT COUNT(*)::int AS c FROM cars');
  if (rows[0]?.c > 0) return;
  for (const i of FLEET) {
    await sql.query(
      `INSERT INTO cars (id, name, brand, year, body, fuel, engine, power_hp, drive, price_per_day, badge, image_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published')`,
      [
        i.id,
        i.name,
        i.name.split(/[\s-]/)[0],
        i.year,
        i.body,
        i.fuel,
        i.engine,
        parseInt(i.power) || null,
        i.drive,
        i.price,
        i.badge || null,
        i.img,
      ]
    );
  }
  console.log(`[db] seeded ${FLEET.length} cars`);
}

export async function seedAdmin() {
  const exists = await one('SELECT id FROM users WHERE email = $1', ['admin@aurix.local']);
  if (exists) return;
  const hash = bcrypt.hashSync('admin123', 10);
  await sql.query(
    'INSERT INTO users (email, name, password_hash, role) VALUES ($1,$2,$3,$4)',
    ['admin@aurix.local', 'Администратор', hash, 'admin']
  );
  console.log('[db] seeded admin: admin@aurix.local / admin123');
}
