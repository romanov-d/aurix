// Простой in-memory rate limiter (sliding window). Процесс у нас один (pm2
// fork-mode), поэтому память процесса — достаточный источник правды. Если
// когда-нибудь перейдём на cluster/несколько инстансов — заменить на Redis.
//
// Использование: router.post('/login', rateLimit({ windowMs, max }), handler)

const buckets = new Map(); // key -> массив timestamp'ов попыток

// Периодическая уборка, чтобы Map не рос вечно
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, hits] of buckets) {
    const alive = hits.filter((t) => now - t < 60 * 60 * 1000);
    if (alive.length === 0) buckets.delete(key);
    else buckets.set(key, alive);
  }
}, SWEEP_INTERVAL_MS).unref();

export function rateLimit({ windowMs = 5 * 60 * 1000, max = 10, keyFn } = {}) {
  return (req, res, next) => {
    const baseKey = keyFn ? keyFn(req) : req.ip;
    const key = `${req.method}:${req.path}:${baseKey}`;
    const now = Date.now();
    const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
      const retryAfterSec = Math.ceil((windowMs - (now - hits[0])) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: 'Слишком много попыток. Попробуйте позже.' });
    }
    hits.push(now);
    buckets.set(key, hits);
    next();
  };
}
