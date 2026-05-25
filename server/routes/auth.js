import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { one, q } from '../db.js';
import { signToken, COOKIE_NAME, COOKIE_OPTS, requireAuth } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  phone: z.string().min(5).max(30).optional(),
  password: z.string().min(6).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(u) {
  return {
    id: u.id, email: u.email, name: u.name, phone: u.phone,
    avatar_url: u.avatar_url, role: u.role, is_verified: u.is_verified ?? false, created_at: u.created_at,
  };
}

router.post('/register', async (req, res, next) => {
  try {
    let body;
    try { body = registerSchema.parse(req.body); }
    catch (e) { return res.status(400).json({ error: 'Bad input', detail: e.errors }); }

    const existing = await one('SELECT id FROM users WHERE email = $1', [body.email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email уже зарегистрирован' });

    const hash = bcrypt.hashSync(body.password, 10);
    const { rows } = await q(
      `INSERT INTO users (email, name, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,'user') RETURNING *`,
      [body.email.toLowerCase(), body.name, body.phone || null, hash]
    );
    const user = rows[0];
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS).json({ user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    let body;
    try { body = loginSchema.parse(req.body); }
    catch (e) { return res.status(400).json({ error: 'Bad input', detail: e.errors }); }

    const user = await one('SELECT * FROM users WHERE email = $1', [body.email.toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });
    if (!bcrypt.compareSync(body.password, user.password_hash))
      return res.status(401).json({ error: 'Неверный email или пароль' });

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS).json({ user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: undefined }).json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
