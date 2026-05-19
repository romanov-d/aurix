import { Link, useParams } from 'react-router-dom';
import CarCard from '../components/CarCard.jsx';
import { useCars } from '../api/useCars.js';

export default function Car() {
  const { id } = useParams();
  const { items: FLEET, loading } = useCars({ limit: 100 });
  if (loading && FLEET.length === 0) return <div className="container" style={{ padding: '120px 0', color: '#9a9a9a' }}>Загрузка…</div>;
  const car = FLEET.find(c => c.id === id) || FLEET[0];
  if (!car) return null;
  const similar = FLEET.filter(c => c.id !== car.id).slice(0, 4);
  const days = 7;
  const subtotal = car.price * days;
  const discount = Math.round(subtotal * 0.15);
  const total = subtotal - discount;

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Главная</Link><span className="sep">/</span>
            <Link to="/catalog">Автопарк</Link><span className="sep">/</span>
            <span>{car.name}</span>
          </div>
          <h1>{car.name}</h1>
          <div className="muted" style={{ marginTop: 10, fontSize: 13, letterSpacing: '.18em', textTransform: 'uppercase' }}>{car.year} · {car.body} · {car.power}</div>
        </div>
      </div>

      <div className="container detail">
        <div className="gallery">
          <div className="main-img"><img src={car.img} alt="" /></div>
          <div className="thumbs">
            <div className="t active"><img src={car.img} alt="" /></div>
            <div className="t"><img src="https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&auto=format&fit=crop&q=80" alt="" /></div>
            <div className="t"><img src="https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&auto=format&fit=crop&q=80" alt="" /></div>
            <div className="t"><img src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80" alt="" /></div>
            <div className="t"><img src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&auto=format&fit=crop&q=80" alt="" /></div>
          </div>

          <div className="divider-h"></div>
          <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22 }}>Описание</h3>
          <p className="muted" style={{ marginTop: 14, fontSize: 14, lineHeight: 1.85, color: '#bdbdbd' }}>{car.name} — премиальный автомобиль из автопарка AURIX MOTORS. Двигатель {car.engine}, мощность {car.power}, коробка {car.drive}. Полностью укомплектованный салон, премиальная аудиосистема и безупречное техническое состояние.</p>

          <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 36 }}>Что включено</h3>
          <ul className="muted" style={{ margin: '14px 0 0 20px', color: '#bdbdbd', fontSize: 14, lineHeight: 2 }}>
            <li>Полная страховка КАСКО + ОСАГО</li>
            <li>Бесплатная подача в пределах МКАД</li>
            <li>200 км/сутки включено</li>
            <li>Полный бак при выдаче</li>
            <li>Поддержка 24/7 и эвакуация</li>
          </ul>
        </div>

        <aside className="detail-side">
          <h1>{car.name}</h1>
          <div className="submeta">{car.year} · {car.body} · Чёрный</div>

          <div className="price-block">
            <div className="row"><span>1 сутки (Пн–Чт)</span><b>{car.price.toLocaleString('ru-RU')} ₽</b></div>
            <div className="row"><span>1 сутки (Пт–Вс)</span><b>{Math.round(car.price * 1.16).toLocaleString('ru-RU')} ₽</b></div>
            <div className="row"><span>От 3 суток</span><b>−10%</b></div>
            <div className="row"><span>От 7 суток</span><b>−15%</b></div>
            <div className="row"><span>Залог</span><b style={{ fontSize: 14, color: '#fff' }}>150 000 ₽</b></div>
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: 12 }}>
            <div className="field"><label>Получение</label><input defaultValue="15.05.2026 12:00" /></div>
            <div className="field"><label>Возврат</label><input defaultValue="22.05.2026 12:00" /></div>
          </div>
          <div className="field" style={{ marginTop: 14 }}><label>Адрес подачи</label><input defaultValue="Москва, аэропорт Внуково" /></div>

          <div className="price-block" style={{ marginTop: 20 }}>
            <div className="row"><span>{days} суток × {car.price.toLocaleString('ru-RU')}</span><span>{subtotal.toLocaleString('ru-RU')} ₽</span></div>
            <div className="row"><span>Скидка 15%</span><span style={{ color: 'var(--gold)' }}>−{discount.toLocaleString('ru-RU')} ₽</span></div>
            <div className="row"><span style={{ fontSize: 15 }}>Итого</span><b style={{ fontSize: 24 }}>{total.toLocaleString('ru-RU')} ₽</b></div>
          </div>

          <button className="btn btn-filled" style={{ width: '100%', padding: 16 }}>Забронировать</button>
          <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 14, letterSpacing: '.06em' }}>Мгновенное подтверждение · Оплата частями</p>

          <div className="spec-grid">
            <div className="s"><div className="lbl">Двигатель</div><div className="v">{car.engine} · {car.fuel.toLowerCase()}</div></div>
            <div className="s"><div className="lbl">Мощность</div><div className="v">{car.power}</div></div>
            <div className="s"><div className="lbl">Разгон 0–100</div><div className="v">4.9 с</div></div>
            <div className="s"><div className="lbl">Коробка</div><div className="v">{car.drive} · 9</div></div>
            <div className="s"><div className="lbl">Привод</div><div className="v">4MATIC+</div></div>
            <div className="s"><div className="lbl">Мест</div><div className="v">2 + 2</div></div>
          </div>
        </aside>
      </div>

      <section>
        <div className="container">
          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Похожие</span></div>
            <h2>Также вам <em>понравится</em></h2>
          </div>
          <div id="fleet-slot" className="fleet-grid" data-limit="4">
            {similar.map(c => <CarCard key={c.id} car={c} />)}
          </div>
        </div>
      </section>
    </>
  );
}
