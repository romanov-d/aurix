import { Router } from 'express';
import { sendContactRequestEmail } from '../email.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, car, message } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Имя и телефон обязательны для заполнения' });
    }

    await sendContactRequestEmail({ name, phone, car, message });

    res.json({ ok: true, message: 'Заявка успешно отправлена!' });
  } catch (e) {
    next(e);
  }
});

export default router;
