// Отправка данных с сайта в SaleBot для последующих рассылок.
// Настраивается через переменную окружения SALEBOT_WEBHOOK_URL.
// Если URL не задан — просто логируем (не ломаем основной флоу).

const WEBHOOK_URL = process.env.SALEBOT_WEBHOOK_URL || '';

/**
 * Отправляет событие в SaleBot. Никогда не бросает исключение наружу —
 * рассылочная интеграция не должна влиять на регистрацию/бронирование.
 * @param {string} event - тип события: 'register' | 'booking' | ...
 * @param {object} payload - данные клиента/брони
 */
export async function pushToSalebot(event, payload) {
  if (!WEBHOOK_URL) {
    console.log(`[salebot] SALEBOT_WEBHOOK_URL не задан — пропуск (${event})`, payload);
    return;
  }
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload, sent_at: new Date().toISOString() }),
    });
    if (!res.ok) console.warn('[salebot] webhook ответил', res.status);
  } catch (e) {
    console.warn('[salebot] ошибка отправки:', e.message);
  }
}
