import pg from 'pg';
import bcrypt from 'bcryptjs';
import { FLEET } from '../src/data/fleet.js';

const { Pool } = pg;

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

// Стандартный драйвер pg (TCP) — работает и на VPS, и на Vercel.
// Neon требует SSL (sslmode=require в строке); rejectUnauthorized:false на случай цепочки сертификатов.
const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 10, connectionTimeoutMillis: 10000 })
  : null;

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
      console.log('[db] init: seedAdmin done, starting seedFaq...');
      await seedFaq();
      console.log('[db] init: seedFaq done, starting seedSettings...');
      await seedSettings();
      await seedBlog();
      console.log('[db] init: done (FK/backfill — в фоне)');
      // FK-каскад и бэкфилл — в фоне, НЕ в await-цепочке init. FK DDL под
      // конкуренцией может ждать блокировку и упереться в таймаут функции —
      // поэтому он не должен блокировать ответ. Не доедет — самовосстановится
      // на следующем холодном старте (проверка confupdtype).
      migrateForeignKeys().catch((e) => console.warn('[db] FK migration skipped:', e.message));
      backfillCashback().catch((e) => console.warn('[db] cashback backfill skipped:', e.message));
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
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_expires TIMESTAMPTZ`,
  // Подтверждение email (отдельно от СБ-верификации документов) + одноразовые коды (вход/рега)
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_code TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_code_expires TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_code_purpose TEXT`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS color TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_url TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS license_url TEXT`,
  `CREATE TABLE IF NOT EXISTS user_points (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount     INTEGER NOT NULL,
    reason     TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
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
  `CREATE TABLE IF NOT EXISTS faq (
    id         BIGSERIAL PRIMARY KEY,
    question   TEXT NOT NULL,
    answer     TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  // ── Порядок машин на сайте ──
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`,
  // ── Воронка / CRM по бронированиям ──
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new'`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS manager TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'site'`,
  // ── Доп. данные клиента ──
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_page_url TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_url TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_note TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS manager TEXT`,
  // ── Настройки приложения (кэшбэк % и пр.) ──
  `CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  // ── Блог ──
  `CREATE TABLE IF NOT EXISTS blog_posts (
    id         BIGSERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    excerpt    TEXT,
    content    TEXT,
    category   TEXT,
    image_url  TEXT,
    read_time  TEXT,
    published  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`
];

// Перевод FK на cars(id) в ON UPDATE CASCADE (чтобы можно было менять ID машины).
// ВАЖНО: это тяжёлый DDL (AccessExclusiveLock). Делаем строго один раз —
// иначе на каждом холодном старте параллельные инстансы устроят гонку блокировок.
const FK_CASCADE_STATEMENTS = [
  `ALTER TABLE bookings   DROP CONSTRAINT IF EXISTS bookings_car_id_fkey`,
  `ALTER TABLE bookings   ADD  CONSTRAINT bookings_car_id_fkey   FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE favorites  DROP CONSTRAINT IF EXISTS favorites_car_id_fkey`,
  `ALTER TABLE favorites  ADD  CONSTRAINT favorites_car_id_fkey  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE  ON UPDATE CASCADE`,
  `ALTER TABLE reviews    DROP CONSTRAINT IF EXISTS reviews_car_id_fkey`,
  `ALTER TABLE reviews    ADD  CONSTRAINT reviews_car_id_fkey    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE  ON UPDATE CASCADE`,
  `ALTER TABLE car_photos DROP CONSTRAINT IF EXISTS car_photos_car_id_fkey`,
  `ALTER TABLE car_photos ADD  CONSTRAINT car_photos_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE  ON UPDATE CASCADE`
];

