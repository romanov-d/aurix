import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

// Два набора тестов, каждый в своей среде — иначе честно не проверить:
//
//  node   — интеграционные тесты API поверх PGlite. Это настоящий Postgres,
//           собранный в WASM, поэтому выполняется ТОТ ЖЕ SQL, что и в проде:
//           схема, констрейнты, EXCLUDE против двойной брони. Заглушек нет.
//
//  worker — тесты в реальном рантайме Workers: Web Crypto, биндинг R2,
//           раздача статики. Это то, что в Node не воспроизвести.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/node/**/*.test.js'],
          testTimeout: 60000,
          hookTimeout: 120000,
        },
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
          }),
        ],
        test: {
          name: 'worker',
          include: ['test/worker/**/*.test.js'],
        },
      },
    ],
  },
});
