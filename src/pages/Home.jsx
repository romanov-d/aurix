import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchProvider } from '../components/SearchWidget.jsx';
import { useCars } from '../api/useCars.js';
import DateRangePicker from '../components/DateRangePicker.jsx';
import CarCard from '../components/CarCard.jsx';
import CircularGallery from '../components/CircularGallery.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { api } from '../api/client.js';

const AV = (id) => `https://images.unsplash.com/${id}?w=160&h=160&fit=crop&crop=faces&q=80`;
const REVIEWS = [
  { name: 'Анатолий Яров',      when: 'месяц назад',   rating: 5, avatar: AV('photo-1500648767791-00dcc994a43e'), text: 'Первый раз арендовал авто и исследовал Москву — впечатления отличные. Команда профессиональная, каждая деталь продумана.' },
  { name: 'Святослав Гордеев',  when: '3 недели назад', rating: 5, avatar: AV('photo-1519085360753-af0119f7cbe7'), text: 'Автомобиль чистый, в идеальном состоянии. Совершенно новая модель с полной комплектацией — ничего лишнего.' },
  { name: 'Аркадий Лозинский',  when: '3 недели назад', rating: 5, avatar: AV('photo-1506794778202-cad84cf45f1d'), text: 'Огромный выбор машин в AURIX MOTORS поразил. Нашёл именно то, что нужно. Рекомендую всем!' },
  { name: 'Ярослава Кравец',    when: 'месяц назад',   rating: 5, avatar: AV('photo-1438761681033-6461ffad8d80'), text: 'Быстрое оформление, вежливые менеджеры. Обязательно арендую снова. Спасибо за сервис!' },
  { name: 'Глеб Северин',       when: '2 недели назад', rating: 5, avatar: AV('photo-1472099645785-5658abf4ff4e'), text: 'Подача точно в срок, документы оформили за 10 минут. Всё на высшем уровне. 10 из 10.' },
  { name: 'Ростислав Невзоров', when: 'неделю назад',  rating: 5, avatar: AV('photo-1488161628813-04466f872be2'), text: 'Арендовал Porsche Panamera — незабываемо. AURIX MOTORS — это другой уровень аренды авто в Москве.' },
];

const BRANDS = ['Lexus', 'Mercedes', 'Lamborghini', 'Ferrari', 'BMW', 'Rolls-Royce', 'Porsche'];

const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter4 = new Date(); dayAfter4.setDate(dayAfter4.getDate() + 4);

function brandLogo(name) {
  if (/^mercedes/i.test(name)) return '/mercedes.svg';
  if (/^rolls/i.test(name)) return '/rolls-royce.svg';
  if (/^lambo/i.test(name)) return '/lamborghini.svg';
  if (/^bentley/i.test(name)) return 'https://logo.clearbit.com/bentleymotors.com';
  if (/^lexus/i.test(name)) return '/lexus.svg';
  if (/^ferrari/i.test(name)) return '/ferrari.svg';
  if (/^bmw/i.test(name)) return '/bmw.svg';
  if (/^porsche/i.test(name)) return '/porsche.svg';
  const slug = name.split(/[\s-]/)[0].toLowerCase();
  return `https://cdn.simpleicons.org/${slug}`;
}

// Car body-type icons — 3D renders, all facing left
function CarIcon({ kind }) {
  const file = { suv: 'suv', coupe: 'coupe', cabrio: 'cabrio', roadster: 'coupe-cabrio', sedan: 'sedan' }[kind];
  return <img className="fs-cat-img" src={`/cars/icons/${file}.png`} alt="" loading="lazy" />;
}

