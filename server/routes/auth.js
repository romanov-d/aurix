import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { one, q } from '../db.js';
import { signToken, COOKIE_NAME, COOKIE_OPTS, requireAuth } from '../middleware/auth.js';
import { sendVerificationEmail } from '../email.js';

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
    avatar_url: u.avatar_url, role: u.role,
    is_verified: u.is_verified ?? false,
    created_at: u.created_at,
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
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const { rows } = await q(
      `INSERT INTO users (email, name, phone, password_hash, role, verify_token, verify_expires)
       VALUES ($1,$2,$3,$4,'user',$5,$6) RETURNING *`,
      [body.email.toLowerCase(), body.name, body.phone || null, hash, verifyToken, verifyExpires]
    );
    const user = rows[0];

    // Отправляем письмо (не блокируем регистрацию если не получается)
    sendVerificationEmail(user.email, verifyToken).catch(console.error);

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS).json({
      user: publicUser(user),
      verificationSent: true,
    });
  } catch (e) { next(e); }
});

// GET /api/auth/verify?token=xxx
router.get('/verify', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token missing' });

    const user = await one(
      `SELECT * FROM users WHERE verify_token = $1 AND verify_expires > NOW()`,
      [token]
    );
    if (!user) return res.status(400).json({ error: 'Ссылка недействительна или истекла' });

    await q(
      `UPDATE users SET is_verified = true, verify_token = NULL, verify_expires = NULL WHERE id = $1`,
      [user.id]
    );

    res.json({ ok: true, email: user.email });
  } catch (e) { next(e); }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', requireAuth, async (req, res, next) => {
  try {
    const user = await one('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (user.is_verified) return res.status(400).json({ error: 'Email уже подтверждён' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await q(
      `UPDATE users SET verify_token = $1, verify_expires = $2 WHERE id = $3`,
      [verifyToken, verifyExpires, user.id]
    );

    await sendVerificationEmail(user.email, verifyToken);
    res.json({ ok: true });
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
