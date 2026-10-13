import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureStorage, storageReady, saveEncrypted, readDecrypted, removeFile,
  encryptBuffer, decryptBuffer, parseDataUrl, DOC_KINDS, LEGACY_COLUMN_TO_KIND,
} from '../../worker/docs-storage.js';

// Ключ генерим на лету: в тестах настоящий секрет не нужен и не должен попадать в репозиторий
const KEY = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const testEnv = () => ({ ...env, DOCS_ENCRYPTION_KEY: KEY });
const bytes = (s) => new TextEncoder().encode(s);

describe('хранилище документов на R2', () => {
  beforeEach(() => configureStorage(testEnv()));

  it('готово, когда есть и бакет, и корректный ключ', () => {
    expect(storageReady()).toBe(true);
    configureStorage({ ...env, DOCS_ENCRYPTION_KEY: undefined });
    expect(storageReady()).toBe(false);
    configureStorage({ ...env, DOCS_ENCRYPTION_KEY: btoa('too-short-key') });
    expect(storageReady()).toBe(false);
  });

  it('шифрует и расшифровывает без потерь', async () => {
    const plain = bytes('скан паспорта'.repeat(100));
    const back = await decryptBuffer(await encryptBuffer(plain));
    expect(back).toEqual(plain);
  });

  it('сохраняет формат [IV 12][тег 16][шифротекст]', async () => {
    const plain = bytes('abc');
    const blob = await encryptBuffer(plain);
    expect(blob.length).toBe(12 + 16 + plain.length);
  });

  it('на диске лежит шифротекст, а не исходник', async () => {
    const plain = bytes('секретные данные паспорта');
    const { filename } = await saveEncrypted(plain);
    const stored = new Uint8Array(await (await env.DOCS.get(filename)).arrayBuffer());
    expect(stored).not.toEqual(plain);
    expect(new TextDecoder().decode(stored)).not.toContain('паспорт');
    await removeFile(filename);
  });

  it('подделанный файл отвергается, а не отдаёт мусор', async () => {
    const { filename } = await saveEncrypted(bytes('важный документ'));
    const blob = new Uint8Array(await (await env.DOCS.get(filename)).arrayBuffer());
    blob[blob.length - 1] ^= 0xff;
    await env.DOCS.put(filename, blob);
    await expect(readDecrypted(filename)).rejects.toThrow();
    await removeFile(filename);
  });

  it('возвращает размер и sha256 исходника, а не шифротекста', async () => {
    const plain = bytes('двенадцать!!');
    const saved = await saveEncrypted(plain);
    expect(saved.bytes).toBe(plain.length);
    expect(saved.sha256).toMatch(/^[0-9a-f]{64}$/);
    await removeFile(saved.filename);
  });

  it('читает только .enc и не выпускает за пределы бакета', async () => {
    await expect(readDecrypted('../../etc/passwd')).rejects.toThrow('Некорректное имя файла');
    await expect(readDecrypted('')).rejects.toThrow('Некорректное имя файла');
  });

  it('удаление чистит объект', async () => {
    const { filename } = await saveEncrypted(bytes('на удаление'));
    await removeFile(filename);
    expect(await env.DOCS.get(filename)).toBeNull();
  });

  describe('разбор data-url', () => {
    it('принимает разрешённые типы', () => {
      const r = parseDataUrl('data:image/png;base64,' + btoa('png-bytes'));
      expect(r.error).toBeUndefined();
      expect(r.mime).toBe('image/png');
    });
    it('отклоняет исполняемое и мусор', () => {
      expect(parseDataUrl('data:application/x-sh;base64,' + btoa('rm -rf /')).error).toMatch(/JPEG/);
      expect(parseDataUrl('не data-url').error).toBeTruthy();
      expect(parseDataUrl(null).error).toBeTruthy();
    });
    it('отклоняет файл больше 8 МБ', () => {
      const big = 'data:image/png;base64,' + btoa('x'.repeat(9 * 1024 * 1024));
      expect(parseDataUrl(big).error).toMatch(/8 МБ/);
    });
  });

  it('виды документов и карта старых колонок не разъехались', () => {
    expect(DOC_KINDS).toEqual(['passport', 'registration', 'license_front', 'license_back']);
    // passport_page_url исторически хранит оборот ПРАВ — частая ловушка
    expect(LEGACY_COLUMN_TO_KIND.passport_page_url).toBe('license_back');
    expect(Object.values(LEGACY_COLUMN_TO_KIND).sort()).toEqual([...DOC_KINDS].sort());
  });
});
