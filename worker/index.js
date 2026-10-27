// Точка входа Cloudflare Worker.
//
// Как устроено:
//  • статику (dist сайта и admin/dist) отдаёт платформа через биндинг ASSETS —
//    Worker её не трогает, кроме SPA-фолбэка для /admin/*;
//  • /api/* обслуживают прежние роуты проекта через слой совместимости
//    compat.js — сами файлы роутов остались в стиле Express;
//  • окружение (секреты, R2) приходит в каждый запрос и прокидывается в слои
//    db и docs-storage: глобального состояния между запросами на Workers нет.

import { Hono } from 'hono';
import { mount } from './compat.js';
import { configureDb, many } from './db.js';
import { configureStorage } from './docs-storage.js';
import { loadUser } from './middleware/auth.js';

import carsRouter from './routes/cars.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import bookingsRouter from './routes/bookings.js';
import adminRouter from './routes/admin.js';
import contactRouter from './routes/contact.js';
import faqRouter from './routes/faq.js';
import blogRouter from './routes/blog.js';
import contentRouter from './routes/content.js';
import { clientRouter as chatRouter, adminRouter as chatAdminRouter } from './routes/chat.js';

const app = new Hono();

// Принудительный HTTPS. Без этого адрес, введённый без схемы, открывается по
// http и браузер показывает «Not Secure»: сертификат при этом в порядке, просто
// соединение незашифровано. Делаем редирект здесь, а не настройкой в панели, —
// так поведение описано в коде и переезжает вместе с ним.
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  if (url.protocol === 'http:') {
    url.protocol = 'https:';
    return c.redirect(url.toString(), 301);
  }
  await next();
});

// Каждый запрос начинается с настройки слоёв под текущее окружение Worker'а.
app.use('*', async (c, next) => {
  // c.env.__dbDriver — шов для тестов: туда подставляется PGlite (настоящий
  // Postgres в WASM), чтобы интеграционные тесты гоняли тот же SQL, что и прод.
  // В реальном окружении этого поля нет и берётся Neon по DATABASE_URL.
  configureDb(c.env, c.env.__dbDriver);
  configureStorage(c.env);
  await next();
});

// Health отвечает, не трогая базу: так видно, что Worker жив, даже когда
// Postgres недоступен.
app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString(), runtime: 'workers' }));

// Единый обработчик ошибок роутов: наружу не отдаём внутренности Postgres.
function onError(err, c) {
  console.error(JSON.stringify({
    level: 'error', msg: 'api error', path: new URL(c.req.url).pathname,
    error: String(err && err.message || err),
  }));
  const dev = c.env.NODE_ENV === 'development';
  return c.json({ error: dev ? (err.message || 'Internal error') : 'Внутренняя ошибка сервера' }, err.status || 500);
}

// loadUser должен отработать до всех роутов — вшиваем его первым слоем
// в каждый роутер, как это делал app.use(loadUser) в Express.
const withUser = (router) => { router.__layers.unshift(loadUser); return router; };

// Порядок важен: /api/admin/chat объявляется ДО /api/admin, иначе общий
// админский роутер перехватит чат.
mount(app, '/api/cars', withUser(carsRouter), { onError });
mount(app, '/api/auth', withUser(authRouter), { onError });
mount(app, '/api/me', withUser(meRouter), { onError });
mount(app, '/api/bookings', withUser(bookingsRouter), { onError });
mount(app, '/api/chat', withUser(chatRouter), { onError });
mount(app, '/api/admin/chat', withUser(chatAdminRouter), { onError });
mount(app, '/api/admin', withUser(adminRouter), { onError });
mount(app, '/api/contact', withUser(contactRouter), { onError });
mount(app, '/api/faq', withUser(faqRouter), { onError });
mount(app, '/api/blog', withUser(blogRouter), { onError });
mount(app, '/api/content', withUser(contentRouter), { onError });

// SEO: sitemap собирается из базы — статические страницы, опубликованные
// авто и статьи блога. robots.txt лежит в статике.
app.get('/sitemap.xml', async (c) => {
  const base = c.env.SITE_URL || 'https://aurixmotors.ru';
  const paths = ['/', '/catalog', '/long-term', '/tariffs', '/photo', '/club',
    '/rent-out', '/terms', '/privacy', '/consent', '/cookies', '/requisites', '/blog', '/contacts'];
  const urls = paths.map((p) => base + p);
  try {
    const cars = await many(`SELECT id FROM cars WHERE status = 'published'`);
    urls.push(...cars.map((r) => `${base}/car/${r.id}`));
    const posts = await many(`SELECT slug FROM blog_posts WHERE published = true`);
    urls.push(...posts.map((r) => `${base}/blog/${r.slug}`));
  } catch (e) {
    console.warn('[sitemap] база недоступна, отдаю только статические страницы:', e.message);
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')
    + `\n</urlset>\n`;
  return c.body(body, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

// Неизвестный /api — честный 404 JSON, а не HTML страницы
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

// Раздача статики и SPA-фолбэк.
//
// Ассеты отдают только существующие файлы (not_found_handling: none), поэтому
// всё, что до сюда дошло, — либо реальный файл, либо клиентский маршрут одной
// из двух одностраничек. Отсутствующий ассет НЕ подменяем на index.html: иначе
// браузер получит HTML вместо JS и упадёт с «Importing a module script failed».
app.all('*', async (c) => {
  const url = new URL(c.req.url);
  const direct = await c.env.ASSETS.fetch(new Request(url, c.req.raw));
  if (direct.status !== 404) return direct;

  // Любой путь с расширением — это запрос файла, а не маршрут одностраничке.
  // Подменять его на index.html нельзя: браузер получит HTML вместо шрифта или
  // скрипта и либо молча его отбросит, либо упадёт с «Importing a module script
  // failed». Раньше правило распространялось только на /assets/, из-за чего
  // отсутствующий файл в /icons/ или /fonts/ отвечал 200 с разметкой.
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return direct;
  const isAdmin = url.pathname === '/admin' || url.pathname.startsWith('/admin/');
  const indexPath = isAdmin ? '/admin/index.html' : '/index.html';

  const res = await c.env.ASSETS.fetch(new Request(new URL(indexPath, url.origin), {
    headers: c.req.raw.headers,
  }));
  // index.html не кэшируем: он всегда должен ссылаться на актуальные чанки,
  // иначе после выкатки старый index тянет несуществующие хеши.
  const headers = new Headers(res.headers);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  return new Response(res.body, { status: res.status, headers });
});

export default app;
