// Яндекс.Метрика — обёртки. Счётчик инициализируется в index.html; здесь —
// безопасные вызовы (не падают, если ym не загрузился, напр. блокировщик/CSP).
export const YM_ID = 111101844;

function ym(...args) {
  if (typeof window !== 'undefined' && typeof window.ym === 'function') {
    window.ym(YM_ID, ...args);
  }
}

// Виртуальный просмотр страницы для SPA — вызывать при смене роута.
export function ymHit(url) {
  ym('hit', url || (typeof location !== 'undefined' ? location.href : undefined));
}

// Достижение цели. Имя цели должно совпадать с JS-целью, созданной в панели Метрики.
export function reachGoal(name, params) {
  ym('reachGoal', name, params);
}
