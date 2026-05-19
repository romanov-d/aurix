import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { init } from './db.js';
import { loadUser, requireAuth } from './middleware/auth.js';
import carsRouter from './routes/cars.js';
import authRouter from './routes/auth.js';

// Lazy init: runs once per cold start
let initPromise;
function ensureInit() {
  if (!initPromise) initPromise = init().catch((e) => { initPromise = null; throw e; });
  return initPromise;
}

export const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:5174'],
}));

// Run DB init before every request (idempotent — guarded by `initialized` flag in db.js)
app.use(async (_req, _res, next) => {
  try { await ensureInit(); next(); } catch (e) { next(e); }
});

app.use(loadUser);

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/cars', carsRouter);
app.use('/api/auth', authRouter);
app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.use((err, _req, res, _next) => {
  console.error('[api error]', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

export default app;
