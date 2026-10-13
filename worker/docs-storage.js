// Хранилище сканов документов на Cloudflare R2.
//
// Было: файлы на диске VPS, шифрование через node:crypto. На Workers нет ни
// диска, ни node:crypto-пула — переезжаем на R2 и Web Crypto. Формат файла
// намеренно СОХРАНЁН байт в байт: [IV 12][тег 16][шифротекст]. Это значит,
// что файлы, зашифрованные прежней версией, читаются новой и наоборот —
// важно, если когда-нибудь всплывёт старый бэкап.
//
// Внимание на нюанс: Node отдаёт тег отдельно (getAuthTag), а Web Crypto
// дописывает его В КОНЕЦ шифротекста. Поэтому при шифровании тег переносим
// в начало, при расшифровке — обратно в конец. Без этого форматы разъехались бы.

const IV_LEN = 12;
const TAG_LEN = 16;

export const DOC_KINDS = ['passport', 'registration', 'license_front', 'license_back'];

export const DOC_LABELS = {
  passport: 'Паспорт — основной разворот',
  registration: 'Паспорт — прописка',
  license_front: 'Права — лицевая сторона',
  license_back: 'Права — оборотная сторона',
};

// Историческое поле passport_page_url хранит ОБОРОТНУЮ сторону прав
export const LEGACY_COLUMN_TO_KIND = {
  passport_url: 'passport',
  registration_url: 'registration',
  license_url: 'license_front',
  passport_page_url: 'license_back',
};

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_DOC_BYTES = 8 * 1024 * 1024;

let _bucket = null;
let _keyRaw = null;
let _keyPromise = null;

// Вызывается на каждый запрос из worker/index.js: биндинг R2 и ключ живут
// в env, а не в глобальной области — глобальное состояние между запросами
// на Workers держать нельзя.
export function configureStorage(env) {
  _bucket = env?.DOCS || null;
  if (_keyRaw !== (env?.DOCS_ENCRYPTION_KEY || null)) {
    _keyRaw = env?.DOCS_ENCRYPTION_KEY || null;
    _keyPromise = null;
  }
}

function keyBytes() {
  if (!_keyRaw) return null;
  let bin;
  try { bin = atob(_keyRaw); } catch { return null; }
  if (bin.length !== 32) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function storageReady() {
  return !!_bucket && keyBytes() !== null;
}

async function cryptoKey() {
  const raw = keyBytes();
  if (!raw) throw new Error('DOCS_ENCRYPTION_KEY не задан');
  if (!_keyPromise) {
    _keyPromise = crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }
  return _keyPromise;
}

// data:image/png;base64,AAA... → { mime, bytes }
export function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return { error: 'Файл не передан' };
  const m = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/s.exec(dataUrl.trim());
  if (!m) return { error: 'Неподдерживаемый формат файла' };
  const mime = m[1].toLowerCase();
  if (!ALLOWED_MIME.includes(mime)) return { error: 'Допустимы только JPEG, PNG, WebP или PDF' };
  let bin;
  try { bin = atob(m[2]); } catch { return { error: 'Файл повреждён' }; }
  if (!bin.length) return { error: 'Файл пустой' };
  if (bin.length > MAX_DOC_BYTES) return { error: 'Файл больше 8 МБ' };
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  // Имя поля buffer сохранено: так его ждёт код миграции и роуты
  return { mime, buffer: bytes };
}

export async function encryptBuffer(plain) {
  const key = await cryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  // Web Crypto положил тег в конец — переносим в начало, в формат проекта
  const cipher = sealed.subarray(0, sealed.length - TAG_LEN);
  const tag = sealed.subarray(sealed.length - TAG_LEN);
  const out = new Uint8Array(IV_LEN + TAG_LEN + cipher.length);
  out.set(iv, 0);
  out.set(tag, IV_LEN);
  out.set(cipher, IV_LEN + TAG_LEN);
  return out;
}

export async function decryptBuffer(blob) {
  const key = await cryptoKey();
  const data = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
  if (data.length <= IV_LEN + TAG_LEN) throw new Error('Файл документа повреждён');
  const iv = data.subarray(0, IV_LEN);
  const tag = data.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const cipher = data.subarray(IV_LEN + TAG_LEN);
  // Собираем обратно в порядке, который ждёт Web Crypto: шифротекст + тег
  const sealed = new Uint8Array(cipher.length + TAG_LEN);
  sealed.set(cipher, 0);
  sealed.set(tag, cipher.length);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, sealed));
}

function newFilename() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('') + '.enc';
}

async function sha256Hex(bytes) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...d].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function saveEncrypted(plainBuffer) {
  if (!_bucket) throw new Error('R2-биндинг DOCS недоступен');
  const filename = newFilename();
  await _bucket.put(filename, await encryptBuffer(plainBuffer));

  // Та же страховка, что была на диске: читаем обратно и сверяем побайтово.
  // Только после этого вызывающий код вправе считать сохранение успешным
  // (миграция на этом основании стирает исходник из базы).
  const back = await readDecrypted(filename);
  if (back.length !== plainBuffer.length || !back.every((v, i) => v === plainBuffer[i])) {
    await removeFile(filename);
    throw new Error('Проверка после записи не прошла — файл не сохранён');
  }
  return { filename, bytes: plainBuffer.length, sha256: await sha256Hex(plainBuffer) };
}

export async function readDecrypted(filename) {
  if (!_bucket) throw new Error('R2-биндинг DOCS недоступен');
  const safe = String(filename || '').split('/').pop();
  if (!safe || !safe.endsWith('.enc')) throw new Error('Некорректное имя файла');
  const obj = await _bucket.get(safe);
  if (!obj) throw new Error('Файл документа не найден');
  return decryptBuffer(new Uint8Array(await obj.arrayBuffer()));
}

export async function removeFile(filename) {
  if (!filename || !_bucket) return;
  const safe = String(filename).split('/').pop();
  if (!safe.endsWith('.enc')) return;
  await _bucket.delete(safe).catch(() => {});
}
