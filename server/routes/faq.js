import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { many, q } from '../db.js';

const router = Router();

const faqSchema = z.object({
  question: z.string().min(2, 'Вопрос слишком короткий'),
  answer: z.string().min(2, 'Ответ слишком короткий'),
  sort_order: z.number().int().default(0)
});

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора.' });
  }
  next();
}

// GET /api/faq - Public route to get all FAQ items
router.get('/', async (req, res, next) => {
  try {
    const items = await many('SELECT * FROM faq ORDER BY sort_order ASC, id ASC');
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// POST /api/faq - Admin only
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = faqSchema.parse(req.body);
    const { rows } = await q(
      'INSERT INTO faq (question, answer, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [body.question, body.answer, body.sort_order]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Неверные данные', detail: e.errors });
    }
    next(e);
  }
});

// PUT /api/faq/:id - Admin only
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = faqSchema.parse(req.body);
    const { rows } = await q(
      'UPDATE faq SET question = $1, answer = $2, sort_order = $3 WHERE id = $4 RETURNING *',
      [body.question, body.answer, body.sort_order, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Вопрос не найден' });
    }
    res.json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Неверные данные', detail: e.errors });
    }
    next(e);
  }
});

// DELETE /api/faq/:id - Admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await q('DELETE FROM faq WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Вопрос не найден' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (e) {
    next(e);
  }
});

export default router;
