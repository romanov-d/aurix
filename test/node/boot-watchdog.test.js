import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Регрессия под жалобу 27.10: клиент видел бесконечную загрузку. Предохранитель
// в index.html перезагружал страницу через 10 секунд, если React ещё не
// смонтировался, — а на плохом маршруте приложение просто не успевало. Каждая
// перезагрузка обнуляла скачанное, и сайт не открывался никогда.
describe('предохранитель загрузки', () => {
  const html = readFileSync('index.html', 'utf8');

  it('не перезагружает страницу по одному лишь таймеру', () => {
    // Перезагрузка допустима только после проверки, что входной чанк недоступен
    const reloadCalls = (html.match(/location\.reload\(\)/g) || []).length;
    expect(reloadCalls).toBeGreaterThan(0);
    expect(html).toContain('retryOnce');
    // Решение принимается по факту недоступности чанка, а не по истечении времени
    expect(html).toMatch(/fetch\(url, \{ method: 'HEAD'/);
  });

  it('ловит настоящую ошибку загрузки входного скрипта', () => {
    expect(html).toContain("addEventListener('error'");
    expect(html).toContain('scriptFailed');
  });

  it('начинает отсчёт только после полной загрузки страницы', () => {
    expect(html).toMatch(/addEventListener\('load'[\s\S]{0,80}setTimeout\(check/);
  });

  it('даёт на загрузку заметно больше прежних 10 секунд', () => {
    const delays = [...html.matchAll(/setTimeout\((?:check|function[^,]*),\s*(\d+)\)/g)]
      .map((m) => Number(m[1]));
    expect(delays.length).toBeGreaterThan(0);
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(8000);
  });
});
