import { Router } from 'express';
import { z } from 'zod';
import { q } from '../db.js';
import { sendContactRequestEmail } from '../email.js';
import { sendContactRequestTelegram } from '../telegram.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { recordConsent, CONSENT } from '../consent.js';

const router = Router();

// Публичный неавторизованный эндпоинт — жёстко ограничиваем длины и частоту,
// чтобы не было спама/email-бомбы через тело до 12 МБ.
const contactSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(100),
  phone: z.string().trim().min(5, 'Укажите телефон').max(30),
  car: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  // Согласие на обработку ПДн обязательно: отправитель заявки не зарегистрирован
  // и другого места, где он мог бы его дать, нет.
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Требуется согласие на обработку персональных данных' }),
  }),
});

router.post('/', rateLimit({ windowMs: 10 * 60 * 1000, max: 5 }), async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Проверьте поля формы', detail: parsed.error.issues });
    }
    const { name, phone, car, message } = parsed.data;

    // Факт согласия фиксируем до всего остального
    await recordConsent(req, { kind: CONSENT.PDN, subject: phone, source: 'contact_form' });

    // СНАЧАЛА сохраняем заявку — уведомления это лишь доставка. Telegram может
    // быть не настроен, почта — отвалиться; заявка не должна зависеть от них
    // (раньше при обоих молчащих каналах обращение терялось совсем, а клиент
    // видел «успешно отправлено»). Запись сразу видна менеджеру в админке.
    let saved = null;
    try {
      const { rows } = await q(
        `INSERT INTO contact_requests (name, phone, car, message)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, phone, car || null, message || null]
      );
      saved = rows[0];
    } catch (e) {
      // База недоступна — не роняем заявку, пробуем хотя бы доставить каналами
      console.error('[contact] не удалось сохранить заявку в БД:', e.message);
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

    // Если и БД не ответила, и оба канала не доставили — врать клиенту «успешно»
    // нельзя: пусть позвонит сам, вместо молча потерянного обращения.
    if (!saved && results.every((r) => r.status === 'rejected')) {
      return res.status(500).json({ error: 'Не удалось отправить заявку. Позвоните нам, пожалуйста.' });
    }

    res.json({ ok: true, message: 'Заявка успешно отправлена!' });
  } catch (e) {
    next(e);
  }
});

export default router;
