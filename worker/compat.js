// Тонкий слой совместимости Express → Workers.
//
// Зачем: роуты проекта (10 файлов, ~3000 строк) написаны в стиле Express —
// router.get('/x', (req, res) => res.json(...)). Переписывать их руками под
// Workers значит занести ошибки в работающую бизнес-логику. Вместо этого
// воспроизводим ту часть Express API, которой они реально пользуются
// (по факту: status/json/setHeader/cookie/send + params/body/query/user),
// а маршрутизацию отдаём Hono. Сами файлы роутов меняются только в импортах.
//
// Чего здесь намеренно нет: потоковых ответов (res.write) — единственное место,
// где они были, это SSE-чат, он переведён на поллинг.

const MAX_BODY_BYTES = 6 * 1024 * 1024;

export function Router() {
  const layers = [];   // router.use(...) — выполняются до всех роутов
  const routes = [];   // конкретные маршруты
  const add = (method) => (path, ...handlers) => {
    routes.push({ method, path, handlers });
    return api;
  };
  const api = {
    use: (...handlers) => { layers.push(...handlers.filter((h) => typeof h === 'function')); return api; },
    get: add('GET'),
    post: add('POST'),
    put: add('PUT'),
    patch: add('PATCH'),
    delete: add('DELETE'),
    __layers: layers,
    __routes: routes,
  };
  return api;
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function serializeCookie(name, value, opts = {}) {
  let s = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge != null) s += `; Max-Age=${Math.floor(opts.maxAge / 1000)}`;
  if (opts.expires) s += `; Expires=${new Date(opts.expires).toUTCString()}`;
  s += `; Path=${opts.path || '/'}`;
  if (opts.httpOnly) s += '; HttpOnly';
  if (opts.secure) s += '; Secure';
  if (opts.sameSite) s += `; SameSite=${String(opts.sameSite).replace(/^./, (m) => m.toUpperCase())}`;
  return s;
}

// Express-подобные req/res поверх запроса Workers.
async function buildReqRes(c) {
  const url = new URL(c.req.url);
  const headers = Object.fromEntries(c.req.raw.headers.entries());

  let body = {};
  const method = c.req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    const type = headers['content-type'] || '';
    if (type.includes('application/json')) {
      const raw = await c.req.raw.clone().text();
      if (raw.length > MAX_BODY_BYTES) {
        const err = new Error('request entity too large');
        err.status = 413;
        throw err;
      }
      if (raw) {
        try { body = JSON.parse(raw); }
        catch { const e = new Error('Invalid JSON'); e.status = 400; e.type = 'entity.parse.failed'; throw e; }
      }
    } else if (type.includes('application/x-www-form-urlencoded')) {
      body = Object.fromEntries(new URLSearchParams(await c.req.raw.clone().text()));
    }
  }

  const req = {
    method,
    path: url.pathname,
    originalUrl: url.pathname + url.search,
    params: c.req.param() || {},
    query: Object.fromEntries(url.searchParams.entries()),
    headers,
    body,
    cookies: parseCookies(headers.cookie),
    // За Cloudflare реальный адрес приходит в CF-Connecting-IP
    ip: headers['cf-connecting-ip'] || (headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    get(name) { return this.headers[String(name).toLowerCase()]; },
  };

  const state = { status: 200, headers: new Headers(), body: undefined, sent: false };
  const res = {
    status(code) { state.status = code; return res; },
    setHeader(name, value) { state.headers.set(name, value); return res; },
    set(name, value) { return res.setHeader(name, value); },
    cookie(name, value, opts) { state.headers.append('Set-Cookie', serializeCookie(name, value, opts)); return res; },
    clearCookie(name, opts = {}) { return res.cookie(name, '', { ...opts, maxAge: 0 }); },
    json(payload) {
      state.headers.set('Content-Type', 'application/json; charset=utf-8');
      state.body = JSON.stringify(payload);
      state.sent = true;
      return res;
    },
    send(payload) {
      if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) state.body = payload;
      else if (typeof payload === 'object' && payload !== null) return res.json(payload);
      else state.body = String(payload ?? '');
      state.sent = true;
      return res;
    },
    end(payload) { return payload === undefined ? (state.sent = true, res) : res.send(payload); },
    get headersSent() { return state.sent; },
    __state: state,
  };

  return { req, res, state };
}

// Последовательный проход по цепочке обработчиков с семантикой next().
async function runChain(handlers, req, res) {
  let i = 0;
  const next = async (err) => {
    if (err) throw err;
    const h = handlers[i++];
    if (!h) return;
    await h(req, res, next);
    // Если обработчик ничего не отправил и не вызвал next — идём дальше сами,
    // как это делает Express для middleware вида (req,res,next)=>{...; next();}
  };
  await next();
}

function toResponse(state) {
  return new Response(state.body ?? null, { status: state.status, headers: state.headers });
}

// Регистрирует роутер в приложении Hono под указанным префиксом.
export function mount(app, basePath, router, { onError } = {}) {
  for (const route of router.__routes) {
    const full = (basePath + route.path).replace(/\/+$/, '') || '/';
    app.on(route.method, full, async (c) => {
      let built;
      try {
        built = await buildReqRes(c);
      } catch (e) {
        const status = e.status || 400;
        return c.json({ error: status === 413 ? 'Файл слишком большой' : 'Некорректный запрос' }, status);
      }
      const { req, res, state } = built;
      req.ctx = c;          // доступ к биндингам Workers из обработчика
      req.env = c.env;
      try {
        await runChain([...router.__layers, ...route.handlers], req, res);
        if (!state.sent && state.status === 200) state.status = 404;
        return toResponse(state);
      } catch (e) {
        if (onError) return onError(e, c);
        throw e;
      }
    });
  }
  return app;
}
