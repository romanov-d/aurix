# Аудит безопасности и функционала — AURIX MOTORS

_Дата: 2026-07-22 · Метод: статический анализ кода (server/routes, middleware, db, frontend). Прод не мутировался, разрушающих тестов не проводилось, секреты в отчёт не выводились._

## Резюме

- **Функционал:** ~14 сценариев. **13 PASS** (по коду), **1 FAIL** — восстановление пароля не реализовано.
- **Топ-риски:**
  1. **HIGH** — Stored XSS через `attachment.url` в чате (`javascript:`-схема) → выполнение в контексте менеджера/админки.
  2. **MEDIUM** — Seed-админ `admin@aurix.local` с постоянно отключённой 2FA + обход rate-limit ротацией IP.
  3. **MEDIUM** — HTML-инъекция в письмо менеджеру + нет rate-limit/лимитов длины на `/api/contact`.
- **Хорошо:** SQL полностью параметризован (инъекций не найдено); `JWT_SECRET` обязателен в prod; bcrypt(10); httpOnly+SameSite=lax+secure куки; IDOR-проверки на месте; `admin123` из кода убран; сид не затирает правки CMS/автопарка; EXCLUDE-констрейнт против двойной брони; prod-ошибки не светят внутренности. **Утечки секретов в git-истории нет** (`.env.production` коммитился только с пустыми значениями).

## Таблица функционала

| Функция | Статус | Заметка |
|---|---|---|
| Регистрация → вход → выход | PASS | zod-валидация, bcrypt, JWT-cookie |
| 2FA-код на почту при входе | PASS* | *Тихо отключается, если `RESEND_API_KEY` не задан (`server/routes/auth.js:158`) |
| **Восстановление пароля** | **FAIL** | Эндпоинта нет; admin тоже не может сбросить пароль (нет поля в `patchUserSchema`). Забыл пароль = заблокирован |
| Ролевой роутинг user/admin | PASS | `src/pages/Login.jsx:23` |
| Верификация клиента (документы) | PASS | Блок правок после `is_verified` (`server/routes/me.js:22`) |
| Бронь только для верифицированных | PASS | `server/routes/bookings.js:29` |
| Каталог: фильтры/даты/busy/closed_until | PASS | параметризованные фильтры, `/:id/busy` без PII |
| Запрет двойной брони | PASS | проверка пересечения + EXCLUDE `bookings_no_overlap` (`server/db.js:432`) |
| Залоги: «на руках»/«к возврату»/статус | PASS | `GREATEST(0,…)` (`server/routes/admin.js:128`); `recomputeDepositStatus` клампит |
| Кнопка «Выдал остаток» | PASS | `server/routes/admin.js:354` |
| Откат возврата (done→planned) | PASS | клампится `[0,total]` (`server/routes/admin.js:331`) |
| Отмена/продление брони клиентом | PASS | owner-проверка + пересчёт (`server/routes/bookings.js:133`) |
| CMS: правки не затираются сидом | PASS | `seedContent` ON CONFLICT (`server/db.js:597`) |
| Загрузки (сжатие/лимиты) | PASS частично | клиентское сжатие есть, серверной проверки размера base64 нет |
| Контакт-форма (TG+email) | PASS | `Promise.allSettled` |

## Находки безопасности

### 1. [HIGH] Stored XSS через `attachment.url` в чате
**Где:** приём — `server/routes/chat.js:35–48` и `:148–160` (объект `attachment` из `req.body` сохраняется без валидации url/type/size); рендер — `admin/src/pages/chat/chat-page.jsx:169`, `admin/src/pages/lk/lk-page.jsx:485`, `src/components/ChatBox.jsx:131,135`.
**Сценарий:** авторизованный клиент шлёт сообщение с `attachment:{ name:"счёт.pdf", type:"application/pdf", url:"javascript:…" }`. Для не-image вложений фронт рендерит `<a href={m.attachment_url}>` — React не блокирует `javascript:`. Менеджер кликает «файл» → JS в origin админки.
**Влияние:** выполнение произвольных админ-запросов от имени менеджера.
**Фикс:** на сервере валидировать `attachment.url` (только `https://…` и `data:image/…`); отклонять `javascript:`/`data:text/html`. На фронте — проверять схему перед подстановкой в `href`.

