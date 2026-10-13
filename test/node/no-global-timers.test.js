import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Регрессионный тест под конкретную ошибку: setInterval/setTimeout в глобальной
// области модуля. Node такое проглатывает, тесты проходят, а деплой на Workers
// падает с «Disallowed operation called within global scope». Поймали этим на
// первом же деплое — пусть дальше ловит тест.
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.js') ? [full] : [];
  });
}

describe('код пригоден для глобальной области Workers', () => {
  it('ни один модуль не заводит таймер при импорте', () => {
    const offenders = [];
    for (const file of walk('worker')) {
      for (const [i, line] of readFileSync(file, 'utf8').split('\n').entries()) {
        const code = line.replace(/\/\/.*$/, '');
        // Таймер на уровне модуля = строка начинается без отступа
        if (/^(setInterval|setTimeout)\s*\(/.test(code)) offenders.push(`${file}:${i + 1}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
