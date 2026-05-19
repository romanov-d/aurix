-- AURIX schema (PostgreSQL / Neon)

CREATE TABLE IF NOT EXISTS users (
  id           BIGSERIAL PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  phone        TEXT,
  name         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url   TEXT,
  role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','partner','admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cars (
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
);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);

CREATE TABLE IF NOT EXISTS bookings (
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
);
CREATE INDEX IF NOT EXISTS idx_bookings_car ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id     TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, car_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id         BIGSERIAL PRIMARY KEY,
  car_id     TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
