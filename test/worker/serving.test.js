import { env, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

// Проверяем Worker целиком через SELF: запрос идёт тем же путём, что в проде —
// через маршрутизацию ассетов и наш обработчик.
describe('раздача сайта и API', () => {
  it('health отвечает без базы', async () => {
    const res = await SELF.fetch('https://example.com/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.runtime).toBe('workers');
  });

  it('главная отдаётся статикой', async () => {
    const res = await SELF.fetch('https://example.com/');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<!doctype html');
  });

  it('маршрут SPA отдаёт index.html, а не 404', async () => {
    const res = await SELF.fetch('https://example.com/catalog');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('админка отдаёт свой index.html', async () => {
    const res = await SELF.fetch('https://example.com/admin/');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('/admin/assets/');
  });

  it('внутренний маршрут админки тоже отдаёт её index.html', async () => {
    const res = await SELF.fetch('https://example.com/admin/bookings');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('/admin/assets/');
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('отсутствующий ассет — честный 404, а не подмена на HTML', async () => {
    const res = await SELF.fetch('https://example.com/assets/нет-такого-чанка.js');
    expect(res.status).toBe(404);
  });

  it('отсутствующий файл вне /assets тоже 404, а не HTML', async () => {
    // Шрифт или иконка, которых нет, должны честно отдавать 404: подмена на
    // index.html маскирует битую ссылку и ломает загрузку ресурса молча.
    for (const p of ['/icons/Phosphor.svg', '/fonts/нет-такого.woff2', '/cars/нет.webp']) {
      const res = await SELF.fetch('https://example.com' + p);
      expect(res.status, p).toBe(404);
    }
  });

  it('маршрут без расширения по-прежнему отдаёт одностраничку', async () => {
    const res = await SELF.fetch('https://example.com/catalog/porsche');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('неизвестный /api отдаёт JSON, а не страницу', async () => {
    const res = await SELF.fetch('https://example.com/api/нет-такого');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });

  it('sitemap собирается даже без базы', async () => {
    const res = await SELF.fetch('https://example.com/sitemap.xml');
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('/photo');
  });
});

describe('принудительный HTTPS', () => {
  it('http отвечает редиректом, а не страницей', async () => {
    const res = await SELF.fetch('http://example.com/catalog', { redirect: 'manual' });
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://example.com/catalog');
  });

  it('https отдаёт страницу как обычно', async () => {
    const res = await SELF.fetch('https://example.com/catalog');
    expect(res.status).toBe(200);
  });
});
