import { Router } from 'express';
import { z } from 'zod';
import { sendContactRequestEmail } from '../email.js';
import { sendContactRequestTelegram } from '../telegram.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Публичный неавторизованный эндпоинт — жёстко ограничиваем длины и частоту,
// чтобы не было спама/email-бомбы через тело до 12 МБ.
const contactSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(100),
  phone: z.string().trim().min(5, 'Укажите телефон').max(30),
  car: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
});

router.post('/', rateLimit({ windowMs: 10 * 60 * 1000, max: 5 }), async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Проверьте поля формы', detail: parsed.error.issues });
    }
    const { name, phone, car, message } = parsed.data;

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
