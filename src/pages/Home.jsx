import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchProvider } from '../components/SearchWidget.jsx';
import { useCars } from '../api/useCars.js';
import DateRangePicker from '../components/DateRangePicker.jsx';

const BRANDS = ['Lexus', 'Mercedes', 'Lamborghini', 'Ferrari', 'BMW', 'Rolls-Royce', 'Porsche'];

const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter4 = new Date(); dayAfter4.setDate(dayAfter4.getDate() + 4);

function brandLogo(name) {
  if (/^mercedes/i.test(name)) return '/mercedes.svg';
  if (/^rolls/i.test(name)) return 'https://logo.clearbit.com/rolls-roycemotorcars.com';
  if (/^lambo/i.test(name)) return 'https://cdn.simpleicons.org/lamborghini';
  if (/^bentley/i.test(name)) return 'https://logo.clearbit.com/bentleymotors.com';
  const slug = name.split(/[\s-]/)[0].toLowerCase();
  return `https://cdn.simpleicons.org/${slug}`;
}

export default function Home() {
  const nav = useNavigate();
  const [fromDate, setFromDate] = useState(toDateStr(tomorrow));
  const [toDate, setToDate]   = useState(toDateStr(dayAfter4));
  const [brand, setBrand]     = useState('');
  const { items: allCars } = useCars({ limit: 12 });
  const specials = allCars.slice(0, 3);
  const hot = allCars.slice(3, 6);
  return (
    <>
      <SearchProvider>
        <section className="first-screen">
          <div className="fs-hero">
            <div className="fs-bg" />
            <div className="fs-hero-grid">
              <div className="fs-hero-left">
                <h1 className="fs-title">Арендуй умно.<br />Води лучше.</h1>
              </div>
              <div className="fs-hero-right">
                <p>Круглосуточная подача по Москве. AURIX делает аренду премиум-авто простой и быстрой.</p>
              </div>
            </div>
          </div>

          <div className="fs-search">
            <div className="fs-search-bar">
              <div className="fs-seg fs-seg-pick">
                <i className="ph-fill ph-map-pin" />
                <span>Москва</span>
              </div>
              <div className="fs-seg fs-seg-dates" style={{ flex: 1, padding: 0, position: 'relative' }}>
                <DateRangePicker
                  from={fromDate}
                  to={toDate}
                  minDate={toDateStr(tomorrow)}
                  variant="hero"
                  onChange={({ from, to }) => { setFromDate(from || toDateStr(tomorrow)); setToDate(to || toDateStr(dayAfter4)); }}
                />
              </div>
              <div className="fs-seg fs-seg-brand">
                <div className="fs-seg-stack">
                  <span className="fs-seg-lbl">Марка</span>
                  <span className="fs-seg-val">{brand || 'Любая'}</span>
                </div>
                <select
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="fs-brand-select"
                >
                  <option value="">Любая марка</option>
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <button className="fs-cta" onClick={() => {
                const p = new URLSearchParams({ from: fromDate, to: toDate });
                if (brand) p.set('brand', brand);
                nav(`/catalog?${p.toString()}`);
              }}>Показать авто</button>
            </div>
          </div>

          <div className="fs-cats">
            <div className="fs-cats-grid">
              {[
                ['ph-jeep', 'Внедорожник', 'Внедорожник'],
                ['ph-car-profile', 'Купе', 'Купе'],
                ['ph-car-profile', 'Кабриолет', 'Кабриолет'],
                ['ph-car-profile', 'Купе/Кабриолет', 'Купе/Кабриолет'],
                ['ph-car', 'Седан', 'Седан'],
              ].map(([ico, name, body]) => (
                <Link key={name} to={`/catalog?body=${encodeURIComponent(body)}`} className="fs-cat">
                  <i className={`ph ${ico}`} />
                  <span>{name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="fs-brands">
            <div className="fs-brands-grid">
              {[
                ['Lexus', 'https://cdn.simpleicons.org/lexus'],
                ['Mercedes', '/mercedes.svg'],
                ['Lamborghini', 'https://cdn.simpleicons.org/lamborghini'],
                ['Ferrari', 'https://cdn.simpleicons.org/ferrari'],
                ['BMW', 'https://cdn.simpleicons.org/bmw'],
                ['Porsche', 'https://cdn.simpleicons.org/porsche'],
                ['Rolls-Royce', 'https://cdn.simpleicons.org/rolls-royce'],
              ].map(([name, url]) => (
                <Link key={name} to={`/catalog?brand=${encodeURIComponent(name)}`} className="fs-brand">
                  <img src={url} alt={name} />
                  <span>{name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

      </SearchProvider>

      <section className="specials reveal">
        <div className="sp-wrap">
          <div className="sp-head">
            <h2>Специальные предложения</h2>
            <Link to="/catalog" className="sp-all">Смотреть все</Link>
          </div>
          <div className="sp-grid">
            {specials.map(c => (
              <div className="sp-card" key={c.id}>
                <div className="sp-img">
                  <span className="sp-badge">Спецпредложение</span>
                  <button className="sp-nav sp-prev" aria-label="prev"><i className="ph ph-caret-left" /></button>
                  <button className="sp-nav sp-next" aria-label="next"><i className="ph ph-caret-right" /></button>
                  <img src={c.img} alt={c.name} />
                </div>
                <div className="sp-info">
                  <div className="sp-info-head">
                    <div>
                      <div className="sp-name">{c.name}</div>
                      <div className="sp-meta">{c.year}, {c.drive}</div>
                    </div>
                    <div className="sp-mark"><i className="ph-fill ph-medal" /></div>
                  </div>
                  <div className="sp-info-foot">
                    <div className="sp-price">{c.price.toLocaleString('ru-RU')} ₽<span>/сутки</span></div>
                    <Link to={`/car/${c.id}`} className="sp-details">Подробнее</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      <section className="reviews reveal">
        <div className="rv-wrap">
          <div className="trust">
            <div className="trust-left">
              <h3>Нам доверяют тысячи довольных клиентов</h3>
              <p>Наша репутация построена на надёжности, качестве сервиса и премиум-авто.</p>
            </div>
            <div className="trust-right">
              <div className="trust-rating">
                <i className="ph-fill ph-google-logo" />
                <span>Google</span>
              </div>
              <div className="trust-stars">
                <i className="ph-fill ph-star" />
                <i className="ph-fill ph-star" />
                <i className="ph-fill ph-star" />
                <i className="ph-fill ph-star" />
                <i className="ph-fill ph-star-half" />
              </div>
              <div className="trust-score">5.0/5.0 (227 отзывов)</div>
            </div>
          </div>

        </div>
        <div className="rv-stage">
          <div className="rv-stage-bg" />
          <img src="/letter.svg" alt="AURIX" className="rv-brand-img" />
          <div className="rv-top">
            <div className="rv-card">
              <div className="rv-stars"><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/></div>
              <p>Первый раз арендовал авто и исследовал город — впечатления отличные. Команда очень профессиональная и надёжная, особенно Дим…</p>
              <a href="#" className="rv-more">Читать дальше</a>
              <div className="rv-author">
                <img className="rv-ava" src="https://randomuser.me/api/portraits/men/32.jpg" alt="" />
                <div><div className="rv-name">Дмитрий Волков</div><div className="rv-when">месяц назад</div></div>
              </div>
            </div>
            <div className="rv-card">
              <div className="rv-stars"><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/></div>
              <p>Автомобиль был чистым и в идеальном состоянии. Получил совершенно новую модель с отличными опциями!</p>
              <div className="rv-author">
                <img className="rv-ava" src="https://randomuser.me/api/portraits/men/45.jpg" alt="" />
                <div><div className="rv-name">Артём Орлов</div><div className="rv-when">3 недели назад</div></div>
              </div>
            </div>
          </div>
          <div className="rv-bot">
            <div className="rv-card">
              <div className="rv-stars"><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/></div>
              <p>Отличный выбор авто. Огромное разнообразие машин в AURIX поразило. Нашёл идеальный вариант для поездки.</p>
              <div className="rv-author">
                <img className="rv-ava" src="https://randomuser.me/api/portraits/men/68.jpg" alt="" />
                <div><div className="rv-name">Иван Соколов</div><div className="rv-when">3 недели назад</div></div>
              </div>
            </div>
            <div className="rv-card">
              <div className="rv-stars"><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/><i className="ph-fill ph-star"/></div>
              <p>Получил отличный опыт аренды этого авто. Спасибо за сервис.</p>
              <div className="rv-author">
                <img className="rv-ava" src="https://randomuser.me/api/portraits/women/52.jpg" alt="" />
                <div><div className="rv-name">Анна Петрова</div><div className="rv-when">месяц назад</div></div>
              </div>
            </div>
          </div>
          <div className="rv-dots">
            <span className="rv-dot active" />
            <span className="rv-dot" />
            <span className="rv-dot" />
            <span className="rv-dot" />
          </div>
        </div>
      </section>

      <section className="hot reveal">
        <div className="hot-wrap">
          <div className="hot-head">
            <h2>Самые горячие спорткары</h2>
            <Link to="/catalog" className="hot-all">Смотреть все</Link>
          </div>
          <div className="hot-grid">
            {hot.map(c => (
              <div className="hot-card" key={c.id}>
                <div className="hot-img">
                  <button className="sp-nav sp-prev" aria-label="prev"><i className="ph ph-caret-left" /></button>
                  <button className="sp-nav sp-next" aria-label="next"><i className="ph ph-caret-right" /></button>
                  <img src={c.img} alt={c.name} />
                </div>
                <div className="hot-info">
                  <div className="hot-info-head">
                    <div>
                      <div className="hot-name">{c.name}</div>
                      <div className="hot-meta">{c.year}, {c.drive}</div>
                    </div>
                    <img className="hot-mark" src={brandLogo(c.name)} alt="" />
                  </div>
                  <div className="hot-info-foot">
                    <div className="hot-price">{c.price.toLocaleString('ru-RU')} ₽<span>/сутки</span></div>
                    <Link to={`/car/${c.id}`} className="hot-details">Подробнее</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sub-banner">
            <div className="sub-banner-bg" />
            <div className="sub-mark">
              <img src="/letter.svg" alt="A" className="sub-mark-letter" />
              <span className="sub-mark-text">АРЕНДА</span>
            </div>
            <div className="sub-banner-text">
              <h3>Хотите арендовать дольше?</h3>
              <p>Оформите подписку AURIX+ на длительный период.</p>
            </div>
            <Link to="/long-term" className="sub-banner-cta">Подобрать подписку</Link>
          </div>
        </div>
      </section>

      <section className="partner reveal">
        <div className="pt-wrap">
          <div className="pt-photo pt-photo-2">
            <img src="https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?w=1200&auto=format&fit=crop&q=80" alt="" />
            <div className="pt-photo-caption">
              <div className="pt-photo-caption-acc">Удобное решение для вашего комфорта</div>
              <div className="pt-photo-caption-main">Зарабатывайте больше. Без усилий.</div>
            </div>
          </div>
          <div className="pt-panel">
            <img src="/letter.svg" alt="A" className="pt-mark-letter" />
            <h2 className="pt-title"><span className="pt-title-accent">Сдаёте</span> авто<br />в аренду?</h2>
            <p className="pt-desc">Покажите свой автопарк премиум-клиентам. Получайте брони. Полный контроль.</p>
            <Link to="/rent-out" className="pt-cta">Разместить авто</Link>
          </div>
        </div>
      </section>

      <section className="delivery reveal">
        <div className="dl-grid">
          <div className="dl-left">
            <h2 className="dl-title">Доставка и получение<br/>автомобиля</h2>
            <p className="dl-lead">AURIX предлагает гибкие варианты получения и доставки авто, чтобы подстроиться под ваш график. Заберите авто в офисе или закажите доставку — быстро, удобно, по всей Москве.</p>
            <div className="dl-cards">
              <div className="dl-card">
                <div className="dl-card-ico"><i className="ph-fill ph-storefront" /></div>
                <div>
                  <h4>Получение в офисе</h4>
                  <p>Приезжайте в наш офис и заберите авто сами. Команда подготовит машину к вашему приезду — никаких ожиданий.</p>
                </div>
              </div>
              <div className="dl-card">
                <div className="dl-card-ico"><i className="ph-fill ph-truck" /></div>
                <div>
                  <h4>Доставка</h4>
                  <ul className="dl-list">
                    <li><strong>Бесплатная доставка по Москве.</strong> Доставим выбранный авто в любую точку города — отель, дом, офис — 24/7, без доплат и залога.</li>
                    <li><strong>Доставка по области.</strong> Подача в Подмосковье и соседние регионы. Стоимость зависит от расстояния, но скорость и качество — на уровне.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="dl-right">
            <iframe
              className="dl-map"
              title="Карта"
              src="https://maps.google.com/maps?q=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2C+%D0%9E%D0%BB%D0%B8%D0%BC%D0%BF%D0%B8%D0%B9%D1%81%D0%BA%D0%B8%D0%B9+%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82+12&t=&z=15&ie=UTF8&iwloc=&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="dl-pin">
              <div className="dl-pin-ico"><i className="ph-fill ph-buildings" /></div>
              <div className="dl-pin-info">
                <div className="dl-pin-title">Наш офис</div>
                <div className="dl-pin-line">Москва, Олимпийский проспект, 12</div>
                <div className="dl-pin-line">Работаем 24/7</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="why reveal">
        <div className="why-wrap">
          <h2 className="why-title">Почему выбирают нас?</h2>
          <div className="why-grid">
            <div className="why-card why-yellow">
              <div className="why-num">01</div>
              <h4>Полная страховка</h4>
              <p>В стоимость включены КАСКО и ОСАГО. При ДТП не по вашей вине — <strong>ответственность 0 ₽</strong>. Никаких скрытых доплат.</p>
            </div>
            <div className="why-card why-dark why-tall">
              <div className="why-num">02</div>
              <h4>Доставка 24/7</h4>
              <p>Нужен авто в аэропорт в 2 ночи или в отель в полдень? Доставим в любое время, в любую точку Москвы.</p>
            </div>
            <div className="why-photo">
              <img src="https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200&auto=format&fit=crop&q=80" alt="" />
            </div>
            <div className="why-card why-dark">
              <div className="why-num">03</div>
              <h4>Новые автомобили<br/>со всеми опциями</h4>
              <p>Весь автопарк — новые модели с минимальным пробегом и полной комплектацией. Комфорт, стиль и динамика в каждой поездке.</p>
            </div>
            <div className="why-card why-yellow">
              <div className="why-num">04</div>
              <h4>Прозрачные цены<br/>и полная страховка</h4>
              <p>Никаких скрытых платежей. Чёткая цена и страхование в каждой аренде — сосредоточьтесь на дороге, а не на деталях.</p>
            </div>
          </div>
        </div>
      </section>

      <Faq />
    </>
  );
}

function Faq() {
  const items = [
    ['Можно ли арендовать авто в аэропорту даже поздно ночью?', 'Конечно. AURIX осуществляет круглосуточную доставку, включая аэропорты Москвы. Просто сообщите номер рейса и время прибытия — автомобиль будет ждать вас, без задержек и ожиданий.'],
    ['Может ли управлять автомобилем кто-то ещё, например, друг или член семьи?', 'Да, при оформлении договора можно указать дополнительного водителя. У него должны быть права с необходимым стажем и подходящий возраст.'],
    ['Какие документы нужны для аренды авто в Москве?', 'Паспорт, водительское удостоверение со стажем от 3 лет и банковская карта на имя арендатора. Для некоторых классов авто требуется дополнительный документ.'],
    ['Можно ли арендовать без банковской карты?', 'В большинстве случаев нужна именная банковская карта для авторизации залога. Возможна оплата наличными после подтверждения личности.'],
    ['Что входит в договор аренды?', 'Договор включает полную страховку КАСКО и ОСАГО, базовый километраж, техподдержку 24/7 и круглосуточную помощь на дороге.'],
    ['Как работают платные дороги и проезды?', 'Все платные участки автоматически фиксируются и оплачиваются через ваш договор. Подробный отчёт приходит на email после возврата авто.'],
  ];
  const [open, setOpen] = useState(0);
  return (
    <section className="faq reveal">
      <div className="faq-wrap">
        <div className="faq-left">
          <h2>Часто задаваемые<br/>вопросы</h2>
          <p>Собрали ответы на самые популярные вопросы об аренде премиум-авто в AURIX, чтобы вы могли спокойно планировать поездку без сомнений.</p>
        </div>
        <div className="faq-right">
          {items.map(([q, a], i) => (
            <div key={i} className={`faq-item${open === i ? ' open' : ''}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{q}</span>
                <i className={`ph ${open === i ? 'ph-x' : 'ph-plus'}`} />
              </button>
              <div className="faq-a-wrap"><div><div className="faq-a">{a}</div></div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
