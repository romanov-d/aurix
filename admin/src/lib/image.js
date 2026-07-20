// Клиентское сжатие изображений перед загрузкой (base64 в БД).
// Фото с айфона бывают 4–8 МБ — ужимаем в canvas до разумного размера,
// чтобы влезали в лимит запроса и быстро грузились. PDF и не-картинки
// отдаём как есть через FileReader.

function readAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = dataUrl;
  });
}

/**
 * Возвращает data URL. Для картинок — сжатая JPEG-версия (если это уменьшает размер),
 * для остального (PDF и т.п.) — исходный файл как есть.
 * @param {File} file
 * @param {{maxSize?: number, quality?: number}} [opts] maxSize — макс. сторона в px.
 */
export async function fileToCompressedDataUrl(file, opts = {}) {
  const { maxSize = 1920, quality = 0.82 } = opts;
  const raw = await readAsDataUrl(file);
  // Не картинка (PDF и пр.) или не поддерживается сжатие — отдаём оригинал.
  if (!file.type || !file.type.startsWith('image/') || file.type === 'image/gif') {
    return raw;
  }
  try {
    const img = await loadImage(raw);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL('image/jpeg', quality);
    // Если вдруг сжатая версия оказалась больше оригинала — берём меньшую.
    return out.length < raw.length ? out : raw;
  } catch {
    return raw; // при любой ошибке canvas — исходник
  }
}

// Приблизительный размер data URL в байтах (base64 → бинарь).
export function dataUrlBytes(dataUrl) {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}
