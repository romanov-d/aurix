# aurix на Cloudflare Workers

## Где что живёт

- **Worker `aurix`** — весь бэкенд и раздача статики. Аккаунт Cloudflare `romanov.nuage@gmail.com`.
- **Домен** `aurixmotors.ru` и `www` — привязаны как custom domain, DNS ведёт Cloudflare.
- **База** — Neon, проект `neon-cinnabar-feather` (`gentle-violet-17985768`), регион Frankfurt.
  Драйвер HTTP (`@neondatabase/serverless`), сырые TCP-сокеты на Workers недоступны.
- **Сканы документов** — R2-бакет `aurix-docs` (превью: `aurix-docs-preview`), файлы зашифрованы
  AES-256-GCM, ключ в секрете `DOCS_ENCRYPTION_KEY`.
- **Статика** — Workers Assets из `public_build/`: сайт в корне, админка в `/admin`.

## Выкатка

```bash
npm test          # 62 теста, гоняются в двух средах
npm run deploy    # собрать обе сборки и выкатить
```

`npm run deploy` = `build` (vite сайта + vite админки + сборка `public_build`) и `wrangler deploy`.

## Секреты

Задаются один раз через `wrangler secret put <ИМЯ>` и в репозиторий не попадают:

| Секрет | Зачем |
|---|---|
| `DATABASE_URL` | строка подключения к Neon |
| `JWT_SECRET` | подпись сессионных токенов |
| `DOCS_ENCRYPTION_KEY` | 32 байта base64; **потеря = потеря всех документов** |
| `ADMIN_SEED_PASSWORD` | пароль встроенного админа при создании с нуля |
| `RESEND_API_KEY` | отправка писем |

Не секретные значения (`SITE_URL`, `EMAIL_FROM`, `CONTACT_EMAIL`) лежат в `wrangler.jsonc`.

## Тесты

Два набора, оба запускаются `npm test`:

- **node** — интеграционные поверх PGlite (настоящий Postgres в WASM). Выполняется тот же SQL,
  что и в проде, вместе со схемой, сидами и EXCLUDE-констрейнтом против двойной брони.
- **worker** — в реальном рантайме Workers: Web Crypto, биндинг R2, раздача статики, редирект на https.

## Что важно помнить

**Схема версионируется.** В `worker/db.js` есть `SCHEMA_VERSION`. При холодном старте Worker
делает один `SELECT` отметки и, если версия совпала, пропускает всю инициализацию. **Любое
изменение схемы или сидов требует поднять эту константу**, иначе правки не доедут до базы.
Первый запрос после смены версии медленный (прогон ~90 операторов), дальше доли секунды.

**Таймеры на уровне модуля запрещены.** `setInterval`/`setTimeout` в глобальной области
Workers отвергает при деплое. Это проверяется тестом `test/node/no-global-timers.test.js`.

**Все запросы идут через Worker** (`run_worker_first: true`) — иначе общие правила вроде
редиректа на https не применяются к существующим файлам, которые платформа отдаёт раньше.

**SSE нет.** Чат работает опросом `/chat/threads/:id/messages?after=<id>` раз в 5 секунд:
долгих соединений на Workers нет, для них нужны Durable Objects.

## Бэкапы

Neon держит историю изменений (point-in-time recovery) в пределах тарифа — отдельный дамп
всё равно стоит снимать: `pg_dump "$DATABASE_URL" > aurix-$(date +%F).sql`.
