import 'dotenv/config';   // load .env for local dev only
import app from './app.js';

// Последний рубеж: не дать одной необработанной ошибке (битый коннект к БД,
// зависшая отправка письма и т.п.) уронить весь процесс и оборвать ВСЕ запросы
// с "network connection was lost". Логируем и продолжаем жить.
process.on('unhandledRejection', (reason) => {
  console.error('[proc] unhandledRejection (процесс продолжает работу):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[proc] uncaughtException (процесс продолжает работу):', err);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[api] http://localhost:${PORT}`));
