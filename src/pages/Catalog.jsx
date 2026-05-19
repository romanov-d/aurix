import { Link } from 'react-router-dom';
import CarCard from '../components/CarCard.jsx';
import { useCars } from '../api/useCars.js';

export default function Catalog() {
  const { items: FLEET } = useCars({ limit: 100 });
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/">Главная</Link><span className="sep">/</span><span>Автопарк</span></div>
          <h1>Аренда <em>премиальных</em> автомобилей</h1>
        </div>
      </div>

      <div className="container">
        <div className="search-widget" style={{ marginTop: 32 }}>
          <div className="search-grid">
            <div className="search-cell">
              <label>Город подачи</label>
              <div className="val">Москва<small>любой адрес</small></div>
            </div>
            <div className="search-cell">
              <label>Получение</label>
              <div className="val">15 мая · 12:00</div>
            </div>
            <div className="search-cell">
              <label>Возврат</label>
              <div className="val">22 мая · 12:00</div>
            </div>
            <div className="search-cell">
              <label>Класс</label>
              <div className="val">Все классы</div>
            </div>
            <button className="search-cta">Обновить</button>
          </div>
        </div>
      </div>

      <div className="container catalog">
        <aside className="filters">
          <div className="filter-group">
            <h5>Тип кузова</h5>
            <div className="chips">
              <div className="chip active">Все</div>
              <div className="chip">Купе</div>
              <div className="chip">Кабриолет</div>
              <div className="chip">Внедорожник</div>
              <div className="chip">Седан</div>
            </div>
          </div>
          <div className="filter-group">
            <h5>Марка</h5>
            <div className="checks">
              <label><input type="checkbox" defaultChecked /> Mercedes-Benz</label>
              <label><input type="checkbox" defaultChecked /> Porsche</label>
              <label><input type="checkbox" defaultChecked /> BMW</label>
              <label><input type="checkbox" /> Rolls-Royce</label>
              <label><input type="checkbox" /> Bentley</label>
              <label><input type="checkbox" /> Lamborghini</label>
            </div>
          </div>
          <div className="filter-group">
            <h5>Цена за сутки, ₽</h5>
            <div className="range"><input type="text" defaultValue="30 000" /><input type="text" defaultValue="120 000" /></div>
          </div>
          <div className="filter-group">
            <h5>Год выпуска</h5>
            <div className="range"><input type="text" defaultValue="2022" /><input type="text" defaultValue="2026" /></div>
          </div>
          <div className="filter-group">
            <h5>Коробка</h5>
            <div className="chips">
              <div className="chip active">Автомат</div>
              <div className="chip">Робот</div>
              <div className="chip">Механика</div>
            </div>
          </div>
          <div className="filter-group">
            <h5>Опции</h5>
            <div className="checks">
              <label><input type="checkbox" /> Подача в аэропорт</label>
              <label><input type="checkbox" /> Без залога</label>
              <label><input type="checkbox" /> С водителем</label>
              <label><input type="checkbox" /> Доступно сегодня</label>
            </div>
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 18 }}>Применить</button>
        </aside>

        <div>
          <div className="catalog-head">
            <div className="catalog-count"><b>{FLEET.length}</b> автомобилей · доступны на 15–22 мая 2026</div>
            <div className="sort">
              <span className="muted" style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase' }}>Сортировка</span>
              <select>
                <option>Рекомендуемые</option>
                <option>По цене ↑</option>
                <option>По цене ↓</option>
                <option>По мощности</option>
                <option>Новинки</option>
              </select>
            </div>
          </div>
          <div id="fleet-slot" className="catalog-grid">
            {FLEET.map(c => <CarCard key={c.id} car={c} />)}
          </div>
        </div>
      </div>
    </>
  );
}
