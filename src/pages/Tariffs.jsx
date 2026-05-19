import { Link } from 'react-router-dom';

export default function Tariffs() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/">Главная</Link><span className="sep">/</span><span>Тарифы</span></div>
          <h1>Тарифы <em>и цены</em></h1>
          <p style={{ color: '#bdbdbd', maxWidth: 640, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>Прозрачное ценообразование без скрытых платежей. Цена зависит от модели, дня недели и срока аренды.</p>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="tariffs">
            <div className="tariff">
              <h3>Day Drive</h3>
              <div className="price">от 32 000 ₽</div>
              <div className="per">сутки · будни</div>
              <ul>
                <li>1–2 суток аренды</li>
                <li>200 км/сутки</li>
                <li>Полная страховка</li>
                <li>Подача в пределах МКАД</li>
                <li>Поддержка 24/7</li>
              </ul>
              <Link to="/catalog" className="btn" style={{ width: '100%' }}>Забронировать</Link>
            </div>
            <div className="tariff pop">
              <h3>Weekend</h3>
              <div className="price">от 44 000 ₽</div>
              <div className="per">сутки · Пт–Вс</div>
              <ul>
                <li>Уикенд-тариф 3 дня</li>
                <li>300 км/сутки</li>
                <li>Полная страховка + GAP</li>
                <li>Бесплатная подача</li>
                <li>Полный бак при выдаче</li>
                <li>Скидка −10% при бронировании</li>
              </ul>
              <Link to="/catalog" className="btn btn-filled" style={{ width: '100%' }}>Забронировать</Link>
            </div>
            <div className="tariff">
              <h3>Week & More</h3>
              <div className="price">от 28 000 ₽</div>
              <div className="per">сутки · от 7 дней</div>
              <ul>
                <li>От 7 суток аренды</li>
                <li>400 км/сутки</li>
                <li>Снижение залога −50%</li>
                <li>Премиум-сервис</li>
                <li>Замена шин по сезону</li>
                <li>Скидка −15%</li>
              </ul>
              <Link to="/catalog" className="btn" style={{ width: '100%' }}>Забронировать</Link>
            </div>
          </div>

          <div className="divider-h"></div>

          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Динамическая цена</span></div>
            <h2>Цена зависит от <em>дня недели</em></h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            <div style={{ background: '#101010', padding: '24px 18px', textAlign: 'center' }}><div className="muted" style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase' }}>Пн</div><div className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 8 }}>38 000 ₽</div></div>
            <div style={{ background: '#101010', padding: '24px 18px', textAlign: 'center' }}><div className="muted" style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase' }}>Вт</div><div className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 8 }}>38 000 ₽</div></div>
            <div style={{ background: '#101010', padding: '24px 18px', textAlign: 'center' }}><div className="muted" style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase' }}>Ср</div><div className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 8 }}>38 000 ₽</div></div>
            <div style={{ background: '#101010', padding: '24px 18px', textAlign: 'center' }}><div className="muted" style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase' }}>Чт</div><div className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 8 }}>40 000 ₽</div></div>
            <div style={{ background: '#1a1408', padding: '24px 18px', textAlign: 'center', borderTop: '2px solid var(--gold)' }}><div className="gold" style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase' }}>Пт</div><div className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 8 }}>44 000 ₽</div></div>
            <div style={{ background: '#1a1408', padding: '24px 18px', textAlign: 'center', borderTop: '2px solid var(--gold)' }}><div className="gold" style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase' }}>Сб</div><div className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 8 }}>46 000 ₽</div></div>
            <div style={{ background: '#1a1408', padding: '24px 18px', textAlign: 'center', borderTop: '2px solid var(--gold)' }}><div className="gold" style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase' }}>Вс</div><div className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 8 }}>44 000 ₽</div></div>
          </div>
          <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 18, letterSpacing: '.06em' }}>* Пример для Mercedes-AMG SL 43. Точная цена рассчитывается на странице автомобиля.</p>

          <div className="divider-h"></div>

          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Дополнительно</span></div>
            <h2>Доп. <em>услуги</em></h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            <div style={{ background: '#101010', padding: '20px 24px', display: 'flex', justifyContent: 'space-between' }}><span>Подача в аэропорт (Шереметьево, Внуково, Домодедово)</span><b className="gold serif">5 000 ₽</b></div>
            <div style={{ background: '#101010', padding: '20px 24px', display: 'flex', justifyContent: 'space-between' }}><span>Подача за пределы МКАД</span><b className="gold serif">от 80 ₽/км</b></div>
            <div style={{ background: '#101010', padding: '20px 24px', display: 'flex', justifyContent: 'space-between' }}><span>Дополнительный водитель</span><b className="gold serif">2 000 ₽/сут</b></div>
            <div style={{ background: '#101010', padding: '20px 24px', display: 'flex', justifyContent: 'space-between' }}><span>Личный водитель</span><b className="gold serif">от 12 000 ₽/сут</b></div>
            <div style={{ background: '#101010', padding: '20px 24px', display: 'flex', justifyContent: 'space-between' }}><span>Детское кресло</span><b className="gold serif">800 ₽/сут</b></div>
            <div style={{ background: '#101010', padding: '20px 24px', display: 'flex', justifyContent: 'space-between' }}><span>Снятие франшизы</span><b className="gold serif">1 500 ₽/сут</b></div>
          </div>
        </div>
      </section>
    </>
  );
}
