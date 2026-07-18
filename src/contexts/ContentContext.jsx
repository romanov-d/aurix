import { createContext, useContext, useEffect, useState } from 'react';

// Карта редактируемых текстов лендинга {key: value}. Грузится один раз.
// Пока не загрузилось (или ключа нет) — используется fallback (текущий текст),
// поэтому сайт всегда рабочий и правки применяются постепенно.
const ContentContext = createContext({ map: {}, ready: false });

export function ContentProvider({ children }) {
  const [map, setMap] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/content', { credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => { if (alive) { setMap(d || {}); setReady(true); } })
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  return (
    <ContentContext.Provider value={{ map, ready }}>
      {children}
    </ContentContext.Provider>
  );
}

// Хук: вернуть текст по ключу или fallback.
export function useText(key, fallback = '') {
  const { map } = useContext(ContentContext);
  const v = map[key];
  return v === undefined || v === null || v === '' ? fallback : v;
}
