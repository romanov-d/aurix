import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { many, one, q } from '../db.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора.' });
  }
  next();
}

const postSchema = z.object({
  title: z.string().min(2, 'Заголовок слишком короткий'),
  excerpt: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  read_time: z.string().optional().nullable(),
  published: z.boolean().default(true),
});

// GET /api/blog — публичный список (только опубликованные); ?all=1 для админа
router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin' && req.query.all === '1';
    const items = await many(
      isAdmin
        ? 'SELECT * FROM blog_posts ORDER BY created_at DESC'
        : 'SELECT * FROM blog_posts WHERE published = TRUE ORDER BY created_at DESC'
    );
    res.json(items);
  } catch (e) { next(e); }
});

// GET /api/blog/:id — один пост
router.get('/:id', async (req, res, next) => {
  try {
    const post = await one('SELECT * FROM blog_posts WHERE id = $1', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Статья не найдена' });
    if (!post.published && req.user?.role !== 'admin') {
      return res.status(404).json({ error: 'Статья не найдена' });
    }
    res.json(post);
  } catch (e) { next(e); }
});

// POST /api/blog — создать (админ)
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const b = postSchema.parse(req.body);
    const { rows } = await q(
      `INSERT INTO blog_posts (title, excerpt, content, category, image_url, read_time, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [b.title, b.excerpt || null, b.content || null, b.category || null, b.image_url || null, b.read_time || null, b.published]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверные данные', detail: e.errors });
    next(e);
  }
});

// PUT /api/blog/:id — обновить (админ)
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const b = postSchema.parse(req.body);
    const { rows } = await q(
      `UPDATE blog_posts SET title=$1, excerpt=$2, content=$3, category=$4, image_url=$5, read_time=$6, published=$7
       WHERE id=$8 RETURNING *`,
      [b.title, b.excerpt || null, b.content || null, b.category || null, b.image_url || null, b.read_time || null, b.published, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Статья не найдена' });
    res.json(rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Неверные данные', detail: e.errors });
    next(e);
  }
});

// DELETE /api/blog/:id — удалить (админ)
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await q('DELETE FROM blog_posts WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Статья не найдена' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
