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

app.use(loadUser);
app.use('/api/cars', carsRouter);
app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);
app.use('/api/faq', faqRouter);
app.use('/api/blog', blogRouter);

// Неизвестные /api/* → JSON 404 (а не отдача index.html)
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Самохостинг (VPS / Node-хостинг): один процесс отдаёт собранный фронт ──
// На Vercel статику и роутинг раздаёт платформа, поэтому там пропускаем.
if (!process.env.VERCEL) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(__dirname, '../dist');
  app.use(express.static(distDir, { maxAge: '7d', index: false }));
  // SPA-fallback: всё, что не /api и не файл — отдаём index.html (React Router)
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[api error]', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

export default app;
