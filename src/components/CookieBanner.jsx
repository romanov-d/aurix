import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Баннер согласия на cookie. Ключевое: до явного согласия НЕ загружаются ни
// Яндекс.Метрика, ни онлайн-консультант — раньше оба стартовали сразу из
// index.html, то есть аналитика и сторонний скрипт получали данные посетителя
// без спроса. Теперь их подключает этот компонент и только после «Принять все».

const STORAGE_KEY = 'aurix-cookie-consent'; // 'all' | 'necessary'
const OPEN_EVENT = 'aurix:open-cookie-settings';

const YM_ID = 111101844;
const SALEBOT_GUID = '21ec42b990aa10366a5b3b81480e78';

export function getCookieConsent() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

// Вызывается со страницы «Политика cookie», чтобы человек мог передумать.
export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

// ── Подключение сторонних скриптов (строго после согласия) ──

let analyticsLoaded = false;
function loadAnalytics() {
  if (analyticsLoaded || typeof window === 'undefined') return;
  analyticsLoaded = true;
  const src = `https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}`;
  if ([...document.scripts].some((s) => s.src === src)) return;

  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = 1 * new Date();
  const s = document.createElement('script');
  s.async = 1;
  s.src = src;
  document.head.appendChild(s);

  // trackFormFields отключён, поля с персональными данными дополнительно
  // помечены классом ym-hide-content — в записи Вебвизора их содержимое не попадает.
  window.ym(YM_ID, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    trackFormFields: false,
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
}

let chatLoaded = false;
function loadChat() {
  if (chatLoaded || typeof window === 'undefined') return;
  chatLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://salebot.pro/js/chatbot.js?v=1';
  s.charset = 'utf-8';
  s.onload = () => { if (window.ChatBotPro) window.ChatBotPro.init({ guid: SALEBOT_GUID }); };
  document.body.appendChild(s);
}

function applyConsent(choice) {
  if (choice !== 'all') return;
  loadAnalytics();
  // Чат тяжёлый — не задерживаем отрисовку страницы
  setTimeout(loadChat, 1500);
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = getCookieConsent();
    if (saved) applyConsent(saved);
    else setVisible(true);

    const reopen = () => setVisible(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  const decide = (choice) => {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch { /* приватный режим — решение не запомнится */ }
    setVisible(false);
    applyConsent(choice);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Использование файлов cookie">
      <div className="cookie-banner-inner">
        <div className="cookie-banner-text">
          <b>Мы используем файлы cookie</b>
          <p>
            Необходимые нужны для работы сайта и входа в личный кабинет. Аналитические помогают понять,
            как им пользуются, — они подключаются только с вашего согласия. Подробнее в{' '}
            <Link to="/cookies">Политике cookie</Link> и{' '}
            <Link to="/privacy">Политике обработки персональных данных</Link>.
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button type="button" className="btn btn-sm" onClick={() => decide('necessary')}>
            Только необходимые
          </button>
          <button type="button" className="btn btn-sm btn-filled" onClick={() => decide('all')}>
            Принять все
          </button>
        </div>
      </div>
    </div>
  );
}
