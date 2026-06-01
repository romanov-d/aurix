import { Link } from 'react-router-dom';

export default function LongTerm() {
  return (
    <div className="lt-page">
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Главная</Link><span className="sep">/</span><span>Долгосрочная аренда</span>
          </div>
          <h1>Премиальный авто <em>без покупки</em> и кредитов</h1>
          <p style={{ color: '#bdbdbd', maxWidth: 640, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>
            Аренда от 1 месяца с фиксированным платежом. Полное обслуживание, страховка, замена резины и подменный автомобиль — всё включено.
          </p>
          <div style={{ display: 'flex', gap: 18, marginTop: 28 }}>
            <Link to="/catalog" className="btn btn-filled">Подобрать автомобиль</Link>
            <Link to="/contacts" className="btn">Получить расчёт</Link>
          </div>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Преимущества</span></div>
            <h2>Почему <em>долгосрочная</em> аренда</h2>
          </div>
          <div className="services-grid">
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-currency-rub" /></div><h3>Фиксированная цена</h3><p>Один платёж в месяц — никаких сюрпризов. Ставка фиксируется на весь срок договора.</p></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-wrench" /></div><h3>Сервис включён</h3><p>ТО, замена жидкостей, шиномонтаж и сезонная резина — всё за наш счёт.</p></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-shield-check" /></div><h3>Полная страховка</h3><p>КАСКО + ОСАГО + страхование жизни. Без франшизы при стандартных рисках.</p></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-arrows-left-right" /></div><h3>Замена авто</h3><p>Каждые 6 месяцев можно сменить модель. Подменный автомобиль на время сервиса.</p></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-star" /></div><h3>Без первого взноса</h3><p>Никаких залогов от 3 месяцев аренды для проверенных клиентов и резидентов клуба.</p></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-map-pin" /></div><h3>Подача и возврат</h3><p>Машину привезут и заберут в удобное место. Бесплатно в пределах Москвы.</p></div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Тарифы</span></div>
            <h2>Стоимость <em>аренды</em></h2>
          </div>
          <div className="tariffs">
            <div className="tariff">
              <h3>1 месяц</h3>
              <div className="price">от 720 000 ₽</div>
              <div className="per">в месяц</div>
              <ul>
                <li>Любой автомобиль из автопарка</li>
                <li>3 000 км в месяц включено</li>
                <li>Полная страховка</li>
                <li>Подача и возврат бесплатно</li>
              </ul>
              <Link to="/catalog" className="btn" style={{ width: '100%' }}>Выбрать авто</Link>
            </div>
            <div className="tariff pop">
              <h3>3 месяца</h3>
              <div className="price">от 620 000 ₽</div>
              <div className="per">в месяц · экономия 15%</div>
              <ul>
                <li>Любой автомобиль из автопарка</li>
                <li>4 000 км в месяц включено</li>
                <li>Полная страховка + GAP</li>
                <li>Сервис включён</li>
                <li>Замена авто 1 раз</li>
              </ul>
              <Link to="/catalog" className="btn btn-filled" style={{ width: '100%' }}>Выбрать авто</Link>
            </div>
            <div className="tariff">
              <h3>6+ месяцев</h3>
              <div className="price">от 540 000 ₽</div>
              <div className="per">в месяц · экономия 25%</div>
              <ul>
                <li>Премиум подбор</li>
                <li>5 000 км в месяц включено</li>
                <li>Полная страховка + GAP</li>
                <li>Сервис, шины, мойка</li>
                <li>Подменное авто 24/7</li>
                <li>Клубная карта в подарок</li>
              </ul>
              <Link to="/catalog" className="btn" style={{ width: '100%' }}>Выбрать авто</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