// confupdtype = 'c' означает ON UPDATE CASCADE — значит миграция уже применена.
// Без advisory-локов (они утекают через пул-пулер Neon). При гонке один инстанс
// применит DDL, остальные либо упадут с короткой ошибкой (lock_timeout), либо
// увидят уже применённое состояние и выйдут. Ошибки не фатальны для init().
export async function migrateForeignKeys() {
  const done = await one(`SELECT confupdtype FROM pg_constraint WHERE conname = 'bookings_car_id_fkey'`);
  if (done && done.confupdtype === 'c') return; // уже применено

  // Только pool.query() (HTTP, без сессий). Ставим короткий lock_timeout
  // на сессию-уровне нельзя — поэтому каждый ALTER оборачиваем и не валим init.
  for (const stmt of FK_CASCADE_STATEMENTS) {
    await pool.query(stmt);
  }
  console.log('[db] FK ON UPDATE CASCADE applied');
}

export async function ensureSchema() {
  // ВНИМАНИЕ: только pool.query() (HTTP). pool.connect()/сессии в драйвере
  // @neondatabase/serverless требуют WebSocket и зависают в этом рантайме.
  console.log('[db] ensureSchema: running', SCHEMA_STATEMENTS.length, 'statements');
  for (let i = 0; i < SCHEMA_STATEMENTS.length; i++) {
    await pool.query(SCHEMA_STATEMENTS[i]);
  }
}

