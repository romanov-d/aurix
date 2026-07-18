import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import T from '../components/T.jsx';

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('ru-RU') + ' ₽';
}

function price(n) {
  if (n === null || n === undefined) return 'договорная';
  return fmt(n);
}

export default function Tariffs() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api('/cars?limit=100')
      .then((data) => {
        if (active) {
          setCars(data.items || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError('Не удалось загрузить тарифы');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/"><T k="tariffs.head.crumbHome">Главная</T></Link><span className="sep">/</span><span><T k="tariffs.head.crumbCurrent">Тарифы</T></span>
          </div>
          <T k="tariffs.head.title" as="h1" html>Тарифы <em>и цены</em></T>
          <T k="tariffs.head.lead" as="p" style={{ color: '#bdbdbd', maxWidth: 640, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>
            Прозрачное ценообразование без скрытых платежей. Стоимость зависит от модели и срока аренды. Цена включает НДС 22%.
          </T>
        </div>
      </div>

      <section>
        <div className="container">

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#bdbdbd' }}>
              <T k="tariffs.state.loading">Загрузка тарифов...</T>
            </div>
          ) : error ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#e74c3c' }}>
              {error}
            </div>
          ) : (
            /* Pricing table */
            <div style={{ overflowX: 'auto', borderRadius: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: '#181818' }}>
                    <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11, minWidth: 200 }}><T k="tariffs.table.colCar">Автомобиль</T></th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}><T k="tariffs.table.col1_5">1–5 дней</T></th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}><T k="tariffs.table.col6_12">6–12 дней</T></th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}><T k="tariffs.table.col13">от 13 дней</T></th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}><T k="tariffs.table.col30">от 30 дней</T></th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}><T k="tariffs.table.colDeposit">Залог</T></th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}><T k="tariffs.table.colMileage">Пробег/сут</T></th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}><T k="tariffs.table.colOvermileage">Перекат/км</T></th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}><T k="tariffs.table.colPhoto">Фотосессия/час</T></th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car, i) => (
                    <tr
                      key={car.id}
                      style={{
                        background: i % 2 === 0 ? '#0d0d0d' : '#101010',
                        borderBottom: '1px solid #1e1e1e',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1a1408'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#0d0d0d' : '#101010'}
                    >
                      <td style={{ padding: '14px 16px', color: '#fff', fontWeight: 500 }}>
                        <Link to={`/car/${car.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{car.name}</Link>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: "'Inter', sans-serif", fontSize: 14 }}>{price(car.price_per_day)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: "'Inter', sans-serif", fontSize: 14 }}>{price(car.price_6_12)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#bdbdbd', fontStyle: 'italic', fontSize: 12 }}><T k="tariffs.table.priceNegotiable">договорная</T></td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: "'Inter', sans-serif", fontSize: 14 }}>{price(car.price_30)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cfcfcf' }}>{fmt(car.deposit)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cfcfcf' }}>{car.mileage_limit} км</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cfcfcf' }}>{car.overmileage_rate} ₽/км</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: "'Inter', sans-serif", fontSize: 14 }}>{price(car.photo_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <T k="tariffs.table.note" as="p" className="muted" style={{ fontSize: 12, marginTop: 12, letterSpacing: '.06em' }}>
            Цена включает НДС 22%. Залог обязателен по всем автомобилям и возвращается после сдачи авто.
          </T>

          <div className="divider-h"></div>

          {/* Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: '#101010', padding: '28px 32px', borderRadius: 14 }}>
              <T k="tariffs.notes.photo.title" as="h3" style={{ margin: '0 0 14px', fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 600, color: '#fff' }}>Аренда для фотосессий</T>
              <p style={{ color: '#bdbdbd', fontSize: 14, lineHeight: 1.8, fontFamily: "'Inter', sans-serif" }}>
                <T k="tariffs.notes.photo.text">Автомобиль можно арендовать для фотосессии или съёмки без пробега. Тариф указан за час. Возможна подача в любое место Москвы и МО.</T> <Link to="/photo" style={{ color: 'var(--gold)' }}><T k="tariffs.notes.photo.link">Подробнее об аренде для фото →</T></Link>
              </p>
            </div>
            <div style={{ background: '#101010', padding: '28px 32px', borderRadius: 14 }}>
              <T k="tariffs.notes.gift.title" as="h3" style={{ margin: '0 0 14px', fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 600, color: '#fff' }}>Подарочные сертификаты</T>
              <T k="tariffs.notes.gift.text" as="p" style={{ color: '#bdbdbd', fontSize: 14, lineHeight: 1.8, fontFamily: "'Inter', sans-serif" }}>
                Подарочный сертификат на аренду любого автомобиля из парка. Стоимость сертификата равна стоимости одних суток аренды выбранного автомобиля. Срок действия — 1 год с даты оформления.
              </T>
            </div>
            <div style={{ background: '#101010', padding: '28px 32px', borderRadius: 14 }}>
              <T k="tariffs.notes.delivery.title" as="h3" style={{ margin: '0 0 14px', fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 600, color: '#fff' }}>Доставка и получение</T>
              <T k="tariffs.notes.delivery.text" as="p" style={{ color: '#bdbdbd', fontSize: 14, lineHeight: 1.8, fontFamily: "'Inter', sans-serif" }}>
                Доставка и забор автомобиля осуществляются за дополнительную плату в любое удобное место. Работаем 7 дней в неделю, 24 часа в сутки. Свяжитесь с нами для уточнения стоимости.
              </T>
            </div>
          </div>

          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <Link to="/catalog" className="btn btn-filled"><T k="tariffs.cta.button">Выбрать автомобиль</T></Link>
          </div>

        </div>
      </section>
    </>
  );
}
