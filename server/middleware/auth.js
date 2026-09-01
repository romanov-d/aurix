import jwt from 'jsonwebtoken';
import { one } from '../db.js';

// В проде без настоящего секрета работать нельзя: с известным дефолтом любой
// может подписать себе токен с ролью admin. Падаем сразу и громко.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('[auth] JWT_SECRET не задан — в production это обязательно');
}
export const JWT_SECRET = process.env.JWT_SECRET || 'aurix-dev-secret-change-me';
export const COOKIE_NAME = 'aurix_token';
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export function signToken(user) {
  return jwt.sign({ uid: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export async function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const u = await one(
      // ВАЖНО: сканы документов здесь НЕ выбираем. Раньше четыре base64-поля
      // тянулись на каждый запрос (мегабайты на ровном месте) и уезжали клиенту
      // в /me. Теперь берём только перечень загруженных видов документов.
      `SELECT u.id, u.email, u.phone, u.name, u.avatar_url, u.role, u.points,
              u.is_verified, u.email_verified, u.dob, u.created_at,
              COALESCE((SELECT array_agg(d.kind ORDER BY d.kind)
                        FROM user_documents d WHERE d.user_id = u.id), '{}') AS doc_kinds
       FROM users u WHERE u.id = $1`,
      [payload.uid]
    );
    if (u) req.user = u;
  } catch (_) { /* invalid token — treat as guest */ }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
