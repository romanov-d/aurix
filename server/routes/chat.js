import { Router } from 'express';
import { q, one, many } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// ─────────────────────────────────────────────────────────────────────────────
// Чат «клиент ↔ менеджер». Фаза 1: REST + polling (без SSE).
// Два роутера: clientRouter (/api/chat, requireAuth) и adminRouter
// (/api/admin/chat, requireRole('admin')).
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BODY = 4000;
const ATTACH_MAX_URL = 6 * 1024 * 1024; // ~6 МБ строки url/base64 (сжатие на клиенте есть)

function cleanMsg(body) {
  const t = (body ?? '').toString().trim();
  return t.slice(0, MAX_BODY);
}

// Валидация вложения на приёме: только безопасные схемы URL.
// Блокируем javascript:, data:text/html и data:image/svg+xml (SVG может исполнять скрипт),
// иначе не-image вложение рендерится как <a href> → XSS у менеджера/клиента.
function validateAttachment(att) {
  if (!att || typeof att !== 'object') return { ok: true, value: null };
  const url = String(att.url || '');
  if (!url) return { ok: true, value: null };
  const allowed =
    /^https:\/\//i.test(url) ||
    /^data:image\/(png|jpe?g|gif|webp|heic|heif);base64,/i.test(url) ||
    /^data:application\/pdf;base64,/i.test(url);
  if (!allowed) return { ok: false, error: 'Недопустимый тип вложения' };
  if (url.length > ATTACH_MAX_URL) return { ok: false, error: 'Вложение слишком большое' };
  return {
    ok: true,
    value: {
      url,
      name: att.name ? String(att.name).slice(0, 200) : null,
      type: att.type ? String(att.type).slice(0, 120) : null,
      size: Number.isFinite(Number(att.size)) ? Number(att.size) : null,
    },
  };
}

// Один открытый тред на (клиент + машину). Без машины — общий тред поддержки.
async function findOrCreateThread(userId, { car_id, booking_id, subject } = {}) {
  const existing = await one(
    `SELECT * FROM chat_threads
       WHERE user_id = $1 AND status = 'open' AND car_id IS NOT DISTINCT FROM $2
       ORDER BY last_message_at DESC LIMIT 1`,
    [userId, car_id || null]
  );
  if (existing) return existing;
  const { rows } = await q(
    `INSERT INTO chat_threads (user_id, car_id, booking_id, subject)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, car_id || null, booking_id || null, subject || null]
  );
  return rows[0];
}

async function insertMessage(thread, { senderId, senderRole, body, attachment }) {
  const { rows } = await q(
    `INSERT INTO chat_messages
       (thread_id, sender_id, sender_role, body, attachment_url, attachment_name, attachment_type, attachment_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      thread.id, senderId, senderRole, body || null,
      attachment?.url || null, attachment?.name || null,
      attachment?.type || null, attachment?.size || null,
    ]
  );
  await q(`UPDATE chat_threads SET last_message_at = NOW(), status = 'open' WHERE id = $1`, [thread.id]);
  return rows[0];
}

async function markRead(threadId, readerRole, lastMessageId) {
  await q(
    `INSERT INTO chat_reads (thread_id, reader_role, last_read_message_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (thread_id, reader_role)
     DO UPDATE SET last_read_message_id = GREATEST(chat_reads.last_read_message_id, EXCLUDED.last_read_message_id)`,
    [threadId, readerRole, lastMessageId || 0]
  );
}

// ─── SSE-хаб (один процесс pm2 fork → in-memory) ─────────────────────────────
const sseClients = new Map(); // userId(str) -> Set<res>
const sseAdmins = new Set();  // Set<res>

function sseInit(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx: не буферизовать SSE
  });
  res.write(':ok\n\n');
}
function sseSend(res, data) {
  try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* соединение закрыто */ }
}
// Heartbeat — держим соединение живым через прокси
setInterval(() => {
  for (const set of sseClients.values()) for (const r of set) { try { r.write(':ping\n\n'); } catch { /* */ } }
  for (const r of sseAdmins) { try { r.write(':ping\n\n'); } catch { /* */ } }
}, 25000).unref?.();

// Уведомить владельца треда и всех менеджеров о новом сообщении
function notifyMessage(thread, msg) {
  const payload = { type: 'message', thread_id: thread.id, message: msg };
  const set = sseClients.get(String(thread.user_id));
  if (set) for (const r of set) sseSend(r, payload);
  for (const r of sseAdmins) sseSend(r, payload);
}

// ─── Клиент ──────────────────────────────────────────────────────────────────
export const clientRouter = Router();
clientRouter.use(requireAuth);

