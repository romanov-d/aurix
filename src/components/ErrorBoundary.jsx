import React from 'react';

// Ловит ошибки рендера в поддереве. Без него ЛЮБОЙ краш одного компонента
// (например, WebGL-шейдера на мобильном Safari) сносит весь React и оставляет
// белый экран без единого сообщения. Два режима использования:
//   <ErrorBoundary fallback={null}>…</ErrorBoundary>  — тихо убрать упавший блок
//   <ErrorBoundary>…</ErrorBoundary>                    — показать текст ошибки
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Видно в консоли на любом устройстве — помогает поймать мобильный краш.
    console.error('[ErrorBoundary]', this.props.name || '', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      // fallback может быть null (тихо скрыть) или своим JSX
      if ('fallback' in this.props) return this.props.fallback;
      return (
        <div style={{ padding: 24, color: '#eee', fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '40px auto' }}>
          <h2 style={{ color: '#E7C063' }}>Что-то пошло не так</h2>
          <p style={{ color: '#aaa' }}>Страница не смогла отрисоваться. Текст ошибки:</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff8a8a', background: '#1a1a1a', padding: 12, borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
