// Уведомления в Telegram через Bot API. Токен бота (@BotFather) и chat_id чата/группы,
// куда слать сообщения, берутся из env — задаются на проде, в коде секретов нет.
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export const telegramConfigured = !!(TOKEN && CHAT_ID);

// Экранируем спецсимволы HTML для parse_mode=HTML.
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Отправка текста в Telegram. Если не настроено — тихо пропускаем (пишем в лог),
// как это сделано для email. Бросает при ошибке API (вызывающий сам решает, критично ли).
export async function sendTelegramMessage(text) {
  if (!TOKEN || !CHAT_ID) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN/CHAT_ID не заданы — пропускаю отправку');
    console.log('[telegram] сообщение:', text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}

// Заявка с формы «Оставьте заявку» → красивое сообщение в Telegram.
export async function sendContactRequestTelegram({ name, phone, car, message }) {
  const text =
    '🚗 <b>Новая заявка с сайта AURIX</b>\n\n' +
    `<b>Имя:</b> ${esc(name)}\n` +
    `<b>Телефон:</b> ${esc(phone)}` +
    (car ? `\n<b>Авто:</b> ${esc(car)}` : '') +
    (message ? `\n<b>Сообщение:</b> ${esc(message)}` : '');
  await sendTelegramMessage(text);
}
