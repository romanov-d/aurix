import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Регрессия под конкретную жалобу (27.10): клиент из Владимирской области не мог
// открыть сайт. Трафик шёл через Гонконг, а в разметке висели четыре
// render-blocking стиля с чужих доменов — fonts.googleapis.com и unpkg.com.
// Браузер не рисует страницу, пока они не ответят; в России оба отдаются плохо,
// и человек видит белый экран. Шрифты и иконки перенесены на свой домен.
describe('нет внешних блокирующих ресурсов', () => {
  const pages = ['index.html', 'admin/index.html'];

  for (const page of pages) {
    it(`${page}: стили и шрифты только со своего домена`, () => {
      const html = readFileSync(page, 'utf8');
      const links = html.match(/<link[^>]+>/g) || [];
      const external = links.filter((l) => /rel="?stylesheet/.test(l) && /href="https?:\/\//.test(l));
      expect(external).toEqual([]);
    });

    it(`${page}: нет обращений к шрифтовым и CDN-доменам`, () => {
      const html = readFileSync(page, 'utf8');
      // Комментарии вычищаем: в них эти домены упоминаются как объяснение
      const code = html.replace(/<!--[\s\S]*?-->/g, '');
      for (const host of ['fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com', 'cdn.jsdelivr.net']) {
        expect(code).not.toContain(host);
      }
    });
  }
});
