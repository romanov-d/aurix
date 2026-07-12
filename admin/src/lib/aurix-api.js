// Клиент нашего Express API (тот же бэкенд, что и основной сайт AURIX).
// Работает через относительный /api: в dev его проксирует Vite на :3001,
// в проде /admin и /api на одном домене (nginx) — поэтому httpOnly-cookie
// сессии работает без CORS.

const BASE = '/api';

export async function apiFetch(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include', // передаём/принимаем cookie сессии
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Ошибка запроса (${res.status})`);
    err.status = res.status;
    err.detail = data?.detail;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => apiFetch(p),
  post: (p, body) => apiFetch(p, { method: 'POST', body }),
  patch: (p, body) => apiFetch(p, { method: 'PATCH', body }),
  put: (p, body) => apiFetch(p, { method: 'PUT', body }),
  del: (p) => apiFetch(p, { method: 'DELETE' }),
};
