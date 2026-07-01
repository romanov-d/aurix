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
import { clientRouter as chatRouter, adminRouter as chatAdminRouter } from './routes/chat.js';

export const app = express();
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
  app.use(express.static(distDir, { maxAge: '7d', index: false }));
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

// Неизвестные /api/* → JSON 404 (а не отдача index.html)
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

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
  res.status(500).json({ error: err.message || 'Internal error' });
});

export default app;
