import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CarCard from '../components/CarCard.jsx';
import { useCars } from '../api/useCars.js';
import DateRangePicker from '../components/DateRangePicker.jsx';

// Известные бренды нужны только для логотипов и распознавания по имени.
// Сам СПИСОК брендов в фильтре строится из загруженных машин — новая марка,
// добавленная через админку, появляется в фильтре автоматически.
const KNOWN_BRANDS = ['Lexus', 'Mercedes', 'Lamborghini', 'Ferrari', 'BMW', 'Rolls-Royce', 'Porsche', 'Bentley', 'Audi', 'Land Rover'];
const BRAND_LOGOS = {
  Lexus: '/lexus.svg', Mercedes: '/mercedes.svg', Lamborghini: '/lamborghini.svg',
  Ferrari: '/ferrari.svg', BMW: '/bmw.svg', 'Rolls-Royce': '/rolls-royce.svg', Porsche: '/porsche.svg',
};
const BODIES = ['Все', 'Купе', 'Купе/Кабриолет', 'Кабриолет', 'Внедорожник', 'Седан'];

const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
// Бронь день в день разрешена: минимальная дата — сегодня.
const today = new Date();
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter4 = new Date(); dayAfter4.setDate(dayAfter4.getDate() + 4);

function getBrand(car) {
  return KNOWN_BRANDS.find(b => car.name.startsWith(b)) || car.brand || '';
}

// Сопоставление типа кузова по токенам: авто «Купе/Кабриолет» попадает и в
// «Купе», и в «Кабриолет», и в «Купе/Кабриолет». Раньше сравнивались строки
// целиком, поэтому чип «Кабриолет» не находил ничего, а «Купе» не показывал
// машины со складной крышей.
function bodyMatches(carBody, selected) {
  if (selected === 'Все') return true;
  if (!carBody) return false;
  const carTokens = carBody.split('/').map(s => s.trim().toLowerCase());
  const selTokens = selected.split('/').map(s => s.trim().toLowerCase());
  return selTokens.some(t => carTokens.includes(t));
}

// Формат цены с разделением разрядов: 300000 → «300 000»
const fmtPrice = (n) => (n ? Number(n).toLocaleString('ru-RU') : '');
const parsePrice = (s) => Number(String(s).replace(/\D/g, '')) || 0;

