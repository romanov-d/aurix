import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const VAT = 1.22;

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('ru-RU') + ' ₽';
}

function price(n, vat) {
  if (n === null || n === undefined) return 'договорная';
  return fmt(vat ? Math.round(n * VAT) : n);
}

export default function Tariffs() {
  const [legal, setLegal] = useState(false);
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
            <Link to="/">Главная</Link><span className="sep">/</span><span>Тарифы</span>
          </div>
          <h1>Тарифы <em>и цены</em></h1>
          <p style={{ color: '#bdbdbd', maxWidth: 640, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>
            Прозрачное ценообразование без скрытых платежей. Стоимость зависит от модели и срока аренды.
          </p>
        </div>
      </div>

      <section>
        <div className="container">

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 32, background: 'var(--line)', border: '1px solid var(--line)', width: 'fit-content' }}>
            <button
              onClick={() => setLegal(false)}
              style={{
                padding: '12px 28px',
                fontSize: 13,
                letterSpacing: '.08em',
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: 'none',
                background: !legal ? 'var(--gold)' : 'var(--bg-2)',
                color: !legal ? '#000' : '#bdbdbd',
                fontWeight: !legal ? 700 : 400,
                transition: 'all .2s',
              }}
            >
              Физические лица
            </button>
            <button
              onClick={() => setLegal(true)}
              style={{
                padding: '12px 28px',
                fontSize: 13,
                letterSpacing: '.08em',
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: 'none',
                background: legal ? 'var(--gold)' : 'var(--bg-2)',
                color: legal ? '#000' : '#bdbdbd',
                fontWeight: legal ? 700 : 400,
                transition: 'all .2s',
              }}
            >
              Юридические лица (НДС 22%)
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#bdbdbd' }}>
              Загрузка тарифов...
            </div>
          ) : error ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#e74c3c' }}>
              {error}
            </div>
          ) : (
            /* Pricing table */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 }}>
                <thead>
                  <tr style={{ background: '#181818', borderBottom: '1px solid var(--gold)' }}>
                    <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11, minWidth: 200 }}>Автомобиль</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}>1–5 дней</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}>6–12 дней</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}>от 13 дней</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}>от 30 дней</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}>Залог</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}>Пробег/сут</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}>Перекат/км</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 600, letterSpacing: '.06em', color: '#bdbdbd', textTransform: 'uppercase', fontSize: 11 }}>Фотосессия/час</th>
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
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: 'var(--serif)', fontSize: 14 }}>{price(car.price_per_day, legal)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: 'var(--serif)', fontSize: 14 }}>{price(car.price_6_12, legal)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#bdbdbd', fontStyle: 'italic', fontSize: 12 }}>договорная</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: 'var(--serif)', fontSize: 14 }}>{price(car.price_30, legal)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cfcfcf' }}>{fmt(car.deposit)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cfcfcf' }}>{car.mileage_limit} км</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cfcfcf' }}>{car.overmileage_rate} ₽/км</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: 'var(--serif)', fontSize: 14 }}>{price(car.photo_rate, legal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {legal && (
            <p className="muted" style={{ fontSize: 12, marginTop: 12, letterSpacing: '.06em' }}>
              * Цены для юридических лиц включают НДС 22%. Счёт с НДС предоставляется по запросу.
            </p>
          )}

          <div className="divider-h"></div>

          {/* Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            <div style={{ background: '#101010', padding: '28px 32px' }}>
              <div className="row-eyebrow" style={{ marginBottom: 12 }}>
                <span className="bar"></span><span className="eyebrow">Аренда для фотосессий</span>
              </div>
              <p style={{ color: '#bdbdbd', fontSize: 14, lineHeight: 1.8 }}>
                Автомобиль можно арендовать для фотосессии или съёмки без пробега. Тариф указан за час. Возможна подача в любое место Москвы и МО. Уточняйте наличие и условия у менеджера.
              </p>
            </div>
            <div style={{ background: '#101010', padding: '28px 32px' }}>
              <div className="row-eyebrow" style={{ marginBottom: 12 }}>
                <span className="bar"></span><span className="eyebrow">Подарочные сертификаты</span>
              </div>
              <p style={{ color: '#bdbdbd', fontSize: 14, lineHeight: 1.8 }}>
                Подарочный сертификат на аренду любого автомобиля из парка. Стоимость сертификата равна стоимости одних суток аренды выбранного автомобиля. Срок действия — 1 год с даты оформления.
              </p>
            </div>
            <div style={{ background: '#101010', padding: '28px 32px' }}>
              <div className="row-eyebrow" style={{ marginBottom: 12 }}>
                <span className="bar"></span><span className="eyebrow">Доставка и получение</span>
              </div>
              <p style={{ color: '#bdbdbd', fontSize: 14, lineHeight: 1.8 }}>
                Доставка и забор автомобиля осуществляются за дополнительную плату в любое удобное место. Работаем 7 дней в неделю, 24 часа в сутки. Свяжитесь с нами для уточнения стоимости.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <Link to="/catalog" className="btn btn-filled">Выбрать автомобиль</Link>
          </div>

        </div>
      </section>
    </>
  );
}

