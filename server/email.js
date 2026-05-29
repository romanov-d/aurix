import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = 'AURIX MOTORS <noreply@aurixmotors.com>';
const SITE = process.env.SITE_URL || 'https://aurix-zeta.vercel.app';

export async function sendVerificationEmail(email, token) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    console.log(`[email] verify URL: ${SITE}/verify?token=${token}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Подтвердите email — AURIX MOTORS',
    html: `
      <div style="background:#000;color:#fff;font-family:sans-serif;padding:48px;max-width:560px;margin:0 auto">
        <img src="${SITE}/logo.svg" alt="AURIX" style="height:36px;margin-bottom:32px" />
        <h1 style="font-size:24px;margin:0 0 16px;color:#fff">Подтвердите email</h1>
        <p style="color:#9a9a9a;font-size:15px;line-height:1.6;margin:0 0 32px">
          Вы зарегистрировались на AURIX MOTORS. Нажмите кнопку ниже чтобы подтвердить адрес.
        </p>
        <a href="${SITE}/verify?token=${token}"
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
  const toEmail = process.env.CONTACT_EMAIL || 'info@aurixmotors.com';

  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping sending contact request email');
    console.log(`[email] Contact Request detail:
      Name: ${name}
      Phone: ${phone}
      Car: ${car || 'N/A'}
      Message: ${message || 'N/A'}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Новая заявка с сайта от ${name}`,
    html: `
      <div style="background:#000;color:#fff;font-family:sans-serif;padding:48px;max-width:560px;margin:0 auto">
        <img src="${SITE}/logo.svg" alt="AURIX" style="height:36px;margin-bottom:32px" />
        <h1 style="font-size:24px;margin:0 0 16px;color:#fff;border-bottom:1px solid #333;padding-bottom:16px">
          Новая заявка на обратную связь
        </h1>
        <p style="margin:16px 0"><strong>Имя:</strong> ${name}</p>
        <p style="margin:16px 0"><strong>Телефон:</strong> ${phone}</p>
        <p style="margin:16px 0"><strong>Автомобиль:</strong> ${car || 'Не указан'}</p>
        <p style="margin:16px 0"><strong>Сообщение:</strong><br />${(message || 'Пусто').replace(/\n/g, '<br />')}</p>
      </div>
    `,
  });
}