export async function seedIfEmpty() {
  for (let idx = 0; idx < FLEET.length; idx++) {
    const i = FLEET[idx];
    await pool.query(
      `INSERT INTO cars (
         id, name, brand, year, body, fuel, engine, power_hp, drive,
         price_per_day, badge, image_url, status,
         deposit, mileage_limit, overmileage_rate, photo_rate, price_6_12, price_30, color, description, sort_order
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published',$13,$14,$15,$16,$17,$18,$19,$20,$21)
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
         price_30        = EXCLUDED.price_30,
         color           = EXCLUDED.color,
         description     = EXCLUDED.description,
         sort_order      = COALESCE(NULLIF(cars.sort_order, 0), EXCLUDED.sort_order)`,
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
        i.color || null,
        i.description || null,
        (idx + 1) * 10,
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

export async function seedFaq() {
  const result = await pool.query('SELECT COUNT(*) as count FROM faq');
  const count = parseInt(result.rows[0].count);
  if (count > 0) return;

  const items = [
    ['Можно ли арендовать авто в аэропорту даже поздно ночью?', 'Конечно. AURIX осуществляет круглосуточную доставку, включая аэропорты Москвы. Просто сообщите номер рейса и время прибытия — автомобиль будет ждать вас, без задержек и ожиданий.', 10],
    ['Может ли управлять автомобилем кто-то ещё, например, друг или член семьи?', 'Да, при оформлении договора можно указать дополнительного водителя. У него должны быть права с необходимым стажем и подходящий возраст.', 20],
    ['Какие документы нужны для аренды авто в Москве?', 'Паспорт, водительское удостоверение со стажем от 3 лет и банковская карта на имя арендатора. Для некоторых классов авто требуется дополнительный документ.', 30],
    ['Можно ли арендовать без банковской карты?', 'В большинстве случаев нужна именная банковская карта для авторизации залога. Возможна оплата наличными после подтверждения личности.', 40],
    ['Что входит в договор аренды?', 'Договор включает полную страховку КАСКО и ОСАГО, базовый километраж, техподдержку 24/7 и круглосуточную помощь на дороге.', 50],
    ['Как работают платные дороги и проезды?', 'Все платные участки автоматически фиксируются и оплачиваются через ваш договор. Подробный отчёт приходит на email после возврата авто.', 60],
  ];

  for (const [qText, aText, order] of items) {
    await pool.query('INSERT INTO faq (question, answer, sort_order) VALUES ($1, $2, $3)', [qText, aText, order]);
  }
  console.log('[db] seeded faq items');
}

// Дефолтные настройки приложения (кэшбэк %)
export async function seedSettings() {
  await pool.query(
    `INSERT INTO app_settings (key, value) VALUES ('cashback_percent', '5')
     ON CONFLICT (key) DO NOTHING`
  );
}

// Стартовые статьи блога (только если блог пуст)
export async function seedBlog() {
  const result = await pool.query('SELECT COUNT(*) AS count FROM blog_posts');
  if (parseInt(result.rows[0].count) > 0) return;

  const posts = [
    ['Топ-5 суперкаров для идеального летнего сезона в Москве',
     'Рассказываем о лучших кабриолетах и спортивных купе из нашего автопарка, которые раскроют всю красоту летних дорог столицы.',
     'Лето в Москве — идеальное время, чтобы пересесть за руль суперкара. Мы собрали пять моделей из автопарка AURIX MOTORS, которые превратят каждую поездку в событие.\n\nОткрытый верх, мощный мотор и безупречный стиль — всё, что нужно для незабываемого сезона. Бронируйте заранее: летом спрос на кабриолеты максимальный.',
     'Обзоры', 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80', '5 мин'],
    ['Как правильно ухаживать за матовым кузовом автомобиля',
     'Особенности детейлинга, правила мойки и защиты матовых плёнок и лакокрасочного покрытия эксклюзивных моделей.',
     'Матовый кузов требует особого подхода. Никакой полировки и абразивных средств — только специализированные шампуни с нейтральным pH.\n\nМойка — вручную, мягкой микрофиброй, без круговых движений. Регулярная защита плёнки сохранит глубину матового эффекта на годы.',
     'Лайфхаки', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80', '4 мин'],
    ['Культура суперкаров: почему аренда меняет представление о владении',
     'Анализируем экономику и эмоции: почему шеринг и долгосрочная аренда спорткаров становятся популярнее классической покупки.',
     'Владение суперкаром — это не только удовольствие, но и расходы: страховка, обслуживание, потеря в цене. Аренда снимает эти заботы.\n\nВы платите только за время за рулём и можете менять модель под настроение. Именно поэтому всё больше ценителей выбирают аренду вместо покупки.',
     'Тренды', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80', '7 мин'],
    ['Особенности управления мощным заднеприводным спорткаром',
     'Базовые советы по безопасности, работа с системами стабилизации и как получить максимум удовольствия без риска.',
     'Задний привод и сотни лошадиных сил требуют уважения. Плавный газ, прогретые шины и включённые системы стабилизации — основа безопасной езды.\n\nНачинайте спокойно, чувствуйте автомобиль и не выключайте электронных помощников на дороге общего пользования.',
     'Школа вождения', 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80', '6 мин'],
  ];

  for (const [title, excerpt, content, category, image, readTime] of posts) {
    await pool.query(
      `INSERT INTO blog_posts (title, excerpt, content, category, image_url, read_time)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [title, excerpt, content, category, image, readTime]
    );
  }
  console.log('[db] seeded blog posts');
}

// Получить числовой % кэшбэка из настроек (по умолчанию 5)
export async function getCashbackPercent() {
  const row = await one(`SELECT value FROM app_settings WHERE key = 'cashback_percent'`);
  const n = parseFloat(row?.value);
  return Number.isFinite(n) ? n : 5;
}

// Начислить кэшбэк за завершённые брони, по которым он ещё не начислялся.
// Закрывает кейс «в кабинете есть завершённая бронь, но бонусы не начислены».
export async function backfillCashback() {
  const pct = await getCashbackPercent();
  const missing = await many(
    `SELECT b.id, b.user_id, b.total
     FROM bookings b
     WHERE b.status = 'completed'
       AND NOT EXISTS (
         SELECT 1 FROM user_points p
         WHERE p.user_id = b.user_id AND p.reason LIKE '%аренды #' || b.id
       )`
  );
  for (const b of missing) {
    const cashback = Math.round(Number(b.total) * pct / 100);
    if (cashback <= 0) continue;
    await pool.query(`UPDATE users SET points = COALESCE(points,0) + $1 WHERE id = $2`, [cashback, b.user_id]);
    await pool.query(
      `INSERT INTO user_points (user_id, amount, reason) VALUES ($1, $2, $3)`,
      [b.user_id, cashback, `Кэшбэк ${pct}% за завершение аренды #${b.id}`]
    );
  }
  if (missing.length) console.log(`[db] backfilled cashback for ${missing.length} bookings`);
}
