import { createContext, useContext, useMemo, useState } from 'react';
import { fmtRuDate } from '../data/fleet.js';
import { useCars } from '../api/useCars.js';
import CarCard from './CarCard.jsx';

const SearchCtx = createContext(null);

const pad = (n) => String(n).padStart(2, '0');
const dstr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return dstr(d); };

export function SearchProvider({ children }) {
  const [city, setCity] = useState('Москва');
  const [returnCity, setReturnCity] = useState('Москва');
  const [roundTrip, setRoundTrip] = useState(true);
  const [from, setFrom] = useState(plusDays(0));   // день в день разрешён
  const [fromT, setFromT] = useState('12:00');
  const [to, setTo] = useState(plusDays(7));
  const [toT, setToT] = useState('12:00');
  const [driver, setDriver] = useState('without');
  const [sort, setSort] = useState('rec');

  const days = useMemo(() => {
    const d1 = new Date(from), d2 = new Date(to);
    return Math.max(1, Math.round((d2 - d1) / 86400000));
  }, [from, to]);

  const daysLabel = `${days} ${days === 1 ? 'сутки' : 'суток'}`;

  const { items: list, loading } = useCars({
    sort,
    from: roundTrip ? from : undefined,
    to: roundTrip ? to : undefined,
  });

  const value = {
    city, setCity, returnCity, setReturnCity, roundTrip, setRoundTrip,
    from, setFrom, fromT, setFromT, to, setTo, toT, setToT,
    driver, setDriver, sort, setSort, days, daysLabel, list, loading,
    body: '',
  };
  return <SearchCtx.Provider value={value}>{children}</SearchCtx.Provider>;
}

function LocationIcon() {
  return <i className="ph-fill ph-map-pin sf-icon" />;
}
function CalIcon() {
  return <i className="ph-fill ph-calendar-blank sf-icon" />;
}

export function SearchForm() {
  const s = useContext(SearchCtx);
  if (!s) return null;
  return (
    <div className="search-widget" id="search-widget">
      <div className="sf-top">
        <span className="sf-top-label">Туда-обратно?</span>
        <button
          type="button"
          className={`sf-toggle${s.roundTrip ? ' on' : ''}`}
          onClick={() => s.setRoundTrip(v => !v)}
          aria-label="Туда-обратно"
        >
          <span className="sf-toggle-dot" />
        </button>
      </div>

      <div className="sf-grid">
        <div className="sf-cell">
          <label>Откуда</label>
          <div className="sf-field">
            <LocationIcon />
            <select value={s.city} onChange={e => s.setCity(e.target.value)}>
              <option>Москва</option>
            </select>
          </div>
        </div>

        {s.roundTrip && (
          <div className="sf-cell">
            <label>Куда</label>
            <div className="sf-field">
              <LocationIcon />
              <select value={s.returnCity} onChange={e => s.setReturnCity(e.target.value)}>
                <option>Москва</option>
              </select>
            </div>
          </div>
        )}

        <div className="sf-cell">
          <label>Получение</label>
          <div className="sf-field sf-field-split">
            <CalIcon />
            <input type="date" value={s.from} onChange={e => s.setFrom(e.target.value)} />
            <span className="sf-sep" />
            <input type="time" value={s.fromT} onChange={e => s.setFromT(e.target.value)} />
          </div>
        </div>

        <div className="sf-cell">
          <label>Возврат</label>
          <div className="sf-field sf-field-split">
            <CalIcon />
            <input type="date" value={s.to} onChange={e => s.setTo(e.target.value)} />
            <span className="sf-sep" />
            <input type="time" value={s.toT} onChange={e => s.setToT(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="sf-bottom">
        <div className="sf-filter">
          <span className="sf-filter-label">Фильтр:</span>
          <button
            type="button"
            className={`sf-chip${s.driver === 'without' ? ' active' : ''}`}
            onClick={() => s.setDriver('without')}
          >Без водителя</button>
          <button
            type="button"
            className={`sf-chip${s.driver === 'with' ? ' active' : ''}`}
            onClick={() => s.setDriver('with')}
          >С водителем</button>
        </div>
        <button type="button" className="sf-search">
          Найти <span className="sf-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

export function SearchResults() {
  const s = useContext(SearchCtx);
  if (!s) return null;
  return (
    <section id="results-section" style={{ padding: '64px 0 32px' }}>
      <div className="container">
        <div className="results-head">
          <div>
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Результаты подбора</span></div>
            <h2 className="serif" style={{ fontSize: 32, marginTop: 10, letterSpacing: '.04em' }}>
              <span id="r-count">{s.list.length}</span> авто доступно ·{' '}
              <span className="gold" id="r-dates">{fmtRuDate(s.from)} — {fmtRuDate(s.to)}</span>
            </h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }} id="r-summary">{s.city} · {s.days} {s.days === 1 ? 'сутки' : 'суток'} · {s.driver === 'with' ? 'с водителем' : 'без водителя'}</p>
          </div>
          <div className="sort">
            <span className="muted" style={{ fontSize: 12 }}>Сортировка</span>
            <select id="r-sort" value={s.sort} onChange={e => s.setSort(e.target.value)}>
              <option value="rec">Рекомендуемые</option>
              <option value="price-asc">По цене ↑</option>
              <option value="price-desc">По цене ↓</option>
              <option value="power">По мощности</option>
            </select>
          </div>
        </div>
        {s.list.length === 0 ? (
          <div id="results-empty" className="results-empty">
            <div className="serif gold" style={{ fontSize: 22, marginBottom: 10 }}>Под ваш запрос ничего не нашлось</div>
            <p className="muted">Попробуйте расширить критерии — например, изменить класс авто или бюджет.</p>
          </div>
        ) : (
          <div id="results-grid" className="catalog-grid" style={{ marginTop: 24 }}>
            {s.list.map(c => <CarCard key={c.id} car={c} days={s.days} />)}
          </div>
        )}
      </div>
    </section>
  );
}

export default function SearchWidget() {
  return (
    <SearchProvider>
      <div className="container"><SearchForm /></div>
      <SearchResults />
    </SearchProvider>
  );
}
