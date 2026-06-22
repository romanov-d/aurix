import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import CarCard from '../components/CarCard.jsx';
import { getCar, listCars } from '../api/cars.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';
import { useFavorites } from '../api/useFavorites.js';
import DateRangePicker from '../components/DateRangePicker.jsx';

export default function Car() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  
  // Car data state — direct API fetch instead of loading all cars
  const [car, setCar] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Date state — separate date + time for proper styling
  const pad = (n) => String(n).padStart(2, '0');
  const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter4 = new Date(); dayAfter4.setDate(dayAfter4.getDate() + 4);

  const [fromDate, setFromDate] = useState(toDateStr(tomorrow));
  const [fromTime, setFromTime] = useState('12:00');
  const [toDate, setToDate] = useState(toDateStr(dayAfter4));
  const [toTime, setToTime] = useState('12:00');
  const [city, setCity] = useState('');
  const [needDelivery, setNeedDelivery] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fromDt = `${fromDate}T${fromTime}`;
  const toDt = `${toDate}T${toTime}`;

  const TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'];

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewError, setReviewError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Load car data directly by ID
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    setActivePhotoIdx(0);

    // Car itself is the only critical request — show it even if reviews/similar fail
    getCar(id)
      .then((carData) => setCar(carData))
      .catch((e) => { console.error(e); setNotFound(true); })
      .finally(() => setLoading(false));

    listCars({ limit: 4 })
      .then((allCars) => setSimilar(allCars.items.filter(c => c.id !== id).slice(0, 4)))
      .catch(() => setSimilar([]));

    api(`/cars/${id}/reviews`)
      .then((reviewsData) => setReviews(Array.isArray(reviewsData) ? reviewsData : []))
      .catch(() => setReviews([]));
  }, [id]);

  if (loading) return <div className="container" style={{ padding: '120px 0', color: '#9a9a9a' }}>Загрузка…</div>;
  
  if (notFound || !car) return (
    <div className="container" style={{ padding: '120px 0', textAlign: 'center' }}>
      <h2 style={{ color: '#fff', marginBottom: 16 }}>Автомобиль не найден</h2>
      <p className="muted" style={{ marginBottom: 24 }}>Возможно, он был удалён или ссылка некорректна.</p>
      <Link to="/catalog" className="btn">Перейти в каталог</Link>
    </div>
  );
  const isFav = favorites.has(car.id);
  
  // Calc days
  const d1 = new Date(fromDt);
  const d2 = new Date(toDt);
  const ms = d2.getTime() - d1.getTime();
  let days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (isNaN(days) || days < 1) days = 1;

  function getDayPrice(c, d) {
    if (d >= 30 && c.price_30) return c.price_30;
    if (d >= 6 && c.price_6_12) return c.price_6_12;
    return c.price_per_day || c.price || 0;
  }
  const isNegotiated = days >= 13 && days < 30;
  const dayPrice = getDayPrice(car, days);
  const total = (dayPrice || 0) * days;

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) {
      nav('/login');
      return;
    }
    // Бронь доступна только верифицированным клиентам
    if (!user.is_verified && user.role !== 'admin') {
      setError('Чтобы забронировать, сначала пройдите верификацию: загрузите документы в личном кабинете.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    
    try {
      await api('/bookings', {
        method: 'POST',
        body: {
          car_id: car.id,
          from_dt: new Date(fromDt).toISOString(),
          to_dt: new Date(toDt).toISOString(),
          pickup_city: city,
          with_driver: false,
          with_delivery: needDelivery
        }
      });
      nav('/account');
    } catch (e) {
      setError(e.message || 'Ошибка бронирования');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) return nav('/login');
    setReviewError('');
    setReviewing(true);
    try {
      const res = await api(`/cars/${car.id}/reviews`, {
        method: 'POST',
        body: { rating: reviewRating, text: reviewText }
      });
      // Prepend to list
      setReviews([{ ...res, user_name: user.name, user_avatar: user.avatar_url }, ...reviews]);
      setReviewText('');
    } catch (e) {
      setReviewError(e.message || 'Ошибка');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="car-page">
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Главная</Link><span className="sep">/</span>
            <Link to="/catalog">Автопарк</Link><span className="sep">/</span>
            <span>{car.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1>{car.name}</h1>
            <button 
              onClick={(e) => { e.preventDefault(); if(!user) nav('/login'); else toggleFavorite(car.id); }}
              className={`btn btn-icon ${isFav ? 'active' : ''}`}
              style={{
                background: isFav ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                color: isFav ? '#000' : '#fff',
                border: 'none', borderRadius: '50%', width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: '0.2s',
                marginLeft: 20
              }}
            >
              <i className={isFav ? "ph-fill ph-heart" : "ph ph-heart"} style={{ fontSize: 24 }} />
            </button>
          </div>
          <div className="car-badges">
            <span className="car-badge">{car.year}</span>
            <span className="car-badge">{car.body}</span>
            {(car.power_hp || car.power) && <span className="car-badge">{car.power_hp || car.power} л.с.</span>}
            {car.fuel && <span className="car-badge">{car.fuel}</span>}
            {car.engine && <span className="car-badge">{car.engine}</span>}
          </div>
        </div>
      </div>

      <div className="container detail">
        <div className="gallery">
          {(() => {
            const mainImg = car.image_url || car.img;
            const allPhotos = mainImg
              ? [mainImg, ...(car.photos || []).filter(p => p !== mainImg)]
              : (car.photos || []);
            return (
              <>
                <div className="main-img"><img src={allPhotos[activePhotoIdx] || mainImg} alt="" /></div>
                {allPhotos.length > 1 && (
                  <div className="thumbs">
                    {allPhotos.map((src, i) => (
                      <div key={i} className={`t${i === activePhotoIdx ? ' active' : ''}`} onClick={() => setActivePhotoIdx(i)}>
                        <img src={src} alt="" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          <div className="divider-h"></div>
          <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22 }}>Описание</h3>
          <p className="muted" style={{ marginTop: 14, fontSize: 14, lineHeight: 1.85, color: '#bdbdbd' }}>
            {car.description || `${car.name} — премиальный автомобиль из автопарка AURIX MOTORS. Двигатель ${car.engine}, мощность ${car.power_hp || car.power} л.с., коробка ${car.drive}. Полностью укомплектованный салон, премиальная аудиосистема и безупречное техническое состояние.`}
          </p>

          <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 36 }}>Что включено</h3>
          <ul className="muted" style={{ margin: '14px 0 0 20px', color: '#bdbdbd', fontSize: 14, lineHeight: 2 }}>
            <li>Полная страховка КАСКО + ОСАГО</li>
            <li>Бесплатная подача в пределах МКАД</li>
            <li>{car.mileage_limit || 200} км/сутки включено</li>
            <li>Полный бак при выдаче</li>
            <li>Поддержка 24/7 и эвакуация</li>
          </ul>

          <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 40, marginBottom: 20 }}>Отзывы ({reviews.length})</h3>
          
          {user && (
            <form onSubmit={handleReview} style={{ background: 'var(--bg-2)', padding: 20, borderRadius: 12, marginBottom: 30 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8 }}>Оценка</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1,2,3,4,5].map(r => (
                    <i key={r} onClick={() => setReviewRating(r)} className={r <= reviewRating ? "ph-fill ph-star" : "ph ph-star"} style={{ color: 'var(--gold)', fontSize: 24, cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div className="field">
                <textarea 
                  value={reviewText} onChange={e => setReviewText(e.target.value)} 
                  placeholder="Ваш отзыв..." rows={3}
                  style={{ width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: 12, borderRadius: 8, fontFamily: 'inherit' }}
                />
              </div>
              {reviewError && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 10 }}>{reviewError}</div>}
              <button type="submit" disabled={reviewing} className="btn btn-sm" style={{ marginTop: 14 }}>{reviewing ? 'Отправка...' : 'Оставить отзыв'}</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {reviews.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>Пока нет отзывов. Станьте первым!</p>
            ) : reviews.map(r => (
              <div key={r.id} style={{ background: 'var(--bg-2)', padding: 20, borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <img src={r.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.user_name || 'A')}&background=random&color=fff`} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{r.user_name}</div>
                    <div style={{ display: 'flex', gap: 2, color: 'var(--gold)', marginTop: 4 }}>
                       {[1,2,3,4,5].map(star => <i key={star} className={star <= r.rating ? "ph-fill ph-star" : "ph ph-star"} style={{ fontSize: 12 }} />)}
                    </div>
                  </div>
                </div>
                {r.text && <p style={{ fontSize: 14, color: '#bdbdbd', lineHeight: 1.6 }}>{r.text}</p>}
              </div>
            ))}
          </div>

        </div>

        <aside className="detail-side">
          <h1>{car.name}</h1>
          <div className="submeta">{car.year} · {car.body} · {car.color || 'Чёрный'}</div>

          <div className="price-block">
            <div className="row"><span>1–5 суток</span><b>{car.price_per_day?.toLocaleString('ru-RU')} ₽</b></div>
            <div className="row"><span>6–12 суток</span><b>{car.price_6_12 ? `${car.price_6_12.toLocaleString('ru-RU')} ₽` : 'договорная'}</b></div>
            <div className="row"><span>от 13 суток</span><b style={{ color: '#bdbdbd', fontSize: 13 }}>договорная</b></div>
            <div className="row"><span>от 30 суток</span><b>{car.price_30 ? `${car.price_30.toLocaleString('ru-RU')} ₽` : 'договорная'}</b></div>
            <div className="row"><span>Залог</span><b style={{ fontSize: 14, color: '#fff' }}>{car.deposit ? `${car.deposit.toLocaleString('ru-RU')} ₽` : '—'}</b></div>
            <div className="row"><span>Лимит пробега</span><b style={{ fontSize: 13, color: '#bdbdbd' }}>{car.mileage_limit || 250} км/сут</b></div>
            <div className="row"><span>Перекат</span><b style={{ fontSize: 13, color: '#bdbdbd' }}>{car.overmileage_rate || '—'} ₽/км</b></div>
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Даты аренды</label>
            <DateRangePicker
              from={fromDate}
              to={toDate}
              minDate={toDateStr(tomorrow)}
              variant="sidebar"
              onChange={({ from, to }) => {
                if (from) setFromDate(from);
                if (to) setToDate(to);
              }}
            />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: 12 }}>
            <div className="field">
              <label>Время получения</label>
              <select value={fromTime} onChange={e => setFromTime(e.target.value)}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Время возврата</label>
              <select value={toTime} onChange={e => setToTime(e.target.value)}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>Адрес подачи</label>
            <input placeholder="г. Москва, ул. Пушкина, д. 1" value={city} onChange={e => setCity(e.target.value)} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer', fontSize: 14, color: '#bdbdbd' }}>
            <input
              type="checkbox"
              checked={needDelivery}
              onChange={e => setNeedDelivery(e.target.checked)}
              style={{ accentColor: 'var(--gold)', width: 16, height: 16 }}
            />
            Нужна подача и забор авто
          </label>
          {needDelivery && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, fontSize: 13, color: '#bdbdbd', lineHeight: 1.6 }}>
              Стоимость подачи и забора рассчитывается индивидуально. Менеджер свяжется с вами для уточнения деталей после оформления заявки.
            </div>
          )}

          <div className="price-block" style={{ marginTop: 20 }}>
            <div className="row"><span>{days} суток × {dayPrice?.toLocaleString('ru-RU')}</span><span>{isNegotiated ? '—' : `${total.toLocaleString('ru-RU')} ₽`}</span></div>
            {isNegotiated ? (
              <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--gold)', lineHeight: 1.5 }}>От 13 до 29 дней — цена договорная. Позвоните нам.</span>
              </div>
            ) : (
              <div className="row"><span style={{ fontSize: 15 }}>Итого</span><b style={{ fontSize: 24 }}>{total.toLocaleString('ru-RU')} ₽</b></div>
            )}
          </div>

          {user && !user.is_verified && user.role !== 'admin' && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 8, fontSize: 13, color: '#fda4af', lineHeight: 1.6 }}>
              <i className="ph-fill ph-warning-circle" style={{ marginRight: 6 }} />
              Бронирование доступно после верификации. <Link to="/account" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>Загрузить документы →</Link>
            </div>
          )}

          {error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 14, textAlign: 'center' }}>{error}</div>}

          <button onClick={handleBook} disabled={isSubmitting || isNegotiated} className="btn btn-filled" style={{ width: '100%', padding: 16, marginTop: 14, opacity: isNegotiated ? 0.45 : 1 }}>
            {isSubmitting ? 'Оформление...' : isNegotiated ? 'Уточните цену по телефону' : (user ? 'Забронировать' : 'Войти для бронирования')}
          </button>
          <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 14, letterSpacing: '.06em' }}>Подтверждение менеджером · Оплата по ссылке или наличными</p>

          <div className="spec-grid">
            <div className="s"><div className="lbl">Двигатель</div><div className="v">{car.engine} · {car.fuel?.toLowerCase()}</div></div>
            <div className="s"><div className="lbl">Мощность</div><div className="v">{car.power_hp || car.power} л.с.</div></div>
            <div className="s"><div className="lbl">Коробка</div><div className="v">{car.drive}</div></div>
            <div className="s"><div className="lbl">Цвет</div><div className="v">{car.color || '—'}</div></div>
          </div>
        </aside>
      </div>

      <section>
        <div className="container">
          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Похожие</span></div>
            <h2>Также вам понравится</h2>
          </div>
          <div id="fleet-slot" className="fleet-grid" data-limit="4">
            {similar.map(c => <CarCard key={c.id} car={c} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
