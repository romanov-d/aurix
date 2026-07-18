import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadUser, requireAuth } from './middleware/auth.js';
import carsRouter from './routes/cars.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import bookingsRouter from './routes/bookings.js';
import adminRouter from './routes/admin.js';
import contactRouter from './routes/contact.js';
import faqRouter from './routes/faq.js';
import blogRouter from './routes/blog.js';
import contentRouter from './routes/content.js';
import { clientRouter as chatRouter, adminRouter as chatAdminRouter } from './routes/chat.js';

export const app = express();
// За nginx: без trust proxy req.ip = 127.0.0.1 для всех, и rate limit по IP
// душил бы всех посетителей одним общим лимитом.
app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' })); // allows base64 avatar + document uploads (до ~2 МБ файлы)
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:5174'],
}));

// Health must answer without touching the DB so we can verify the function
// is alive even when Postgres is unreachable.
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ── Статика раздаётся ДО loadUser ──────────────────────────────────────────
// loadUser ходит в БД (по cookie). Если он стоит перед статикой, то у
// залогиненного пользователя даже /logo3.png и /cars/*.webp проходят через БД —
// и при зависшей БД лого/картинки не грузятся. Статике пользователь не нужен,
// поэтому отдаём файлы раньше, не трогая БД. (На Vercel статику раздаёт платформа.)
const distDir = process.env.VERCEL
  ? null
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (distDir) {
  app.use(express.static(distDir, {
    index: false,
    setHeaders(res, filePath) {
      // Хешированные чанки (/assets/*-<hash>.js|css): имя меняется при любом
      // изменении содержимого, поэтому кешируем навсегда как immutable —
      // хард-ресет не будет их бесполезно перезапрашивать.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Не-хешированные файлы (hero.png, logo3.png, *.svg) могут меняться при
        // том же имени — короткий кеш, чтобы обновления подхватывались.
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  }));
}

// ── Админ-панель / ЛК клиента (Metronic, base: '/admin/') ──
// Отдельный бандл в admin/dist. Статика раздаётся под /admin, SPA-fallback ниже.
const adminDistDir = process.env.VERCEL
  ? null
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../admin/dist');
if (adminDistDir) {
  app.use('/admin', express.static(adminDistDir, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  }));
}

app.use(loadUser);
app.use('/api/cars', carsRouter);
app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin/chat', chatAdminRouter); // ДО /api/admin, иначе перехватит общий роутер
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);
app.use('/api/faq', faqRouter);
app.use('/api/blog', blogRouter);
app.use('/api/content', contentRouter);

// Неизвестные /api/* → JSON 404 (а не отдача index.html)
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// SPA-fallback админки (ДО основного) — /admin/* → admin/dist/index.html.
if (adminDistDir) {
  app.get(/^\/admin(\/.*)?$/, (req, res) => {
    // Отсутствующий ассет админки — честный 404, не подменяем на HTML.
    if (req.path.startsWith('/admin/assets/')) return res.status(404).end();
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(adminDistDir, 'index.html'));
  });
}

// ── Самохостинг (VPS / Node-хостинг): SPA-fallback на index.html ──
// Сами файлы статики уже раздаются выше (до loadUser). Здесь — только отдача
// index.html для клиентских маршрутов React Router. На Vercel этим занимается платформа.
if (distDir) {
  app.get(/^(?!\/api\/).*/, (req, res) => {
    // Отсутствующий чанк/ассет НЕ подменяем на index.html — иначе браузер
    // получит HTML вместо JS и упадёт с «Importing a module script failed».
    // Хешированные ассеты живут в /assets — если файла нет, это честный 404.
    if (req.path.startsWith('/assets/')) return res.status(404).end();
    // index.html не кэшируем: он всегда должен ссылаться на актуальные чанки,
    // иначе после деплоя старый index.html тянет несуществующие хеши.
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[api error]', err);
  // В проде не светим внутренности (тексты ошибок Postgres и т.п.) — только в лог
  const message = process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : (err.message || 'Internal error');
  res.status(500).json({ error: message });
});

export default app;
