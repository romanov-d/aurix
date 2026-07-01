import React from 'react';

// Ошибка загрузки ленивого чанка (после деплоя сменились хеши / сетевой сбой).
// Тогда лучше не показывать «Что-то пошло не так», а один раз перезагрузиться —
// свежий index.html подтянет актуальные чанки.
export function isChunkLoadError(err) {
  const msg = String(err?.message || err || '');
  return /dynamically imported module|importing a module script|error loading dynamically|ChunkLoadError|Failed to fetch/i.test(msg);
}

// Перезагрузить страницу максимум раз в 10 сек (защита от бесконечного цикла).
export function reloadOnce() {
  try {
    const KEY = 'chunk-reload-ts';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
      return true;
    }
  } catch { /* sessionStorage недоступен */ }
  return false;
}

// Ловит ошибки рендера в поддереве. Без него ЛЮБОЙ краш одного компонента
// (например, WebGL-шейдера на мобильном Safari) сносит весь React и оставляет
// белый экран без единого сообщения. Два режима использования:
//   <ErrorBoundary fallback={null}>…</ErrorBoundary>  — тихо убрать упавший блок
//   <ErrorBoundary>…</ErrorBoundary>                    — показать текст ошибки
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Ленивый чанк не подгрузился (деплой сменил хеши / сеть моргнула) —
    // тихо перезагружаемся один раз вместо экрана ошибки.
    if (isChunkLoadError(error) && reloadOnce()) return;
    this.setState({ info });
    console.error('[ErrorBoundary]', this.props.name || '', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      // fallback может быть null (тихо скрыть) или своим JSX
      if ('fallback' in this.props) return this.props.fallback;
      // Ошибка загрузки чанка (авто-reload не сработал из-за защиты от цикла) —
      // предлагаем обновить страницу, а не пугаем стеком.
      if (isChunkLoadError(this.state.error)) {
        return (
          <div style={{ padding: 24, color: '#eee', fontFamily: 'system-ui, sans-serif', maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
            <h2 style={{ color: '#E7C063' }}>Обновите страницу</h2>
            <p style={{ color: '#aaa' }}>Вышло обновление сайта. Нажмите, чтобы загрузить свежую версию.</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: 12, background: '#E7C063', color: '#1a1407', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Обновить</button>
          </div>
        );
      }
      // ВАЖНО: Safari в error.stack НЕ включает текст ошибки (в отличие от
      // Chrome). Поэтому показываем name+message ОТДЕЛЬНО и ПЕРВЫМИ — иначе на
      // iOS видны только безымянные кадры React и причину не понять. Ниже —
      // componentStack (какой компонент упал) и сырой stack.
      const err = this.state.error;
      const head = `${err?.name || 'Error'}: ${err?.message || String(err)}`;
      return (
        <div style={{ padding: 24, color: '#eee', fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '40px auto' }}>
          <h2 style={{ color: '#E7C063' }}>Что-то пошло не так</h2>
          <p style={{ color: '#aaa' }}>Страница не смогла отрисоваться. Причина:</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ffd27a', background: '#1a1a1a', padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600, overflowX: 'auto' }}>{head}</pre>
          {this.state.info?.componentStack && (
            <pre style={{ whiteSpace: 'pre-wrap', color: '#9ecbff', background: '#141414', padding: 12, borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>{this.state.info.componentStack}</pre>
          )}
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff8a8a', background: '#1a1a1a', padding: 12, borderRadius: 8, fontSize: 11, overflowX: 'auto' }}>{String(err?.stack || '')}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