// Карточка-заглушка на время загрузки (повторяет раскладку CarCard)
function CardSkeleton() {
  return (
    <div className="card card-skeleton" aria-hidden="true">
      <div className="card-img sk" />
      <div className="card-body">
        <div className="sk sk-line" style={{ width: '68%', height: 19 }} />
        <div className="sk sk-line" style={{ width: '42%', height: 12, marginTop: 10 }} />
        <div className="sk-specs">
          <div className="sk sk-line" style={{ width: 46, height: 30 }} />
          <div className="sk sk-line" style={{ width: 52, height: 30 }} />
          <div className="sk sk-line" style={{ width: 58, height: 30 }} />
        </div>
        <div className="sk-price-row">
          <div className="sk sk-line" style={{ width: 64, height: 12 }} />
          <div className="sk sk-line" style={{ width: 92, height: 22 }} />
        </div>
      </div>
    </div>
  );
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
  // null = «все бренды» (в т.ч. добавленные позже через админку)
  const [selectedBrands, setSelectedBrands] = useState(urlBrand ? new Set([urlBrand]) : null);
  const [textSearch, setTextSearch] = useState(urlQ);
  // Ценовой диапазон подстраивается под реальный парк (раньше 30–200к прятал
  // машины дороже/дешевле). Пока пользователь не трогал поля — границы из данных.
  const [minPrice,   setMinPrice]   = useState(0);
  const [maxPrice,   setMaxPrice]   = useState(1000000);
  const [priceTouched, setPriceTouched] = useState(false);
  const [sort,       setSort]       = useState('Рекомендуемые');
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Список брендов — из загруженных машин
  const brands = useMemo(
    () => [...new Set(FLEET.map(getBrand).filter(Boolean))],
    [FLEET]
  );

  // Верхняя граница цены — из парка (округляем вверх до 5к, чтобы поле выглядело аккуратно)
  useEffect(() => {
    if (priceTouched || !FLEET.length) return;
    const top = Math.max(...FLEET.map(c => c.price_per_day || c.price || 0));
    if (top > 0) setMaxPrice(Math.ceil(top / 5000) * 5000);
  }, [FLEET, priceTouched]);

  function toggleBrand(brand) {
    setSelectedBrands(prev => {
      const next = new Set(prev ?? brands); // старт «все выбраны»
      next.has(brand) ? next.delete(brand) : next.add(brand);
      return next;
    });
  }

  function resetFilters() {
    setBody('Все');
    setSelectedBrands(null);
    setPriceTouched(false);
    setMinPrice(0);
    setSort('Рекомендуемые');
    setTextSearch('');
    setDatesActive(false);
  }

  const filtered = useMemo(() => {
    const q = textSearch.trim().toLowerCase();
    let list = FLEET.filter(car => {
      const price = car.price_per_day || car.price || 0;
      if (!bodyMatches(car.body, body)) return false;
      if (selectedBrands && !selectedBrands.has(getBrand(car))) return false;
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
        <button
          className="filters-toggle"
          onClick={() => setFiltersOpen(v => !v)}
          aria-expanded={filtersOpen}
        >
          <span><i className="ph ph-sliders-horizontal" /> Фильтры</span>
          <i className={`ph ph-caret-${filtersOpen ? 'up' : 'down'}`} />
        </button>
        <aside className={`filters${filtersOpen ? ' open' : ''}`}>

          {/* Поиск по названию */}
          <div className="filter-group">
            <h5>Поиск</h5>
            <input
              type="text"
              placeholder="Lexus, Ferrari, BMW…"
              value={textSearch}
              onChange={e => setTextSearch(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}
            />
          </div>

          {/* Фильтр по датам — реальная проверка доступности */}
          <div className="filter-group">
            <h5>Даты аренды</h5>
            <DateRangePicker
              from={datesActive ? fromDate : null}
              to={datesActive ? toDate : null}
              minDate={toDateStr(today)}
              variant="sidebar"
              onChange={({ from, to }) => {
                if (from) { setFromDate(from); setDatesActive(true); }
                if (to) { setToDate(to); }
                if (!from && !to) { setDatesActive(false); }
              }}
            />
            {datesActive && days && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gold)' }}>
                {days} {days === 1 ? 'сутки' : 'суток'} — только свободные авто
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

          {/* Марка — попап */}
          <div className="filter-group" style={{ position: 'relative' }}>
            <h5
              onClick={() => setBrandsOpen(v => !v)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}
            >
              Марка
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 400 }}>
                {selectedBrands && selectedBrands.size < brands.length && <span style={{ color: 'var(--gold)' }}>{selectedBrands.size}/{brands.length}</span>}
                <i className={`ph ph-caret-${brandsOpen ? 'up' : 'down'}`} style={{ fontSize: 13, color: '#888' }} />
              </span>
            </h5>
            {brandsOpen && (
              <>
                <div className="brand-popup-backdrop" onClick={() => setBrandsOpen(false)} />
                <div className="brand-popup">
                  <div className="brand-popup-head">
                    <span>Выберите марки</span>
                    <button onClick={() => setSelectedBrands(null)}>Все</button>
                  </div>
                  {brands.map(brand => {
                    const checked = !selectedBrands || selectedBrands.has(brand);
                    return (
                      <div
                        key={brand}
                        className={`brand-option${checked ? ' selected' : ''}`}
                        onClick={() => toggleBrand(brand)}
                      >
                        <span className="brand-check">
                          {checked && <i className="ph-fill ph-check" />}
                        </span>
                        {BRAND_LOGOS[brand] && <img className="brand-logo" src={BRAND_LOGOS[brand]} alt="" loading="lazy" />}
                        {brand}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Цена */}
          <div className="filter-group">
            <h5>Цена за сутки, ₽</h5>
            <div className="range">
              <div className="price-input">
                <input type="text" inputMode="numeric" value={fmtPrice(minPrice)} onChange={e => { setPriceTouched(true); setMinPrice(parsePrice(e.target.value)); }} />
                <span className="price-cur">₽</span>
              </div>
              <div className="price-input">
                <input type="text" inputMode="numeric" value={fmtPrice(maxPrice)} onChange={e => { setPriceTouched(true); setMaxPrice(parsePrice(e.target.value)); }} />
                <span className="price-cur">₽</span>
              </div>
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
              <span className="muted" style={{ fontSize: 12, letterSpacing: 'normal' }}>Сортировка</span>
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
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
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
