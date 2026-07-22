import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { one, q } from '../db.js';
import { signToken, COOKIE_NAME, COOKIE_OPTS, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { sendCodeEmail, resendConfigured } from '../email.js';
import { pushToSalebot } from '../salebot.js';

const router = Router();

// Анти-брутфорс: пароль и 6-значные коды нельзя перебирать без ограничений.
// Ключ — IP + email, чтобы атакующий не выбирал лимит жертве с другого IP.
const ipEmailKey = (req) => `${req.ip}|${(req.body?.email || '').toLowerCase()}`;
const loginLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 10, keyFn: ipEmailKey });
const codeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 8, keyFn: ipEmailKey });
const registerLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5 });
const forgotLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5 });

// Пер-аккаунт анти-брутфорс пароля (IP-НЕзависимо): считаем НЕудачные попытки по email.
// Ротация IP не спасает атакующего. Сбрасывается при успешном входе/смене пароля.
// Порог с запасом, чтобы не залочить живого пользователя.
const ACCOUNT_MAX_FAILS = 12;
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
const failedLogins = new Map(); // email -> { count, first }
function accountLocked(email) {
  const e = failedLogins.get(email);
  if (!e) return false;
  if (Date.now() - e.first > ACCOUNT_WINDOW_MS) { failedLogins.delete(email); return false; }
  return e.count >= ACCOUNT_MAX_FAILS;
}
function noteFailedLogin(email) {
  const now = Date.now();
  const e = failedLogins.get(email);
  if (!e || now - e.first > ACCOUNT_WINDOW_MS) failedLogins.set(email, { count: 1, first: now });
  else e.count += 1;
}
function clearFailedLogins(email) { failedLogins.delete(email); }
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of failedLogins) if (now - v.first > ACCOUNT_WINDOW_MS) failedLogins.delete(k);
}, 10 * 60 * 1000).unref();

const SEED_ADMIN_EMAIL = 'admin@aurix.local'; // встроенный админ — без 2FA (почта не настоящая)
const CODE_TTL_MS = 10 * 60 * 1000;

const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

// Сохранить код у пользователя и отправить письмо. Возвращает true, если письмо ушло.
async function issueCode(userId, email, purpose) {
  const code = genCode();
  const expires = new Date(Date.now() + CODE_TTL_MS);
  await q(`UPDATE users SET auth_code=$1, auth_code_expires=$2, auth_code_purpose=$3, auth_code_attempts=0 WHERE id=$4`,
    [code, expires, purpose, userId]);
  try { await sendCodeEmail(email, code, purpose); return true; }
  catch (e) { console.error('[auth] не удалось отправить код:', e.message); return false; }
}

const MAX_CODE_ATTEMPTS = 5;

function checkCode(user, code, purpose) {
  return user.auth_code && user.auth_code === String(code).trim()
    && user.auth_code_purpose === purpose
    && user.auth_code_expires && new Date(user.auth_code_expires) > new Date()
    && (user.auth_code_attempts ?? 0) < MAX_CODE_ATTEMPTS;
}

// Неверная попытка: инкрементируем счётчик; после MAX_CODE_ATTEMPTS код сгорает —
// перебор 6-значного кода становится бессмысленным даже с ротацией IP.
async function registerFailedAttempt(userId) {
  await q(
    `UPDATE users SET auth_code_attempts = auth_code_attempts + 1,
       auth_code = CASE WHEN auth_code_attempts + 1 >= ${MAX_CODE_ATTEMPTS} THEN NULL ELSE auth_code END
     WHERE id = $1`,
    [userId]
  );
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

router.post('/register', registerLimiter, async (req, res, next) => {
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
router.post('/verify-code', requireAuth, codeLimiter, async (req, res, next) => {
  try {
    const { code } = z.object({ code: z.string().min(4) }).parse(req.body);
    const user = await one('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (user.email_verified) return res.json({ ok: true, user: publicUser(user) });
    if (!checkCode(user, code, 'verify')) {
      await registerFailedAttempt(user.id);
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }

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

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    let body;
    try { body = loginSchema.parse(req.body); }
    catch (e) { return res.status(400).json({ error: 'Bad input', detail: e.errors }); }

    const email = body.email.toLowerCase();
    // Пер-аккаунт лок: перебор пароля с ротацией IP становится бессмысленным.
    if (accountLocked(email)) {
      return res.status(429).json({ error: 'Слишком много неудачных попыток. Попробуйте через 15 минут или восстановите пароль.' });
    }

    const user = await one('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
      noteFailedLogin(email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    clearFailedLogins(email);

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
router.post('/login-verify', codeLimiter, async (req, res, next) => {
  try {
    const { email, code } = z.object({ email: z.string().email(), code: z.string().min(4) }).parse(req.body);
    const user = await one('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!user || !checkCode(user, code, 'login')) {
      if (user) await registerFailedAttempt(user.id);
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

// POST /api/auth/forgot — запросить код сброса пароля на почту.
// Ответ всегда ok, чтобы не раскрывать, существует ли аккаунт (защита от перечисления).
router.post('/forgot', forgotLimiter, async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await one('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase()]);
    if (user) await issueCode(user.id, user.email, 'reset');
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Введите корректный email' });
    next(e);
  }
});

// POST /api/auth/reset — задать новый пароль по коду из письма.
const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  password: z.string().min(6, 'Минимум 6 символов').max(120),
});
router.post('/reset', codeLimiter, async (req, res, next) => {
  try {
    const { email, code, password } = resetSchema.parse(req.body);
    const user = await one('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!user || !checkCode(user, code, 'reset')) {
      if (user) await registerFailedAttempt(user.id);
      return res.status(400).json({ error: 'Неверный или истёкший код' });
    }
    const hash = bcrypt.hashSync(password, 10);
    await q(
      `UPDATE users SET password_hash = $1, auth_code = NULL, auth_code_expires = NULL, auth_code_purpose = NULL WHERE id = $2`,
      [hash, user.id]
    );
    clearFailedLogins(user.email);
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS).json({ ok: true, user: publicUser(user) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Проверьте поля', detail: e.errors });
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
