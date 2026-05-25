import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CarCard from '../components/CarCard.jsx';
import { useCars } from '../api/useCars.js';

const BRANDS = ['Lexus', 'Mercedes', 'Lamborghini', 'Ferrari', 'BMW', 'Rolls-Royce', 'Porsche'];
const BODIES = ['Все', 'Купе', 'Купе/Кабриолет', 'Кабриолет', 'Внедорожник', 'Седан'];

const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter4 = new Date(); dayAfter4.setDate(dayAfter4.getDate() + 4);

function getBrand(car) {
  return BRANDS.find(b => car.name.startsWith(b)) || car.brand || '';
}

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function Catalog() {
  const [searchParams] = useSearchParams();

  const urlBody  = searchParams.get('body') || 'Все';
  const urlBrand = searchParams.get('brand');
  const urlQ     = searchParams.get('q') || '';
  const urlFrom  = searchParams.get('from') || '';
  const urlTo    = searchParams.get('to')   || '';

  // Date availability filter — wired directly to API
  const [fromDate, setFromDate] = useState(urlFrom || toDateStr(tomorrow));
  const [toDate,   setToDate]   = useState(urlTo   || toDateStr(dayAfter4));
  const [datesActive, setDatesActive] = useState(!!(urlFrom && urlTo));

  // Load cars: when dates are active pass them to API so backend excludes booked cars
  const { items: FLEET, loading } = useCars({
    limit: 100,
    from: datesActive ? fromDate : undefined,
    to:   datesActive ? toDate   : undefined,
  });

  const days = useMemo(() => {
    if (!datesActive) return null;
    const d = Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000);
    return d > 0 ? d : null;
  }, [fromDate, toDate, datesActive]);

  // Sidebar filters (client-side)
  const [body,           setBody]           = useState(BODIES.includes(urlBody) ? urlBody : 'Все');
  const [selectedBrands, setSelectedBrands] = useState(
    urlBrand && BRANDS.includes(urlBrand) ? new Set([urlBrand]) : new Set(BRANDS)
  );
  const [textSearch, setTextSearch] = useState(urlQ);
  const [minPrice,   setMinPrice]   = useState(30000);
  const [maxPrice,   setMaxPrice]   = useState(200000);
  const [sort,       setSort]       = useState('Рекомендуемые');

  function toggleBrand(brand) {
    setSelectedBrands(prev => {
      const next = new Set(prev);
      next.has(brand) ? next.delete(brand) : next.add(brand);
      return next;
    });
  }

  function resetFilters() {
    setBody('Все');
    setSelectedBrands(new Set(BRANDS));
    setMinPrice(30000);
    setMaxPrice(200000);
    setSort('Рекомендуемые');
    setTextSearch('');
    setDatesActive(false);
  }

  const filtered = useMemo(() => {
    const q = textSearch.trim().toLowerCase();
    let list = FLEET.filter(car => {
      const price = car.price_per_day || car.price || 0;
      if (body !== 'Все' && car.body !== body) return false;
      if (!selectedBrands.has(getBrand(car))) return false;
      if (price < minPrice || price > maxPrice) return false;
      if (q && !car.name.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sort === 'По цене ↑') list = [...list].sort((a, b) => (a.price_per_day||a.price) - (b.price_per_day||b.price));
    else if (sort === 'По цене ↓') list = [...list].sort((a, b) => (b.price_per_day||b.price) - (a.price_per_day||a.price));
    else if (sort === 'По мощности') list = [...list].sort((a, b) => (b.power_hp||0) - (a.power_hp||0));
    else if (sort === 'Новинки') list = [...list].sort((a, b) => b.year - a.year);

    return list;
  }, [FLEET, body, selectedBrands, minPrice, maxPrice, sort, textSearch]);

  const availLabel = datesActive
    ? `${filtered.length} авто доступно · ${fmtDate(fromDate)} — ${fmtDate(toDate)}`
    : `${filtered.length} автомобилей в парке`;

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/">Главная</Link><span className="sep">/</span><span>Автопарк</span></div>
          <h1>Аренда <em>премиальных</em> автомобилей</h1>
        </div>
      </div>

      <div className="container catalog">
        <aside className="filters">

          {/* Поиск по названию */}
          <div className="filter-group">
            <h5>Поиск</h5>
            <input
              type="text"
              placeholder="Lexus, Ferrari, BMW…"
              value={textSearch}
              onChange={e => setTextSearch(e.target.value)}
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}
            />
          </div>

          {/* Фильтр по датам — реальная проверка доступности */}
          <div className="filter-group">
            <h5 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Даты аренды
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 400, color: datesActive ? 'var(--gold)' : '#888', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={datesActive}
                  onChange={e => setDatesActive(e.target.checked)}
                  style={{ accentColor: 'var(--gold)' }}
                />
                проверить
              </label>
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Получение</label>
                <input
                  type="date"
                  value={fromDate}
                  min={toDateStr(tomorrow)}
                  onChange={e => { setFromDate(e.target.value); setDatesActive(true); }}
                  style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', color: '#fff', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Возврат</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={e => { setToDate(e.target.value); setDatesActive(true); }}
                  style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', color: '#fff', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </div>
            {datesActive && days && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gold)' }}>
                {days} {days === 1 ? 'сутки' : 'суток'} — показаны только свободные авто
              </div>
            )}
          </div>

          {/* Тип кузова */}
          <div className="filter-group">
            <h5>Тип кузова</h5>
            <div className="chips">
              {BODIES.map(b => (
                <div key={b} className={`chip${body === b ? ' active' : ''}`} onClick={() => setBody(b)}>
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* Марка */}
          <div className="filter-group">
            <h5>Марка</h5>
            <div className="checks">
              {BRANDS.map(brand => (
                <label key={brand}>
                  <input type="checkbox" checked={selectedBrands.has(brand)} onChange={() => toggleBrand(brand)} />
                  {' '}{brand}
                </label>
              ))}
            </div>
          </div>

          {/* Цена */}
          <div className="filter-group">
            <h5>Цена за сутки, ₽</h5>
            <div className="range">
              <input type="number" value={minPrice} min={0} onChange={e => setMinPrice(Number(e.target.value))} />
              <input type="number" value={maxPrice} min={0} onChange={e => setMaxPrice(Number(e.target.value))} />
            </div>
          </div>

          <button className="btn" style={{ width: '100%', marginTop: 18 }} onClick={resetFilters}>
            Сбросить фильтры
          </button>
        </aside>

        <div>
          <div className="catalog-head">
            <div className="catalog-count">
              <b>{loading ? '…' : filtered.length}</b> {availLabel.split(' ').slice(1).join(' ')}
            </div>
            <div className="sort">
              <span className="muted" style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase' }}>Сортировка</span>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option>Рекомендуемые</option>
                <option>По цене ↑</option>
                <option>По цене ↓</option>
                <option>По мощности</option>
                <option>Новинки</option>
              </select>
            </div>
          </div>
          <div id="fleet-slot" className="catalog-grid">
            {loading
              ? <div style={{ padding: 40, color: '#888' }}>Загрузка…</div>
              : filtered.length === 0
                ? <div style={{ padding: 40, color: '#888' }}>
                    {datesActive ? 'Нет свободных авто на выбранные даты' : 'Ничего не найдено — попробуйте изменить фильтры'}
                  </div>
                : filtered.map(c => <CarCard key={c.id} car={c} days={days} />)
            }
          </div>
        </div>
      </div>
    </>
  );
}
