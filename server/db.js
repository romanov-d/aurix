import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLEET } from '../src/data/fleet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('[db] DATABASE_URL is not set — set it in .env.local for local dev or in Vercel env vars');
}

// Single global pool, reused across serverless invocations
export const pool = new pg.Pool({
  connectionString,
  ssl: connectionString && /sslmode=require|neon\.tech/.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
  max: 5,
});

export async function q(text, params = []) {
  const res = await pool.query(text, params);
  return res;
}

export async function one(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

export async function many(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows;
}

let initialized = false;
export async function init() {
  if (initialized) return;
  initialized = true;
  await ensureSchema();
  await seedIfEmpty();
  await seedAdmin();
}

export async function ensureSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

export async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM cars');
  if (rows[0].c > 0) return;
  for (const i of FLEET) {
    await pool.query(
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
  await pool.query(
    'INSERT INTO users (email, name, password_hash, role) VALUES ($1,$2,$3,$4)',
    ['admin@aurix.local', 'Администратор', hash, 'admin']
  );
  console.log('[db] seeded admin: admin@aurix.local / admin123');
}
