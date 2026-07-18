import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary, { reloadOnce } from './components/ErrorBoundary.jsx';
import { ContentProvider } from './contexts/ContentContext.jsx';
import '../styles.css';

// После деплоя у Vite меняются хеши чанков. Если браузер держит старую версию
// и не может подгрузить ленивый чанк — Vite шлёт 'vite:preloadError'. Ловим и
// перезагружаемся один раз, чтобы подтянуть свежий index.html и новые чанки.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  reloadOnce();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary name="app-root">
        <ContentProvider>
          <App />
        </ContentProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
