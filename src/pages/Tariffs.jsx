import { useState } from 'react';
import { Link } from 'react-router-dom';

const fleet = [
  { name: 'Lexus LX 500 D',               d1: 60000,  d6: 55000,  d30: 48000,  deposit: 200000, mileage: 250, over: 200,  photo: 10000 },
  { name: 'Mercedes SL 43 AMG (чёрный)',   d1: 55000,  d6: 50000,  d30: 45000,  deposit: 150000, mileage: 250, over: 250,  photo: 15000 },
  { name: 'Mercedes SL 43 AMG (серый)',    d1: 55000,  d6: 50000,  d30: 45000,  deposit: 150000, mileage: 250, over: 250,  photo: 15000 },
  { name: 'Lamborghini Huracán',           d1: 110000, d6: 100000, d30: 90000,  deposit: 200000, mileage: 150, over: 650,  photo: 20000 },
  { name: 'Lamborghini Urus',              d1: 80000,  d6: 75000,  d30: 65000,  deposit: 200000, mileage: 200, over: 650,  photo: 20000 },
  { name: 'Mercedes G63 AMG',              d1: 70000,  d6: 63000,  d30: 55000,  deposit: 200000, mileage: 250, over: 300,  photo: 15000 },
  { name: 'Ferrari Roma',                  d1: 190000, d6: null,   d30: 120000, deposit: 300000, mileage: 100, over: 1000, photo: 30000 },
  { name: 'BMW M4',                        d1: 30000,  d6: 27000,  d30: 24000,  deposit: 100000, mileage: 250, over: 250,  photo: 10000 },
  { name: 'Ferrari F8 Spider',             d1: 140000, d6: 130000, d30: 100000, deposit: 300000, mileage: 100, over: 650,  photo: 25000 },
  { name: 'Rolls-Royce Wraith',            d1: 85000,  d6: 75000,  d30: 70000,  deposit: 200000, mileage: 150, over: 650,  photo: 25000 },
  { name: 'Porsche 911 Carrera GTS',       d1: 60000,  d6: 55000,  d30: 41000,  deposit: 150000, mileage: 250, over: 250,  photo: 15000 },
  { name: 'Porsche 911 Turbo S',           d1: 85000,  d6: 77000,  d30: 69000,  deposit: 200000, mileage: 250, over: 350,  photo: 15000 },
  { name: 'BMW M5 G90',                    d1: 65000,  d6: 58000,  d30: 52000,  deposit: 200000, mileage: 200, over: 350,  photo: 15000 },
  { name: 'Porsche Panamera',              d1: 40000,  d6: 36000,  d30: 32000,  deposit: 150000, mileage: 250, over: 250,  photo: 15000 },
];

const VAT = 1.22;

function fmt(n) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function price(n, vat) {
  if (n === null) return 'договорная';
  return fmt(vat ? Math.round(n * VAT) : n);
}

export default function Tariffs() {
  const [legal, setLegal] = useState(false);

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
                background: !legal ? 'var(--gold)' : '#111',
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
                background: legal ? 'var(--gold)' : '#111',
                color: legal ? '#000' : '#bdbdbd',
                fontWeight: legal ? 700 : 400,
                transition: 'all .2s',
              }}
            >
              Юридические лица (НДС 22%)
            </button>
          </div>

          {/* Pricing table */}
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
                {fleet.map((car, i) => (
                  <tr
                    key={car.name}
                    style={{
                      background: i % 2 === 0 ? '#0d0d0d' : '#101010',
                      borderBottom: '1px solid #1e1e1e',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a1408'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#0d0d0d' : '#101010'}
                  >
                    <td style={{ padding: '14px 16px', color: '#fff', fontWeight: 500 }}>{car.name}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: 'var(--serif)', fontSize: 14 }}>{price(car.d1, legal)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: 'var(--serif)', fontSize: 14 }}>{price(car.d6, legal)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#bdbdbd', fontStyle: 'italic', fontSize: 12 }}>договорная</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: 'var(--serif)', fontSize: 14 }}>{price(car.d30, legal)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cfcfcf' }}>{fmt(car.deposit)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cfcfcf' }}>{car.mileage} км</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cfcfcf' }}>{car.over} ₽/км</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--gold)', fontFamily: 'var(--serif)', fontSize: 14 }}>{price(car.photo, legal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
