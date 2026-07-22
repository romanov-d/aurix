import { Router } from 'express';
import { sendContactRequestEmail } from '../email.js';
import { sendContactRequestTelegram } from '../telegram.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, car, message } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Имя и телефон обязательны для заполнения' });
    }

    // Шлём в оба канала (Telegram + почта). Сбой одного не должен терять заявку.
    const results = await Promise.allSettled([
      sendContactRequestTelegram({ name, phone, car, message }),
      sendContactRequestEmail({ name, phone, car, message }),
    ]);
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[contact] канал ${i === 0 ? 'telegram' : 'email'} не сработал:`, r.reason?.message || r.reason);
      }
    });

    res.json({ ok: true, message: 'Заявка успешно отправлена!' });
  } catch (e) {
    next(e);
  }
});

export default router;
