import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { FLEET } from '../src/data/fleet.js';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.warn('[db] DATABASE_URL is not set');
}

// Log host to verify if it's neon.tech
if (connectionString) {
  try {
    const u = new URL(connectionString);
    console.log('[db] host:', u.hostname);
  } catch(e){}
}

// Use Pool instead of HTTP neon() to avoid timeout issues
const pool = connectionString ? new Pool({ connectionString }) : null;

function assertSql() {
  if (!pool) throw new Error('Database is not configured: set DATABASE_URL');
}

// Lazy init: triggered by the first DB call, runs once per cold start.
// If it ever fails, the promise is reset so a later request can retry.
let initPromise = null;
export function init() {
  if (!pool) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      console.log('[db] init: starting schema...');
      await ensureSchema();
      console.log('[db] init: schema done, starting seedIfEmpty...');
      await seedIfEmpty();
      console.log('[db] init: seedIfEmpty done, starting seedAdmin...');
      await seedAdmin();
      console.log('[db] init: done');
    })().catch((e) => {
      console.error('[db] init failed:', e);
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

// Helpers compatible with the rest of the code base.
// `sql(text, params)` returns an array of row objects directly.
export async function q(text, params = []) {
  assertSql();
  await init();
  const result = await pool.query(text, params);
  return { rows: result.rows };
}
export async function one(text, params = []) {
  assertSql();
  await init();
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}
export async function many(text, params = []) {
  assertSql();
  await init();
  const result = await pool.query(text, params);
  return result.rows;
}

// ─── Schema (inlined so it works in Vercel serverless without fs) ────────────
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id           BIGSERIAL PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    phone        TEXT,
    name         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url   TEXT,
    role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','partner','admin')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS cars (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    brand         TEXT,
    year          INTEGER NOT NULL,
    body          TEXT,
    fuel          TEXT,
    engine        TEXT,
    power_hp      INTEGER,
    drive         TEXT,
    price_per_day INTEGER NOT NULL,
    badge         TEXT,
    image_url     TEXT,
    description   TEXT,
    status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','pending','rejected')),
    owner_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status)`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS deposit INTEGER DEFAULT 0`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS mileage_limit INTEGER DEFAULT 250`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS overmileage_rate INTEGER DEFAULT 200`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS photo_rate INTEGER DEFAULT 0`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS price_6_12 INTEGER`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS price_30 INTEGER`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id           BIGSERIAL PRIMARY KEY,
    car_id       TEXT NOT NULL REFERENCES cars(id) ON DELETE RESTRICT,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_dt      TIMESTAMPTZ NOT NULL,
    to_dt        TIMESTAMPTZ NOT NULL,
    pickup_city  TEXT,
    return_city  TEXT,
    with_driver  BOOLEAN NOT NULL DEFAULT FALSE,
    total        INTEGER NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','cancelled')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS with_delivery BOOLEAN NOT NULL DEFAULT FALSE`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_car ON bookings(car_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)`,
  `CREATE TABLE IF NOT EXISTS favorites (
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    car_id     TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, car_id)
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id         BIGSERIAL PRIMARY KEY,
    car_id     TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS car_photos (
    id         BIGSERIAL PRIMARY KEY,
    car_id     TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_car_photos_car ON car_photos(car_id)`,
];

export async function ensureSchema() {
  console.log('[db] ensureSchema: running', SCHEMA_STATEMENTS.length, 'statements');
  for (let i = 0; i < SCHEMA_STATEMENTS.length; i++) {
    console.log(`[db] ensureSchema: running stmt ${i}...`);
    await pool.query(SCHEMA_STATEMENTS[i]);
    console.log(`[db] ensureSchema: stmt ${i} done`);
  }
}

export async function seedIfEmpty() {
  for (const i of FLEET) {
    await pool.query(
      `INSERT INTO cars (
         id, name, brand, year, body, fuel, engine, power_hp, drive,
         price_per_day, badge, image_url, status,
         deposit, mileage_limit, overmileage_rate, photo_rate, price_6_12, price_30
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published',$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         name            = EXCLUDED.name,
         brand           = EXCLUDED.brand,
         year            = EXCLUDED.year,
         body            = EXCLUDED.body,
         fuel            = EXCLUDED.fuel,
         engine          = EXCLUDED.engine,
         power_hp        = EXCLUDED.power_hp,
         drive           = EXCLUDED.drive,
         price_per_day   = EXCLUDED.price_per_day,
         badge           = EXCLUDED.badge,
         image_url       = EXCLUDED.image_url,
         deposit         = EXCLUDED.deposit,
         mileage_limit   = EXCLUDED.mileage_limit,
         overmileage_rate= EXCLUDED.overmileage_rate,
         photo_rate      = EXCLUDED.photo_rate,
         price_6_12      = EXCLUDED.price_6_12,
         price_30        = EXCLUDED.price_30`,
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
        i.deposit,
        i.mileage_limit,
        i.overmileage_rate,
        i.photo_rate,
        i.price_6_12 ?? null,
        i.price_30 ?? null,
      ]
    );
  }
  console.log(`[db] upserted ${FLEET.length} cars`);
}

export async function seedAdmin() {
  const result = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@aurix.local']);
  if (result.rows.length > 0) return;
  const hash = bcrypt.hashSync('admin123', 10);
  await pool.query(
    'INSERT INTO users (email, name, password_hash, role) VALUES ($1,$2,$3,$4)',
    ['admin@aurix.local', 'Администратор', hash, 'admin']
  );
  console.log('[db] seeded admin: admin@aurix.local / admin123');
}