// SSE-поток клиента
clientRouter.get('/stream', (req, res) => {
  sseInit(res);
  const uid = String(req.user.id);
  if (!sseClients.has(uid)) sseClients.set(uid, new Set());
  sseClients.get(uid).add(res);
  req.on('close', () => { sseClients.get(uid)?.delete(res); });
});

// Список моих диалогов (с контекстом машины и числом непрочитанных от менеджера)
clientRouter.get('/threads', async (req, res, next) => {
  try {
    const rows = await many(
      `SELECT t.*, c.name AS car_name, c.image_url AS car_image,
         (SELECT body FROM chat_messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_body,
         (SELECT COUNT(*) FROM chat_messages m
            WHERE m.thread_id = t.id AND m.sender_role = 'admin'
              AND m.id > COALESCE((SELECT last_read_message_id FROM chat_reads r
                                     WHERE r.thread_id = t.id AND r.reader_role = 'user'), 0)
         )::int AS unread
       FROM chat_threads t
       LEFT JOIN cars c ON c.id = t.car_id
       WHERE t.user_id = $1
       ORDER BY t.last_message_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Открыть/создать диалог (опц. по машине/броне) → вернуть тред
clientRouter.post('/threads', async (req, res, next) => {
  try {
    const { car_id, booking_id, subject } = req.body || {};
    const thread = await findOrCreateThread(req.user.id, { car_id, booking_id, subject });
    res.json(thread);
  } catch (e) { next(e); }
});

// Сообщения треда (after — для polling только новых)
clientRouter.get('/threads/:id/messages', async (req, res, next) => {
  try {
    const thread = await one(`SELECT * FROM chat_threads WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (!thread) return res.status(404).json({ error: 'Диалог не найден' });
    const after = parseInt(req.query.after) || 0;
    const rows = await many(
      `SELECT * FROM chat_messages WHERE thread_id = $1 AND id > $2 ORDER BY id ASC`,
      [thread.id, after]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Отправить сообщение
clientRouter.post('/threads/:id/messages', async (req, res, next) => {
  try {
    const thread = await one(`SELECT * FROM chat_threads WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (!thread) return res.status(404).json({ error: 'Диалог не найден' });
    const body = cleanMsg(req.body?.body);
    const attCheck = validateAttachment(req.body?.attachment);
    if (!attCheck.ok) return res.status(400).json({ error: attCheck.error });
    const attachment = attCheck.value;
    if (!body && !attachment) return res.status(400).json({ error: 'Пустое сообщение' });
    const msg = await insertMessage(thread, { senderId: req.user.id, senderRole: 'user', body, attachment });
    await markRead(thread.id, 'user', msg.id);
    notifyMessage(thread, msg);
    res.json(msg);
  } catch (e) { next(e); }
});

// Отметить прочитанным до последнего сообщения
clientRouter.post('/threads/:id/read', async (req, res, next) => {
  try {
    const thread = await one(`SELECT * FROM chat_threads WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (!thread) return res.status(404).json({ error: 'Диалог не найден' });
    const last = await one(`SELECT MAX(id) AS mx FROM chat_messages WHERE thread_id = $1`, [thread.id]);
    await markRead(thread.id, 'user', last?.mx || 0);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Бейдж непрочитанных у клиента
clientRouter.get('/unread-count', async (req, res, next) => {
  try {
    const row = await one(
      `SELECT COUNT(*)::int AS n FROM chat_messages m
         JOIN chat_threads t ON t.id = m.thread_id
        WHERE t.user_id = $1 AND m.sender_role = 'admin'
          AND m.id > COALESCE((SELECT last_read_message_id FROM chat_reads r
                                 WHERE r.thread_id = t.id AND r.reader_role = 'user'), 0)`,
      [req.user.id]
    );
    res.json({ count: row?.n || 0 });
  } catch (e) { next(e); }
});

// ─── Админ / менеджер ────────────────────────────────────────────────────────
export const adminRouter = Router();
adminRouter.use(requireRole('admin'));

// SSE-поток менеджера (все диалоги)
adminRouter.get('/stream', (req, res) => {
  sseInit(res);
  sseAdmins.add(res);
  req.on('close', () => sseAdmins.delete(res));
});

// Менеджер сам открывает диалог с клиентом (инициатива менеджера) по user_id
adminRouter.post('/threads', async (req, res, next) => {
  try {
    const userId = parseInt(req.body?.user_id);
    if (!userId) return res.status(400).json({ error: 'Не указан пользователь' });
    const u = await one('SELECT id FROM users WHERE id = $1', [userId]);
    if (!u) return res.status(404).json({ error: 'Пользователь не найден' });
    const base = await findOrCreateThread(userId, {});
    // вернуть с данными клиента — чтобы шапка чата сразу показала имя/контакты
    const thread = await one(
      `SELECT t.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone, c.name AS car_name
         FROM chat_threads t JOIN users u ON u.id = t.user_id
         LEFT JOIN cars c ON c.id = t.car_id
        WHERE t.id = $1`,
      [base.id]
    );
    res.json(thread);
  } catch (e) { next(e); }
});

// Список ВСЕХ диалогов: клиент, контекст машины, превью, непрочитанные
adminRouter.get('/threads', async (req, res, next) => {
  try {
    const { status, q: search } = req.query;
    const where = [];
    const params = [];
    if (status === 'open' || status === 'closed') { params.push(status); where.push(`t.status = $${params.length}`); }
    if (search) { params.push(`%${search}%`); where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR c.name ILIKE $${params.length})`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await many(
      `SELECT t.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone, u.avatar_url AS user_avatar,
         c.name AS car_name,
         (SELECT body FROM chat_messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_body,
         (SELECT COUNT(*) FROM chat_messages m
            WHERE m.thread_id = t.id AND m.sender_role = 'user'
              AND m.id > COALESCE((SELECT last_read_message_id FROM chat_reads r
                                     WHERE r.thread_id = t.id AND r.reader_role = 'admin'), 0)
         )::int AS unread
       FROM chat_threads t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN cars c ON c.id = t.car_id
       ${whereSql}
       ORDER BY t.last_message_at DESC`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Сообщения треда (для админа — без ограничения по владельцу)
adminRouter.get('/threads/:id/messages', async (req, res, next) => {
  try {
    const thread = await one(
      `SELECT t.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
              c.name AS car_name
         FROM chat_threads t JOIN users u ON u.id = t.user_id
         LEFT JOIN cars c ON c.id = t.car_id WHERE t.id = $1`,
      [req.params.id]
    );
    if (!thread) return res.status(404).json({ error: 'Диалог не найден' });
    const after = parseInt(req.query.after) || 0;
    const messages = await many(
      `SELECT * FROM chat_messages WHERE thread_id = $1 AND id > $2 ORDER BY id ASC`,
      [thread.id, after]
    );
    res.json({ thread, messages });
  } catch (e) { next(e); }
});

// Ответ менеджера
adminRouter.post('/threads/:id/messages', async (req, res, next) => {
  try {
    const thread = await one(`SELECT * FROM chat_threads WHERE id = $1`, [req.params.id]);
    if (!thread) return res.status(404).json({ error: 'Диалог не найден' });
    const body = cleanMsg(req.body?.body);
    const attCheck = validateAttachment(req.body?.attachment);
    if (!attCheck.ok) return res.status(400).json({ error: attCheck.error });
    const attachment = attCheck.value;
    if (!body && !attachment) return res.status(400).json({ error: 'Пустое сообщение' });
    const msg = await insertMessage(thread, { senderId: req.user.id, senderRole: 'admin', body, attachment });
    // первый ответивший менеджер закрепляется за тредом
    if (!thread.manager) await q(`UPDATE chat_threads SET manager = $1 WHERE id = $2`, [req.user.name, thread.id]);
    await markRead(thread.id, 'admin', msg.id);
    notifyMessage(thread, msg);
    res.json(msg);
  } catch (e) { next(e); }
});

adminRouter.post('/threads/:id/read', async (req, res, next) => {
  try {
    const last = await one(`SELECT MAX(id) AS mx FROM chat_messages WHERE thread_id = $1`, [req.params.id]);
    await markRead(req.params.id, 'admin', last?.mx || 0);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Сменить статус / менеджера
adminRouter.patch('/threads/:id', async (req, res, next) => {
  try {
    const { status, manager } = req.body || {};
    const fields = [], params = [];
    if (status === 'open' || status === 'closed') { params.push(status); fields.push(`status = $${params.length}`); }
    if (manager !== undefined) { params.push(manager || null); fields.push(`manager = $${params.length}`); }
    if (!fields.length) return res.status(400).json({ error: 'Нет полей' });
    params.push(req.params.id);
    const { rows } = await q(`UPDATE chat_threads SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// Бейдж: всего непрочитанных от клиентов
adminRouter.get('/unread-count', async (_req, res, next) => {
  try {
    const row = await one(
      `SELECT COUNT(*)::int AS n FROM chat_messages m
         JOIN chat_threads t ON t.id = m.thread_id
        WHERE m.sender_role = 'user'
          AND m.id > COALESCE((SELECT last_read_message_id FROM chat_reads r
                                 WHERE r.thread_id = t.id AND r.reader_role = 'admin'), 0)`
    );
    res.json({ count: row?.n || 0 });
  } catch (e) { next(e); }
});

export default clientRouter;
