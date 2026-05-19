import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { loadUser, requireAuth } from './middleware/auth.js';
import carsRouter from './routes/cars.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import bookingsRouter from './routes/bookings.js';
import adminRouter from './routes/admin.js';

export const app = express();
app.use(express.json({ limit: '1mb' }));
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

app.use((err, _req, res, _next) => {
  console.error('[api error]', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

export default app;
