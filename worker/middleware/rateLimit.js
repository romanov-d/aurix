// Ограничение частоты запросов.
//
// На VPS это был Map в памяти единственного процесса. На Workers процессов
// много и живут они недолго, поэтому память изолята — только первая линия:
// она гасит бурст с одного адреса в одном дата-центре. Настоящая защита от
// перебора паролей — счётчик неудачных входов по аккаунту в таблице users,
// он переехал без изменений и от рантайма не зависит.
//
// Если понадобится строгий общий лимит — достаточно завести KV-биндинг
// RATE_LIMIT: хранилище подменяется здесь, вызывающий код не меняется.

const buckets = new Map();
const HOUR_MS = 60 * 60 * 1000;

// Уборка без setInterval: на Workers фоновых таймеров между запросами нет,
// поэтому подчищаем лениво, раз в сколько-то обращений.
let sinceSweep = 0;
function maybeSweep(now) {
  if (++sinceSweep < 200) return;
  sinceSweep = 0;
  for (const [key, hits] of buckets) {
    const alive = hits.filter((t) => now - t < HOUR_MS);
    if (alive.length === 0) buckets.delete(key);
    else buckets.set(key, alive);
  }
}

export function rateLimit({ windowMs = 5 * 60 * 1000, max = 10, keyFn } = {}) {
  return (req, res, next) => {
    const baseKey = keyFn ? keyFn(req) : req.ip;
    const key = `${req.method}:${req.path}:${baseKey}`;
    const now = Date.now();
    maybeSweep(now);
    const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
      const retryAfterSec = Math.ceil((windowMs - (now - hits[0])) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: 'Слишком много попыток. Попробуйте позже.' });
    }
    hits.push(now);
    buckets.set(key, hits);
    return next();
  };
}

// Для тестов: сбросить состояние между сценариями
export function __resetRateLimit() { buckets.clear(); sinceSweep = 0; }
