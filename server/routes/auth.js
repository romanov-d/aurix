import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { one, q } from '../db.js';
import { signToken, COOKIE_NAME, COOKIE_OPTS, requireAuth } from '../middleware/auth.js';
import { sendCodeEmail, resendConfigured } from '../email.js';
import { pushToSalebot } from '../salebot.js';

const router = Router();

const SEED_ADMIN_EMAIL = 'admin@aurix.local'; // встроенный админ — без 2FA (почта не настоящая)
const CODE_TTL_MS = 10 * 60 * 1000;

const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

// Сохранить код у пользователя и отправить письмо. Возвращает true, если письмо ушло.
async function issueCode(userId, email, purpose) {
  const code = genCode();
  const expires = new Date(Date.now() + CODE_TTL_MS);
  await q(`UPDATE users SET auth_code=$1, auth_code_expires=$2, auth_code_purpose=$3 WHERE id=$4`,
    [code, expires, purpose, userId]);
  try { await sendCodeEmail(email, code, purpose); return true; }
  catch (e) { console.error('[auth] не удалось отправить код:', e.message); return false; }
}

function checkCode(user, code, purpose) {
  return user.auth_code && user.auth_code === String(code).trim()
    && user.auth_code_purpose === purpose
    && user.auth_code_expires && new Date(user.auth_code_expires) > new Date();
}

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  phone: z.string().min(5, 'Укажите телефон').max(30),
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
    email_verified: u.email_verified ?? false,
    points: u.points ?? 0,
    dob: u.dob ?? null,
    passport_url: u.passport_url ?? null,
    license_url: u.license_url ?? null,
    passport_page_url: u.passport_page_url ?? null,
    registration_url: u.registration_url ?? null,
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
    const { rows } = await q(
      `INSERT INTO users (email, name, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,'user') RETURNING *`,
      [body.email.toLowerCase(), body.name, body.phone || null, hash]
    );
    const user = rows[0];

    // Код подтверждения email (не блокирует вход; используется для подтверждения почты)
    await issueCode(user.id, user.email, 'verify');

    pushToSalebot('register', {
      user_id: user.id, name: user.name, email: user.email, phone: user.phone,
    }).catch(() => {});

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS).json({
      user: publicUser(user),
      needsEmailVerify: true,
    });
  } catch (e) { next(e); }
});

// POST /api/auth/verify-code — подтвердить email кодом (залогиненный пользователь)
router.post('/verify-code', requireAuth, async (req, res, next) => {
  try {
    const { code } = z.object({ code: z.string().min(4) }).parse(req.body);
    const user = await one('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (user.email_verified) return res.json({ ok: true, user: publicUser(user) });
    if (!checkCode(user, code, 'verify')) return res.status(400).json({ error: 'Неверный или истёкший код' });

    const updated = await one(
      `UPDATE users SET email_verified = true, auth_code = NULL, auth_code_expires = NULL, auth_code_purpose = NULL
       WHERE id = $1 RETURNING *`, [user.id]
    );
    res.json({ ok: true, user: publicUser(updated) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Введите код' });
    next(e);
  }
});

// POST /api/auth/resend-code — повторно отправить код подтверждения email
router.post('/resend-code', requireAuth, async (req, res, next) => {
  try {
    const user = await one('SELECT id, email, email_verified FROM users WHERE id = $1', [req.user.id]);
    if (user.email_verified) return res.status(400).json({ error: 'Email уже подтверждён' });
    const sent = await issueCode(user.id, user.email, 'verify');
    res.json({ ok: true, sent });
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

    // 2FA: код на почту. Пропускаем для встроенного админа и когда почта не настроена (чтобы не залочить).
    const skip2fa = !resendConfigured || user.email === SEED_ADMIN_EMAIL;
    if (!skip2fa) {
      const sent = await issueCode(user.id, user.email, 'login');
      if (sent) return res.json({ needsCode: true, email: user.email });
      // письмо не ушло — деградируем до прямого входа, без лока
    }

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS).json({ user: publicUser(user) });
  } catch (e) { next(e); }
});

// POST /api/auth/login-verify — завершить вход кодом из письма
router.post('/login-verify', async (req, res, next) => {
  try {
    const { email, code } = z.object({ email: z.string().email(), code: z.string().min(4) }).parse(req.body);
    const user = await one('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!user || !checkCode(user, code, 'login')) {
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }
    await q(`UPDATE users SET auth_code = NULL, auth_code_expires = NULL, auth_code_purpose = NULL WHERE id = $1`, [user.id]);
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS).json({ user: publicUser(user) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Введите код' });
    next(e);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: undefined }).json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
