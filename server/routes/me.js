import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { many, one, q } from '../db.js';
import { recordConsent, CONSENT } from '../consent.js';
import {
  DOC_KINDS, parseDataUrl, saveEncrypted, readDecrypted, removeFile, storageReady,
} from '../docs-storage.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ user: req.user });
});

// Документы через PATCH /me больше не принимаются: у них отдельные эндпоинты
// ниже (шифрование, проверка типа, журнал согласий). Здесь — только профиль.

router.patch('/', async (req, res, next) => {
  try {
    const { name, phone, email, avatar_url, dob } = req.body;

    // Серверный лимит на размер аватара (клиентское сжатие можно обойти)
    if (typeof avatar_url === 'string' && avatar_url.length > 6 * 1024 * 1024) {
      return res.status(413).json({ error: 'Файл «avatar_url» слишком большой' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
    if (dob !== undefined) { fields.push(`dob = $${idx++}`); values.push(dob || null); }
    if (email !== undefined) {
      const clean = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return res.status(400).json({ error: 'Некорректный email' });
      }
      fields.push(`email = $${idx++}`); values.push(clean);
    }
    if (avatar_url !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(avatar_url); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    values.push(req.user.id);
    const { rows } = await q(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, email, name, phone, avatar_url, role, points, is_verified, dob, created_at`,
      values
    );

    const kinds = await many(
      `SELECT kind FROM user_documents WHERE user_id = $1`, [req.user.id]
    );
    const documents = Object.fromEntries(
      DOC_KINDS.map((k) => [k, kinds.some((r) => r.kind === k)])
    );

    res.json({ user: { ...rows[0], documents } });
  } catch (e) {
    if (e && e.code === '23505') {
      return res.status(400).json({ error: 'Этот email уже используется' });
    }
    next(e);
  }
});

// ───────────────────── Документы клиента ─────────────────────

// Загрузка/замена скана. До верификации клиент может заменять файлы сам,
// после — только через менеджера (иначе проверенный документ можно подменить).
router.post('/documents', async (req, res, next) => {
  try {
    const { kind, data, docs_consent } = req.body || {};
    if (!DOC_KINDS.includes(kind)) {
      return res.status(400).json({ error: 'Неизвестный тип документа' });
    }
    if (docs_consent !== true) {
      return res.status(400).json({
        code: 'DOCS_CONSENT_REQUIRED',
        error: 'Требуется согласие на обработку данных документов',
      });
    }
    if (req.user.is_verified) {
      return res.status(403).json({
        error: 'Документы уже проверены и заблокированы. Для изменений обратитесь к менеджеру.',
      });
    }
    if (!storageReady()) {
      console.error('[docs] загрузка отклонена: DOCS_ENCRYPTION_KEY не задан');
      return res.status(503).json({
        error: 'Загрузка документов временно недоступна. Пожалуйста, свяжитесь с менеджером.',
      });
    }

    const parsed = parseDataUrl(data);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const saved = await saveEncrypted(parsed.buffer);

    // Старый файл удаляем только после успешной записи нового
    const prev = await one(
      `SELECT filename FROM user_documents WHERE user_id = $1 AND kind = $2`,
      [req.user.id, kind]
    );
    await q(
      `INSERT INTO user_documents (user_id, kind, filename, mime, bytes, sha256)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, kind) DO UPDATE
         SET filename = EXCLUDED.filename, mime = EXCLUDED.mime,
             bytes = EXCLUDED.bytes, sha256 = EXCLUDED.sha256, created_at = NOW()`,
      [req.user.id, kind, saved.filename, parsed.mime, saved.bytes, saved.sha256]
    );
    if (prev?.filename && prev.filename !== saved.filename) await removeFile(prev.filename);

    recordConsent(req, {
      kind: CONSENT.DOCS, userId: req.user.id, subject: req.user.email, source: 'documents',
    }).catch(() => {});

    res.status(201).json({ ok: true, kind });
  } catch (e) {
    next(e);
  }
});

// Выдача файла владельцу. Отдаём расшифрованным потоком, без кеширования:
// документ не должен осесть в кеше браузера или прокси.
router.get('/documents/:kind', async (req, res, next) => {
  try {
    const { kind } = req.params;
    if (!DOC_KINDS.includes(kind)) return res.status(404).json({ error: 'Не найдено' });
    const doc = await one(
      `SELECT filename, mime FROM user_documents WHERE user_id = $1 AND kind = $2`,
      [req.user.id, kind]
    );
    if (!doc) return res.status(404).json({ error: 'Документ не загружен' });
    const buf = await readDecrypted(doc.filename);
    res.setHeader('Content-Type', doc.mime);
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buf);
  } catch (e) {
    next(e);
  }
});

// Удаление своего документа — пока клиент не верифицирован
router.delete('/documents/:kind', async (req, res, next) => {
  try {
    const { kind } = req.params;
    if (!DOC_KINDS.includes(kind)) return res.status(404).json({ error: 'Не найдено' });
    if (req.user.is_verified) {
      return res.status(403).json({ error: 'Документы уже проверены — обратитесь к менеджеру' });
    }
    const { rows } = await q(
      `DELETE FROM user_documents WHERE user_id = $1 AND kind = $2 RETURNING filename`,
      [req.user.id, kind]
    );
    if (!rows.length) return res.status(404).json({ error: 'Документ не загружен' });
    await removeFile(rows[0].filename);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/bookings', async (req, res, next) => {
  try {
    const items = await many(
      `SELECT b.*,
        json_build_object(
          'id', c.id, 'name', c.name, 'brand', c.brand, 'image_url', c.image_url,
          'year', c.year, 'body', c.body
        ) as car
       FROM bookings b
       JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Favorites
router.get('/favorites', async (req, res, next) => {
  try {
    const items = await many(`SELECT car_id FROM favorites WHERE user_id = $1`, [req.user.id]);
    res.json(items.map(i => i.car_id));
  } catch (e) {
    next(e);
  }
});

router.post('/favorites/:carId', async (req, res, next) => {
  try {
    await q(`INSERT INTO favorites (user_id, car_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.user.id, req.params.carId]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete('/favorites/:carId', async (req, res, next) => {
  try {
    await q(`DELETE FROM favorites WHERE user_id = $1 AND car_id = $2`, [req.user.id, req.params.carId]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Partner flow: Submit car for moderation
import { z } from 'zod';
const carSchema = z.object({
  name: z.string().min(2),
  brand: z.string().min(2),
  year: z.number().int().min(1900).max(2100),
  body: z.string().optional(),
  fuel: z.string().optional(),
  engine: z.string().optional(),
  power_hp: z.number().int().optional(),
  drive: z.string().optional(),
  price_per_day: z.number().int().min(1000),
  image_url: z.string().url(),
  description: z.string().optional()
});

router.post('/cars', async (req, res, next) => {
  try {
    const body = carSchema.parse(req.body);
    const id = 'C-' + Date.now(); // Generate simple ID
    
    const { rows } = await q(
      `INSERT INTO cars (
        id, name, brand, year, body, fuel, engine, power_hp, drive, 
        price_per_day, image_url, description, status, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13)
      RETURNING *`,
      [
        id, body.name, body.brand, body.year, body.body || null, 
        body.fuel || null, body.engine || null, body.power_hp || null, 
        body.drive || null, body.price_per_day, body.image_url, 
        body.description || null, req.user.id
      ]
    );

    // If user is 'user', upgrade them to 'partner'
    if (req.user.role === 'user') {
      await q(`UPDATE users SET role = 'partner' WHERE id = $1`, [req.user.id]);
    }

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad input', detail: e.errors });
    }
    next(e);
  }
});

router.get('/points', async (req, res, next) => {
  try {
    const items = await many(
      `SELECT * FROM user_points WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Финансовая витрина клиента (Блок 1+2): балансы, движения по счёту,
// штрафы/удержания и календарь возврата залога по всем его арендам.
router.get('/finances', async (req, res, next) => {
  try {
    const [me] = await many(
      `SELECT money_balance, deposit_balance FROM users WHERE id = $1`, [req.user.id]);
    const transactions = await many(
      `SELECT id, kind, target, amount, reason, booking_id, created_at
       FROM balance_transactions WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]);
    const charges = await many(
      `SELECT rc.id, rc.type, rc.amount, rc.note, rc.photo_url, rc.from_deposit, rc.created_at,
              rc.booking_id, c.name AS car_name
       FROM rental_charges rc
       JOIN bookings b ON rc.booking_id = b.id
       JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = $1 ORDER BY rc.created_at DESC`,
      [req.user.id]);
    // held_from_deposit — удержано из залога (штрафы), чтобы клиент видел корректный
    // остаток к возврату: deposit_amount − deposit_returned − held_from_deposit.
    const deposits = await many(
      `SELECT b.id AS booking_id, c.name AS car_name, b.deposit_amount,
              b.deposit_returned, b.deposit_status,
              COALESCE((SELECT SUM(amount) FROM rental_charges
                        WHERE booking_id = b.id AND from_deposit = true), 0) AS held_from_deposit
       FROM bookings b JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = $1 AND b.deposit_amount > 0
       ORDER BY b.created_at DESC`,
      [req.user.id]);
    const movements = await many(
      `SELECT dm.id, dm.booking_id, c.name AS car_name, dm.kind, dm.amount,
              dm.note, to_char(dm.due_date, 'YYYY-MM-DD') AS due_date, dm.status, dm.done_at
       FROM deposit_movements dm
       JOIN bookings b ON dm.booking_id = b.id
       JOIN cars c ON b.car_id = c.id
       WHERE b.user_id = $1 ORDER BY dm.due_date NULLS LAST, dm.created_at`,
      [req.user.id]);
    res.json({
      money_balance: me?.money_balance || 0,
      deposit_balance: me?.deposit_balance || 0,
      transactions, charges, deposits, movements,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
