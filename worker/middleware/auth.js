// Аутентификация на Workers.
//
// Было: jsonwebtoken поверх node:crypto. Стало: HS256 через hono/jwt, то есть
// Web Crypto — работает в рантайме Workers и не тянет Node-зависимости.
// Формат токена прежний (JWT HS256 с полями uid/role), так что сторона клиента
// не меняется. Подпись и проверка стали асинхронными — это единственное,
// что пришлось поправить в вызывающем коде.

import { sign, verify } from 'hono/jwt';
import { one, getEnv } from '../db.js';

export const COOKIE_NAME = 'aurix_token';
const WEEK_SECONDS = 7 * 24 * 60 * 60;

function secret() {
  const s = getEnv().JWT_SECRET;
  // В проде без настоящего секрета работать нельзя: с известным дефолтом любой
  // подпишет себе токен с ролью admin. Падаем сразу и громко.
  if (!s) {
    if (getEnv().NODE_ENV === 'production') {
      throw new Error('[auth] JWT_SECRET не задан — в production это обязательно');
    }
    return 'aurix-dev-secret-change-me';
  }
  return s;
}

export function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // На Workers всё всегда по HTTPS, кроме локальной разработки
    secure: getEnv().NODE_ENV !== 'development',
    maxAge: WEEK_SECONDS * 1000,
    path: '/',
  };
}

// Алгоритм указываем явно и при подписи, и при проверке: hono/jwt требует
// его у verify и без него падает с JwtAlgorithmRequired. Молчаливое последствие
// такой ошибки — любой вход «проходит», но пользователь остаётся гостем.
const JWT_ALG = 'HS256';

export async function signToken(user) {
  return sign(
    { uid: String(user.id), role: user.role, exp: Math.floor(Date.now() / 1000) + WEEK_SECONDS },
    secret(),
    JWT_ALG,
  );
}

export async function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = await verify(token, secret(), JWT_ALG);
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
  } catch (_) { /* битый или просроченный токен — считаем гостем */ }
  return next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  return next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}