export default function Home() {
  const nav = useNavigate();
  const [fromDate, setFromDate] = useState(toDateStr(tomorrow));
  const [toDate, setToDate]   = useState(toDateStr(dayAfter4));
  const [brand, setBrand]     = useState('');
  const [visibleCount, setVisibleCount] = useState(6);
  const [isMobileRv, setIsMobileRv] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width:800px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width:800px)');
    const onChange = () => setIsMobileRv(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const { items: allCars } = useCars({ limit: 100 });
  const specials = allCars.slice(0, visibleCount);
  const hot = allCars.slice(0, 6);
  return (
    <>
      <SearchProvider>
        <section className="first-screen">
          <div className="fs-hero">
            <div className="fs-bg" />
            <div className="fs-hero-grid">
              <div className="fs-hero-left">
                <h1 className="fs-title">AURIX MOTORS — это не просто аренда.<br /><span className="fs-title-gold">Это стиль жизни.</span></h1>
                <p className="fs-hero-lead">Круглосуточная подача по Москве. AURIX MOTORS делает аренду премиум-авто простой и быстрой.</p>
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

          <div className="fs-perks-wrap">
            <div className="fs-perks">
              {[
                ['ph-shield-check', 'Полная страховка', 'Каско и ОСАГО включены в стоимость'],
                ['ph-clock', 'Подача 24/7', 'Доставим авто в удобное для вас время'],
                ['ph-sparkle', 'Без оклейки', 'Все авто без брендирования и наклеек'],
                ['ph-bell', 'Консьерж-сервис', 'Персональный менеджер на весь период аренды'],
                ['ph-airplane-tilt', 'Аэропорты и отели', 'Подача в любую точку Москвы и МО'],
                ['ph-diamond', 'Клуб привилегий', 'Доступ к закрытым мероприятиям и бонусам'],
              ].map(([ico, title, desc]) => (
                <div className="fs-perk" key={title}>
                  <i className={`ph-fill ${ico}`} />
                  <div className="fs-perk-title">{title}</div>
                  <div className="fs-perk-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cats-section reveal">
          <div className="fs-cats">
            <div className="fs-cats-head">
              <h2>Категории автопарка</h2>
              <Link to="/catalog" className="fs-cats-all">Смотреть весь автопарк →</Link>
            </div>
            <div className="fs-cats-grid">
              {[
                ['suv', 'Внедорожники', 'Внедорожник', 15000],
                ['coupe', 'Купе', 'Купе', 12000],
                ['cabrio', 'Кабриолеты', 'Кабриолет', 16000],
                ['roadster', 'Купе/Кабриолеты', 'Купе/Кабриолет', 14000],
                ['sedan', 'Седаны', 'Седан', 10000],
              ].map(([kind, name, body, price]) => (
                <Link key={name} to={`/catalog?body=${encodeURIComponent(body)}`} className="fs-cat">
                  <CarIcon kind={kind} />
                  <div className="fs-cat-shade" />
                  <div className="fs-cat-top">
                    <div>
                      <div className="fs-cat-name">{name}</div>
                      <div className="fs-cat-price">от {price.toLocaleString('ru-RU')} ₽/сутки</div>
                    </div>
                    <i className="ph ph-arrow-right" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="fs-brands">
            <div className="fs-brands-grid">
              {[
                ['Lexus', '/lexus.svg'],
                ['Mercedes', '/mercedes.svg'],
                ['Lamborghini', '/lamborghini.svg'],
                ['Ferrari', '/ferrari.svg'],
                ['BMW', '/bmw.svg'],
                ['Porsche', '/porsche.svg'],
                ['Rolls-Royce', '/rolls-royce.svg'],
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

      <section className="exp reveal">
        <div className="exp-wrap">
          <div className="exp-head">
            <h2 className="exp-title">Мы создаём опыт,<br />который запоминается</h2>
            <p className="exp-lead">AURIX MOTORS — это не просто аренда авто. Это стиль жизни, свобода и эмоции за рулём лучших автомобилей мира.</p>
          </div>
          <div className="exp-photos">
            {/* TODO: заменить на реальные фото (офис / руль / авто) */}
            <div className="exp-photo"><img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=700&q=80&auto=format&fit=crop" alt="" loading="lazy" /></div>
            <div className="exp-photo"><img src="https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=700&q=80&auto=format&fit=crop" alt="" loading="lazy" /></div>
            <div className="exp-photo"><img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=700&q=80&auto=format&fit=crop" alt="" loading="lazy" /></div>
          </div>
        </div>
      </section>

      <section className="specials reveal">
        <div className="sp-wrap">
          <div className="sp-head">
            <h2>Наш автопарк</h2>
            <Link to="/catalog" className="sp-all">Смотреть все</Link>
          </div>
          <div className="catalog-grid" style={{ marginTop: 24 }}>
            {specials.map(c => <CarCard key={c.id} car={c} />)}
          </div>
          {visibleCount < allCars.length && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button
                className="btn"
                style={{ padding: '14px 48px', fontSize: 15 }}
                onClick={() => setVisibleCount(v => v + 6)}
              >
                Ещё авто
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="rv2-section reveal">
        <div className="rv2-inner">
          <div className="trust-heading" style={{ paddingBottom: 0 }}>
            <h2 className="trust-h">
              Что говорят
              <span className="rph-wrap">
                <span className="rph-car">
                  <img src="/cars/ferrari_f8_hero.webp" alt="" />
                </span>
              </span>
              о нас
            </h2>
            <h2 className="trust-h trust-h-muted">тысячи клиентов</h2>
          </div>
          {isMobileRv ? (
            <div className="rv-mob">
              {REVIEWS.map((r, i) => (
                <div className="rv-mob-card" key={i}>
                  <div className="rv-mob-stars">★★★★★</div>
                  <p className="rv-mob-text">{r.text}</p>
                  <div className="rv-mob-foot">
                    <img className="rv-mob-ava" src={r.avatar} alt={r.name} loading="lazy" />
                    <div className="rv-mob-who">
                      <b>{r.name}</b>
                      <small>{r.when}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rv2-gallery">
              <ErrorBoundary name="reviews-gallery" fallback={null}>
                <CircularGallery reviews={REVIEWS} bend={2} scrollSpeed={2} scrollEase={0.04} />
              </ErrorBoundary>
            </div>
          )}
        </div>
      </section>

      <div className="sp-wrap">
        <div className="sub-banner">
          <div className="sub-banner-left">
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
          <div className="sub-banner-right">
            <img src="/cars/lexus_lx_hero.webp" alt="Lexus LX" className="sub-banner-car" />
          </div>
        </div>
      </div>

      {/* Блок «Сдаёте авто в аренду?» временно скрыт — аренда чужих авто пока не принимается.
          Не удалять: вернуть, когда снова будем брать авто в аренду. */}
      {false && (
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
      )}

      <section className="delivery reveal">
        <div className="dl-grid">
          <div className="dl-left">
            <h2 className="dl-title">Доставка и получение<br/>автомобиля</h2>
            <p className="dl-lead">AURIX MOTORS предлагает гибкие варианты получения и доставки авто, чтобы подстроиться под ваш график. Заберите авто в офисе или закажите доставку — быстро, удобно, по всей Москве.</p>
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

const FAQ_FALLBACK = [
  { question: 'Можно ли арендовать авто в аэропорту даже поздно ночью?', answer: 'Конечно. AURIX MOTORS осуществляет круглосуточную доставку, включая аэропорты Москвы. Просто сообщите номер рейса и время прибытия — автомобиль будет ждать вас, без задержек и ожиданий.' },
  { question: 'Может ли управлять автомобилем кто-то ещё, например, друг или член семьи?', answer: 'Да, при оформлении договора можно указать дополнительного водителя. У него должны быть права с необходимым стажем и подходящий возраст.' },
  { question: 'Какие документы нужны для аренды авто в Москве?', answer: 'Паспорт, водительское удостоверение со стажем от 3 лет и банковская карта на имя арендатора. Для некоторых классов авто требуется дополнительный документ.' },
  { question: 'Можно ли арендовать без банковской карты?', answer: 'В большинстве случаев нужна именная банковская карта для авторизации залога. Возможна оплата наличными после подтверждения личности.' },
  { question: 'Что входит в договор аренды?', answer: 'Договор включает полную страховку КАСКО и ОСАГО, базовый километраж, техподдержку 24/7 и круглосуточную помощь на дороге.' },
  { question: 'Как работают платные дороги и проезды?', answer: 'Все платные участки автоматически фиксируются и оплачиваются через ваш договор. Подробный отчёт приходит на email после возврата авто.' },
];

function Faq() {
  const [items, setItems] = useState(FAQ_FALLBACK);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    api('/faq')
      .then((data) => { if (Array.isArray(data) && data.length) setItems(data); })
      .catch((err) => console.error('Ошибка загрузки FAQ:', err));
  }, []);

  return (
    <section className="faq reveal">
      <div className="faq-wrap">
        <div className="faq-left">
          <h2>Часто задаваемые<br/>вопросы</h2>
          <p>Собрали ответы на самые популярные вопросы об аренде премиум-авто в AURIX MOTORS, чтобы вы могли спокойно планировать поездку без сомнений.</p>
        </div>
        <div className="faq-right">
          {items.map((item, i) => (
            <div key={item.id || i} className={`faq-item${open === i ? ' open' : ''}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{item.question}</span>
                <i className={`ph ${open === i ? 'ph-x' : 'ph-plus'}`} />
              </button>
              <div className="faq-a-wrap"><div><div className="faq-a">{item.answer}</div></div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