### 2. [MEDIUM] Seed-админ без 2FA
**Где:** `server/routes/auth.js:19,158` (`skip2fa … || user.email === SEED_ADMIN_EMAIL`); rate-limit `server/routes/auth.js:14–15` (ключ `ip|email`).
**Сценарий:** у встроенного админа 2FA отключена всегда; login-лимит 10/5мин на пару IP+email обходится ротацией IP. Слабый `ADMIN_SEED_PASSWORD` → онлайн-брутфорс без второго фактора.
**Фикс:** не хардкодить пропуск 2FA по email; задать реальный ящик и включить код либо принудить длинный случайный `ADMIN_SEED_PASSWORD` + общий (per-account) счётчик попыток.

### 3. [MEDIUM] HTML-инъекция в письмо + нет лимитов на `/api/contact`
**Где:** `server/email.js:94–97` (`name/phone/car/message` без экранирования, в отличие от `server/telegram.js:9`); `server/routes/contact.js:7` (без `rateLimit`/zod); `server/app.js:22` (`limit:'12mb'`).
**Сценарий:** неавторизованный POST с HTML в `message` → произвольный HTML в ящике сотрудника; тело до 12 МБ без лимита → спам/email-бомба.
**Фикс:** экранировать поля (переиспользовать `esc`); `rateLimit` + zod-схема с `max()`.

### 4. [MEDIUM/LOW] Латентный Stored XSS в CMS-полях `type:'html'`
**Где:** `src/components/T.jsx:16–17` (`dangerouslySetInnerHTML` на публичном сайте); запись — только админ `server/routes/admin.js:20`.
**Сценарий:** сам по себе Low (пишет только админ), но при компрометации админа (#1/#2) — stored XSS на всех посетителей.
**Фикс:** серверная санитизация HTML (whitelist тегов); полноценный CSP.

### 5. [LOW] Base64-раздувание БД без серверного лимита
**Где:** `server/routes/chat.js:35`, `server/routes/me.js:40–44`, общий лимит `server/app.js:22` = 12 МБ.
**Фикс:** серверная проверка длины url/base64 (≤ 3–4 МБ) и типа.

### 6. [LOW] CSRF — только SameSite=lax, без проверки Origin
**Где:** `server/middleware/auth.js:11–17`. Базово достаточно, но нет defense-in-depth.
**Фикс:** проверка `Origin`/`Referer` на мутациях, либо CSRF-токен для критичных действий.

### 7. [INFO] Локальные `.env`/`.env.production`
Оба в `.gitignore`; исторически `.env.production` коммитился **с пустыми значениями** — утечки в git нет. На диске — старое Neon-окружение. Убедиться, что старый Neon-проект выведен из эксплуатации, а текущий prod `JWT_SECRET` **отличается** от любого старого (иначе форжинг токенов).

### Проверено и ОК
Параметризация SQL (динамические `SET` строятся из фиксированных zod-ключей, значения — плейсхолдеры) · IDOR (`me/*`, `bookings/:id`, `chat/threads/:id` скоупятся по `user_id`; `/admin/*` под `requireRole('admin')`) · отзывы только после завершённой аренды · пароли bcrypt(10) · падение без `JWT_SECRET` в prod · тексты чата/отзывов рендерятся как React-текст (экранированы).

## Быстрые победы (приоритет)
1. Валидация `attachment.url` в `chat.js` (белый список схем) — закрывает #1.
2. `esc()` в `sendContactRequestEmail` + `rateLimit`/zod на `/api/contact` — закрывает #3.
3. Убрать хардкод пропуска 2FA для seed-админа + сильный `ADMIN_SEED_PASSWORD` — закрывает #2.
4. Реализовать восстановление пароля (эндпоинт через email-код — механизм `issueCode`/`checkCode` уже есть) — закрывает единственный функциональный FAIL.

## На потом
- Серверная санитизация HTML для CMS + строгий CSP (подтвердить на nginx, что блокирует inline/`javascript:`).
- Серверные лимиты размера base64; долгосрочно — документы/вложения в объектное хранилище.
- Глобальный (по аккаунту) троттлинг логина.
- Сброс `email_verified` при смене email в `me PATCH` (`server/routes/me.js:33`).
