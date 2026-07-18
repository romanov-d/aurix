import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listCars } from '../api/cars.js';
import T from '../components/T.jsx';

const fmt = (n) => (n || n === 0 ? n.toLocaleString('ru-RU') + ' ₽' : 'по запросу');

export default function PhotoRental() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listCars({ limit: 100 })
      .then(({ items }) => { if (active) setCars(items.filter(c => (c.photo_rate || 0) > 0)); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Главная</Link><span className="sep">/</span><span>Аренда для фото</span>
          </div>
          <T k="photo.hero.title" as="h1" html>Аренда авто <em>для фотосессий</em></T>
          <T k="photo.hero.lead" as="p" style={{ color: '#bdbdbd', maxWidth: 640, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>
            Премиальный автомобиль на час-полтора для фотосессии, съёмки клипа, свадьбы или праздника.
            Без пробега и лишней бумажной волокиты — машина подаётся к месту съёмки,
            вы получаете кадры, мы забираем авто. Тариф указан за час.
          </T>
          <div style={{ display: 'flex', gap: 18, marginTop: 28, flexWrap: 'wrap' }}>
            <Link to="/contacts" className="btn btn-filled"><T k="photo.hero.ctaBook">Забронировать съёмку</T></Link>
            <Link to="/catalog" className="btn"><T k="photo.hero.ctaCatalog">Смотреть автопарк</T></Link>
          </div>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><T k="photo.how.eyebrow" as="span" className="eyebrow">Как это работает</T></div>
            <T k="photo.how.title" as="h2" html>Просто и <em>быстро</em></T>
          </div>
          <div className="services-grid" style={{ marginBottom: 56 }}>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-calendar-check" /></div><T k="photo.how.step1Title" as="h3">1. Выберите авто и время</T><T k="photo.how.step1Text" as="p">Любой автомобиль из списка ниже. Минимальная аренда — 1 час. Возможна съёмка день в день — уточните у менеджера.</T></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-map-pin" /></div><T k="photo.how.step2Title" as="h3">2. Подача к месту съёмки</T><T k="photo.how.step2Text" as="p">Привезём автомобиль в любую точку Москвы и МО — студия, парк, набережная, площадка мероприятия.</T></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-camera" /></div><T k="photo.how.step3Title" as="h3">3. Снимайте</T><T k="photo.how.step3Text" as="p">Машина в вашем распоряжении на время съёмки. Фотограф, свет, декор — на ваше усмотрение. Поездки — по договорённости.</T></div>
          </div>

          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Тарифы</span></div>
            <h2>Стоимость <em>за час</em></h2>
          </div>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#bdbdbd' }}>Загрузка…</div>
          ) : cars.length === 0 ? (
            <p style={{ color: '#bdbdbd' }}>Тарифы уточняйте у менеджера — <Link to="/contacts" style={{ color: 'var(--gold)' }}>свяжитесь с нами</Link>.</p>
          ) : (
            <div className="catalog-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {cars.map(car => (
                <Link key={car.id} to={`/car/${car.id}`} className="card">
                  <div className="card-img">
                    <img src={car.image_url || car.img} alt={car.name} loading="lazy" decoding="async" />
                  </div>
                  <div className="card-body">
                    <div className="card-name">{car.name}</div>
                    <div className="card-meta">
                      <span className="meta-chip">{car.year}</span>
                      {car.body && <span className="meta-chip">{car.body}</span>}
                    </div>
                    <div className="card-price">
                      <span className="from">фотосессия · час</span>
                      <span className="val">{fmt(car.photo_rate)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div style={{ background: '#101010', padding: '28px 32px', borderRadius: 14, marginTop: 40 }}>
            <h3 style={{ margin: '0 0 14px', fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 600, color: '#fff' }}>Условия</h3>
            <ul style={{ color: '#bdbdbd', fontSize: 14, lineHeight: 2, fontFamily: "'Inter', sans-serif", paddingLeft: 18, margin: 0 }}>
              <li>Тариф действует для статичной съёмки без пробега; поездки в кадре — по договорённости.</li>
              <li>Подача и возврат по Москве оплачиваются отдельно в зависимости от адреса.</li>
              <li>Залог обязателен и возвращается сразу после завершения съёмки.</li>
              <li>Бронь подтверждает менеджер — <Link to="/contacts" style={{ color: 'var(--gold)' }}>напишите нам</Link> или оставьте заявку на странице авто.</li>
            </ul>
          </div>

          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <Link to="/contacts" className="btn btn-filled">Забронировать съёмку</Link>
          </div>
        </div>
      </section>
    </>
  );
}
