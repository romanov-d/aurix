import { Link } from 'react-router-dom';
import T from '../components/T.jsx';

export default function LongTerm() {
  return (
    <div className="lt-page">
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/"><T k="longterm.head.crumbHome">Главная</T></Link><span className="sep">/</span><span><T k="longterm.head.crumbCurrent">Долгосрочная аренда</T></span>
          </div>
          <T k="longterm.head.title" as="h1" html>Премиальное авто <em>в долгосрочную аренду</em></T>
          <T k="longterm.head.lead" as="p" style={{ color: '#bdbdbd', maxWidth: 640, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>
            Подписка AURIX MOTORS от 1 месяца с фиксированным ежемесячным платежом. Свежий автомобиль премиум-класса, полное обслуживание, страховка, сезонная резина и подменное авто — всё включено в один платёж. Меняйте модель, когда захотите, без забот о покупке и содержании.
          </T>
          <div style={{ display: 'flex', gap: 18, marginTop: 28 }}>
            <Link to="/catalog" className="btn btn-filled"><T k="longterm.head.cta1">Подобрать автомобиль</T></Link>
            <Link to="/contacts" className="btn"><T k="longterm.head.cta2">Получить расчёт</T></Link>
          </div>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow"><T k="longterm.benefits.eyebrow">Преимущества</T></span></div>
            <T k="longterm.benefits.title" as="h2" html>Почему <em>долгосрочная</em> аренда</T>
          </div>
          <div className="services-grid">
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-currency-rub" /></div><T k="longterm.benefits.item0title" as="h3">Фиксированная цена</T><T k="longterm.benefits.item0text" as="p">Один платёж в месяц — никаких сюрпризов. Ставка фиксируется на весь срок договора.</T></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-wrench" /></div><T k="longterm.benefits.item1title" as="h3">Сервис включён</T><T k="longterm.benefits.item1text" as="p">ТО, замена жидкостей, шиномонтаж и сезонная резина — всё за наш счёт.</T></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-shield-check" /></div><T k="longterm.benefits.item2title" as="h3">Полная страховка</T><T k="longterm.benefits.item2text" as="p">КАСКО + ОСАГО + страхование жизни. Без франшизы при стандартных рисках.</T></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-arrows-left-right" /></div><T k="longterm.benefits.item3title" as="h3">Замена авто</T><T k="longterm.benefits.item3text" as="p">Каждые 6 месяцев можно сменить модель. Подменный автомобиль на время сервиса.</T></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-lock" /></div><T k="longterm.benefits.item4title" as="h3">Залог обязателен</T><T k="longterm.benefits.item4text" as="p">Залог оформляется всегда и возвращается после сдачи автомобиля — гарантия сохранности премиального авто.</T></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-hand-coins" /></div><T k="longterm.benefits.item6title" as="h3">Без первого взноса</T><T k="longterm.benefits.item6text" as="p">Никаких первоначальных платежей — начинаете пользоваться автомобилем сразу, оплата помесячно.</T></div>
            <div className="service"><div className="ico-wrap"><i className="ph-fill ph-map-pin" /></div><T k="longterm.benefits.item5title" as="h3">Подача и возврат</T><T k="longterm.benefits.item5text" as="p">Машину привезут и заберут в удобное место. Бесплатно в пределах Москвы.</T></div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow"><T k="longterm.tariffs.eyebrow">Тарифы</T></span></div>
            <T k="longterm.tariffs.title" as="h2" html>Стоимость <em>аренды</em></T>
          </div>
          <div className="tariffs">
            <div className="tariff">
              <T k="longterm.tariffs.p1title" as="h3">1 месяц</T>
              <div className="price"><T k="longterm.tariffs.p1price">от 720 000 ₽</T></div>
              <div className="per"><T k="longterm.tariffs.p1per">в месяц</T></div>
              <ul>
                <li><T k="longterm.tariffs.p1f0">Любой автомобиль из автопарка</T></li>
                <li><T k="longterm.tariffs.p1f1">3 000 км в месяц включено</T></li>
                <li><T k="longterm.tariffs.p1f2">Полная страховка</T></li>
                <li><T k="longterm.tariffs.p1f3">Подача и возврат бесплатно</T></li>
              </ul>
              <Link to="/catalog" className="btn" style={{ width: '100%' }}><T k="longterm.tariffs.cta">Выбрать авто</T></Link>
            </div>
            <div className="tariff pop">
              <T k="longterm.tariffs.p3title" as="h3">3 месяца</T>
              <div className="price"><T k="longterm.tariffs.p3price">от 620 000 ₽</T></div>
              <div className="per"><T k="longterm.tariffs.p3per">в месяц · экономия 15%</T></div>
              <ul>
                <li><T k="longterm.tariffs.p3f0">Любой автомобиль из автопарка</T></li>
                <li><T k="longterm.tariffs.p3f1">4 000 км в месяц включено</T></li>
                <li><T k="longterm.tariffs.p3f2">Полная страховка + GAP</T></li>
                <li><T k="longterm.tariffs.p3f3">Сервис включён</T></li>
                <li><T k="longterm.tariffs.p3f4">Замена авто 1 раз</T></li>
              </ul>
              <Link to="/catalog" className="btn btn-filled" style={{ width: '100%' }}><T k="longterm.tariffs.cta">Выбрать авто</T></Link>
            </div>
            <div className="tariff">
              <T k="longterm.tariffs.p6title" as="h3">6+ месяцев</T>
              <div className="price"><T k="longterm.tariffs.p6price">от 540 000 ₽</T></div>
              <div className="per"><T k="longterm.tariffs.p6per">в месяц · экономия 25%</T></div>
              <ul>
                <li><T k="longterm.tariffs.p6f0">Премиум подбор</T></li>
                <li><T k="longterm.tariffs.p6f1">5 000 км в месяц включено</T></li>
                <li><T k="longterm.tariffs.p6f2">Полная страховка + GAP</T></li>
                <li><T k="longterm.tariffs.p6f3">Сервис, шины, мойка</T></li>
                <li><T k="longterm.tariffs.p6f4">Подменное авто 24/7</T></li>
                <li><T k="longterm.tariffs.p6f5">Клубная карта в подарок</T></li>
              </ul>
              <Link to="/catalog" className="btn" style={{ width: '100%' }}><T k="longterm.tariffs.cta">Выбрать авто</T></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
