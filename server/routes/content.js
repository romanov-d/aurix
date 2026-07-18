import { Router } from 'express';
import { getContentMap } from '../db.js';

const router = Router();

// Публичный: карта {key: value} для рендера лендинга. Кешируется в db-слое.
router.get('/', async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    res.json(await getContentMap());
  } catch (e) { next(e); }
});

export default router;
