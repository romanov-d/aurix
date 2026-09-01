// Хранилище сканов документов (паспорт, права).
//
// Почему не в базе: раньше файлы лежали в users.*_url как base64. Это значит,
// что (а) любой дамп базы содержал паспорта открытым текстом, (б) loadUser
// тянул их на КАЖДЫЙ запрос, (в) список клиентов в админке выгружал сканы всех
// клиентов разом. Теперь файлы лежат на диске вне веб-корня, зашифрованные
// AES-256-GCM, а в базе только метаданные.
//
// Формат файла: [IV 12 байт][тег аутентификации 16 байт][шифротекст].
// GCM даёт не только шифрование, но и контроль целостности: подменённый или
// побитый файл не расшифруется, а не отдаст мусор.
//
// Ключ — DOCS_ENCRYPTION_KEY (32 байта в base64). Ключа нет — загрузка
// отклоняется с понятной ошибкой; молча складывать документы в открытом виде
// хуже, чем не принять файл.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

// Каталог вне /var/www — статикой его не раздать даже при ошибке в конфиге.
export const DOCS_DIR = process.env.DOCS_DIR || '/var/lib/aurix/docs';

// Канонические виды документов. Историческое поле passport_page_url на самом
// деле хранит ОБОРОТНУЮ сторону прав — при переносе учитываем это.
export const DOC_KINDS = ['passport', 'registration', 'license_front', 'license_back'];

export const DOC_LABELS = {
  passport: 'Паспорт — основной разворот',
  registration: 'Паспорт — прописка',
  license_front: 'Права — лицевая сторона',
  license_back: 'Права — оборотная сторона',
};

// Соответствие старых колонок новым видам (для миграции и совместимости)
export const LEGACY_COLUMN_TO_KIND = {
  passport_url: 'passport',
  registration_url: 'registration',
  license_url: 'license_front',
  passport_page_url: 'license_back',
};

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_DOC_BYTES = 8 * 1024 * 1024;

function getKey() {
  const raw = process.env.DOCS_ENCRYPTION_KEY;
  if (!raw) return null;
  let key;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    return null;
  }
  if (key.length !== 32) return null;
  return key;
}

export function storageReady() {
  return getKey() !== null;
}

// data:image/png;base64,AAA... → { mime, buffer }
export function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return { error: 'Файл не передан' };
  const m = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/s.exec(dataUrl.trim());
  if (!m) return { error: 'Неподдерживаемый формат файла' };
  const mime = m[1].toLowerCase();
  if (!ALLOWED_MIME.includes(mime)) {
    return { error: 'Допустимы только JPEG, PNG, WebP или PDF' };
  }
  let buffer;
  try {
    buffer = Buffer.from(m[2], 'base64');
  } catch {
    return { error: 'Файл повреждён' };
  }
  if (!buffer.length) return { error: 'Файл пустой' };
  if (buffer.length > MAX_DOC_BYTES) return { error: 'Файл больше 8 МБ' };
  return { mime, buffer };
}

export function encryptBuffer(plain) {
  const key = getKey();
  if (!key) throw new Error('DOCS_ENCRYPTION_KEY не задан');
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

export function decryptBuffer(blob) {
  const key = getKey();
  if (!key) throw new Error('DOCS_ENCRYPTION_KEY не задан');
  if (blob.length <= IV_LEN + TAG_LEN) throw new Error('Файл документа повреждён');
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(IV_LEN + TAG_LEN)), decipher.final()]);
}

async function ensureDir() {
  // 0700: читать может только пользователь, от которого работает Node
  await fs.mkdir(DOCS_DIR, { recursive: true, mode: 0o700 });
}

// Имя файла случайное: по нему нельзя понять, чей это документ и какой.
function newFilename() {
  return `${crypto.randomBytes(24).toString('hex')}.enc`;
}

export async function saveEncrypted(plainBuffer) {
  await ensureDir();
  const filename = newFilename();
  const full = path.join(DOCS_DIR, filename);
  await fs.writeFile(full, encryptBuffer(plainBuffer), { mode: 0o600 });

  // Сразу читаем обратно и сверяем: файл должен расшифровываться и совпадать
  // побайтово. Только после этого вызывающий код вправе считать сохранение
  // успешным (и, например, стереть исходник при миграции).
  const back = decryptBuffer(await fs.readFile(full));
  if (!back.equals(plainBuffer)) {
    await fs.unlink(full).catch(() => {});
    throw new Error('Проверка после записи не прошла — файл не сохранён');
  }
  return {
    filename,
    bytes: plainBuffer.length,
    sha256: crypto.createHash('sha256').update(plainBuffer).digest('hex'),
  };
}

export async function readDecrypted(filename) {
  // Имя пришло из базы, но всё равно не даём выйти за каталог
  const safe = path.basename(String(filename || ''));
  if (!safe || !safe.endsWith('.enc')) throw new Error('Некорректное имя файла');
  return decryptBuffer(await fs.readFile(path.join(DOCS_DIR, safe)));
}

export async function removeFile(filename) {
  if (!filename) return;
  const safe = path.basename(String(filename));
  if (!safe.endsWith('.enc')) return;
  await fs.unlink(path.join(DOCS_DIR, safe)).catch(() => {});
}
