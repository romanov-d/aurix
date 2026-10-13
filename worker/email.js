// Отправка писем через Resend.
//
// Было: официальный SDK resend. Стало: прямой вызов HTTP API через fetch —
// SDK тянет Node-зависимости, а запрос там ровно один и простой. Тела писем,
// адреса и условия отправки не менялись.

import { getEnv } from './db.js';

const FROM = () => getEnv().EMAIL_FROM || 'AURIX MOTORS <noreply@aurixmotors.ru>';
const SITE = () => getEnv().SITE_URL || 'https://aurixmotors.ru';

export const resendConfigured = () => !!getEnv().RESEND_API_KEY;

// Единая точка отправки: без ключа тихо пропускаем, как было раньше.
async function send({ to, subject, html }) {
  const key = getEnv().RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY не задан — письмо не отправлено:', subject);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM(), to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }
}

export async function sendCodeEmail(email, code, purpose = 'login') {
  const title = purpose === 'login' ? 'Код для входа'
    : purpose === 'reset' ? 'Сброс пароля'
    : 'Подтверждение email';
  const lead = purpose === 'login'
    ? 'Используйте этот код, чтобы войти в личный кабинет AURIX MOTORS:'
    : purpose === 'reset'
    ? 'Используйте этот код, чтобы задать новый пароль AURIX MOTORS:'
    : 'Введите этот код, чтобы подтвердить ваш email:';


  await send({
    to: email,
    subject: `${title} — AURIX MOTORS`,
    html: `
      <div style="background:#000;color:#fff;font-family:sans-serif;padding:48px;max-width:480px;margin:0 auto">
        <h1 style="font-size:22px;margin:0 0 14px;color:#fff">${title}</h1>
        <p style="color:#9a9a9a;font-size:15px;line-height:1.6;margin:0 0 24px">${lead}</p>
        <div style="font-size:38px;font-weight:700;letter-spacing:10px;color:#D4AF37;text-align:center;background:#111;border-radius:12px;padding:18px 0">${code}</div>
        <p style="color:#555;font-size:12px;margin-top:24px">Код действует 10 минут. Если вы не запрашивали — проигнорируйте письмо.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(email, token) {

  await send({
    to: email,
    subject: 'Подтвердите email — AURIX MOTORS',
    html: `
      <div style="background:#000;color:#fff;font-family:sans-serif;padding:48px;max-width:560px;margin:0 auto">
        <img src="${SITE()}/logo.svg" alt="AURIX" style="height:36px;margin-bottom:32px" />
        <h1 style="font-size:24px;margin:0 0 16px;color:#fff">Подтвердите email</h1>
        <p style="color:#9a9a9a;font-size:15px;line-height:1.6;margin:0 0 32px">
          Вы зарегистрировались на AURIX MOTORS. Нажмите кнопку ниже чтобы подтвердить адрес.
        </p>
        <a href="${SITE()}/verify?token=${token}"
           style="display:inline-block;background:#D4AF37;color:#000;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none">
          Подтвердить email
        </a>
        <p style="color:#555;font-size:12px;margin-top:32px">
          Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.
        </p>
      </div>
    `,
  });
}

export async function sendContactRequestEmail({ name, phone, car, message }) {
  const toEmail = getEnv().CONTACT_EMAIL || 'info@aurixmotors.ru';


  await send({
    to: toEmail,
    subject: `Новая заявка с сайта от ${name}`,
    html: `
      <div style="background:#000;color:#fff;font-family:sans-serif;padding:48px;max-width:560px;margin:0 auto">
        <img src="${SITE()}/logo.svg" alt="AURIX" style="height:36px;margin-bottom:32px" />
        <h1 style="font-size:24px;margin:0 0 16px;color:#fff;border-bottom:1px solid #333;padding-bottom:16px">
          Новая заявка на обратную связь
        </h1>
        <p style="margin:16px 0"><strong>Имя:</strong> ${esc(name)}</p>
        <p style="margin:16px 0"><strong>Телефон:</strong> ${esc(phone)}</p>
        <p style="margin:16px 0"><strong>Автомобиль:</strong> ${esc(car || 'Не указан')}</p>
        <p style="margin:16px 0"><strong>Сообщение:</strong><br />${esc(message || 'Пусто').replace(/\n/g, '<br />')}</p>
      </div>
    `,
  });
}

// Уведомление админу о новом зарегистрированном пользователе.
export async function sendNewUserEmail({ name, email, phone }) {
  const toEmail = getEnv().CONTACT_EMAIL || 'info@aurixmotors.ru';


  await send({
    to: toEmail,
    subject: `Новый пользователь: ${name}`,
    html: `
      <div style="background:#000;color:#fff;font-family:sans-serif;padding:48px;max-width:560px;margin:0 auto">
        <img src="${SITE()}/logo.svg" alt="AURIX" style="height:36px;margin-bottom:32px" />
        <h1 style="font-size:24px;margin:0 0 16px;color:#fff;border-bottom:1px solid #333;padding-bottom:16px">
          Новая регистрация на сайте
        </h1>
        <p style="margin:16px 0"><strong>Имя:</strong> ${esc(name)}</p>
        <p style="margin:16px 0"><strong>Email:</strong> ${esc(email)}</p>
        <p style="margin:16px 0"><strong>Телефон:</strong> ${esc(phone || 'Не указан')}</p>
      </div>
    `,
  });
}
