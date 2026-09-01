// Фиксация согласий пользователя. Доказывать наличие согласия обязан оператор,
// поэтому каждое согласие пишем отдельной записью: что приняли, какая редакция
// документа, откуда, с какого IP. Запись никогда не должна ронять основной
// сценарий — если журнал недоступен, регистрация/заявка всё равно проходят.

import { q } from './db.js';

// Версия правовых документов. Должна совпадать с LEGAL_VERSION на фронте:
// по ней видно, с какой редакцией согласился человек.
export const LEGAL_VERSION = '2026-09-01';

// Виды согласий — соответствуют разделам страницы /consent
export const CONSENT = {
  PDN: 'pdn',                  // обработка персональных данных
  DOCS: 'docs',                // обработка данных документов (паспорт/права)
  CROSS_BORDER: 'cross_border',// трансграничная передача
  MARKETING: 'marketing',      // рекламные рассылки
};

function clientIp(req) {
  // За nginx реальный адрес приходит в X-Forwarded-For
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip || null;
}

export async function recordConsent(req, { kind, userId = null, subject = null, source = null, granted = true }) {
  try {
    await q(
      `INSERT INTO consents (user_id, subject, kind, doc_version, source, granted, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        subject ? String(subject).slice(0, 200) : null,
        kind,
        LEGAL_VERSION,
        source ? String(source).slice(0, 100) : null,
        granted,
        clientIp(req),
        String(req.headers['user-agent'] || '').slice(0, 400),
      ]
    );
  } catch (e) {
    console.error('[consent] не удалось записать согласие:', e.message);
  }
}
