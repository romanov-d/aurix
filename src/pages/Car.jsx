import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import CarCard from '../components/CarCard.jsx';
import { getCar, listCars } from '../api/cars.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';
import { useFavorites } from '../api/useFavorites.js';
import DateRangePicker from '../components/DateRangePicker.jsx';
import { TelegramIcon } from '../components/BrandIcons.jsx';
import { reachGoal } from '../api/metrika.js';

const padNum = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${padNum(d.getMonth() + 1)}-${padNum(d.getDate())}`;

// Интервалы занятых броней → плоский список дней 'YYYY-MM-DD'.
// Полуоткрыто [from; to): день возврата свободен для новой выдачи (как на сервере).
function expandBusyRanges(ranges) {
  const out = [];
  for (const r of ranges) {
    if (!r?.from_dt || !r?.to_dt) continue;
    const d = new Date(r.from_dt); d.setHours(0, 0, 0, 0);
    const end = new Date(r.to_dt); end.setHours(0, 0, 0, 0);
    // Почасовая бронь (съёмка) начинается и заканчивается в один день —
    // полуоткрытый цикл дал бы ноль дней, и день выглядел бы свободным.
    // Для посуточной аренды такой день занят целиком.
    if (d.getTime() === end.getTime()) { out.push(dayKey(d)); continue; }
    for (; d < end; d.setDate(d.getDate() + 1)) out.push(dayKey(d));
  }
  return out;
}

// Занятые ЧАСЫ конкретного дня (минуты от полуночи) — чтобы в один день
// помещалось несколько съёмок: 09:00–13:00 не мешает 14:00–18:00.
// Посуточная аренда закрывает день целиком (0–1440).
function busyIntervalsForDay(ranges, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  const out = [];
  for (const r of ranges) {
    if (!r?.from_dt || !r?.to_dt) continue;
    const from = new Date(r.from_dt);
    const to = new Date(r.to_dt);
    if (to <= dayStart || from >= dayEnd) continue;
    const startMin = from <= dayStart ? 0 : from.getHours() * 60 + from.getMinutes();
    const endMin = to >= dayEnd ? 24 * 60 : to.getHours() * 60 + to.getMinutes();
    if (endMin > startMin) out.push([startMin, endMin]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

const overlapsBusy = (intervals, startMin, endMin) =>
  intervals.some(([s, e]) => startMin < e && endMin > s);

const fmtMin = (min) => `${padNum(Math.floor(min / 60) % 24)}:${padNum(min % 60)}`;

// Скелетон страницы машины (повторяет реальную раскладку detail)
function CarDetailSkeleton() {
  const line = (style) => <div className="sk sk-line" style={style} />;
  return (
    <div className="car-page">
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">{line({ width: 180, height: 12, display: 'inline-block' })}</div>
          {line({ width: 'min(440px,72%)', height: 36, marginTop: 14 })}
          <div className="car-badges" style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {[64, 96, 70, 80, 58].map((w, i) => <div key={i} className="sk sk-line" style={{ width: w, height: 28, borderRadius: 999 }} />)}
          </div>
        </div>
      </div>

      <div className="container detail">
        <div className="gallery">
          <div className="main-img sk" />
          <div className="thumbs">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="t sk" style={{ aspectRatio: '4/3' }} />)}
          </div>
          <div className="divider-h" />
          {line({ width: 150, height: 22 })}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {['100%', '97%', '93%', '88%', '60%'].map((w, i) => <div key={i} className="sk sk-line" style={{ width: w, height: 12 }} />)}
          </div>
        </div>

        <aside className="detail-side">
          {line({ width: '70%', height: 28 })}
          {line({ width: '45%', height: 14, marginTop: 12 })}
          <div className="price-block" style={{ marginTop: 20 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <div className="sk sk-line" style={{ width: '42%', height: 11 }} />
                <div className="sk sk-line" style={{ width: 64, height: 11 }} />
              </div>
            ))}
          </div>
          {line({ width: '100%', height: 44, marginTop: 8 })}
          {line({ width: '100%', height: 52, marginTop: 14, borderRadius: 8 })}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 22 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="sk sk-line" style={{ width: '55%', height: 10 }} />
                <div className="sk sk-line" style={{ width: '82%', height: 14, marginTop: 7 }} />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

// Фотосессия: подача считается как +1 час по тарифу, но от 3 часов съёмки — бесплатно.
const PHOTO_FREE_DELIVERY_HOURS = 3;
const PHOTO_MAX_HOURS = 12;

export default function Car() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Бронь день в день разрешена: минимальная дата — сегодня.
  const today = new Date();
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
  const [busyRanges, setBusyRanges] = useState([]); // сырые интервалы занятых броней

  // ── Фотосессия: один день + время начала + длительность в часах ──
  const [photoDate, setPhotoDate] = useState(toDateStr(tomorrow));
  const [photoTime, setPhotoTime] = useState('12:00');
  const [photoHours, setPhotoHours] = useState(2);

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

    // Занятые даты (оплаченные/выданные брони) — раскрываем интервалы в дни
    api(`/cars/${id}/busy`)
      .then((data) => setBusyRanges(Array.isArray(data?.ranges) ? data.ranges : []))
      .catch(() => setBusyRanges([]));
  }, [id]);

  // Если выбранное время съёмки попало на чужую бронь (например, день сменили) —
  // сдвигаем на ближайший свободный старт, чтобы форма не открывалась «занятой».
  useEffect(() => {
    if (searchParams.get('mode') !== 'photo') return;
    const intervals = busyIntervalsForDay(busyRanges, photoDate);
    if (!intervals.length) return;
    const startMin = Number(photoTime.slice(0, 2)) * 60;
    if (!overlapsBusy(intervals, startMin, startMin + photoHours * 60)) return;
    const free = TIMES.find(t => {
      const s = Number(t.slice(0, 2)) * 60;
      return !overlapsBusy(intervals, s, s + photoHours * 60);
    });
    if (free) setPhotoTime(free);
  }, [busyRanges, photoDate, photoHours, photoTime, searchParams]);

  if (loading) return <CarDetailSkeleton />;
  
  if (notFound || !car) return (
    <div className="container" style={{ padding: '120px 0', textAlign: 'center' }}>
      <h2 style={{ color: '#fff', marginBottom: 16 }}>Автомобиль не найден</h2>
      <p className="muted" style={{ marginBottom: 24 }}>Возможно, он был удалён или ссылка некорректна.</p>
      <Link to="/catalog" className="btn">Перейти в каталог</Link>
    </div>
  );
  const isFav = favorites.has(car.id);

  // «Закрыта до даты» — ручная пометка «в аренде до …». Вместо отдельной плашки
  // показываем эти дни занятыми прямо в календаре: календарь закрыт на них,
  // остальные даты доступны к брони.
  const closedUntil = car.closed_until ? new Date(car.closed_until) : null;
  const isClosed = closedUntil && closedUntil > new Date();
  const closedLabel = isClosed
    ? closedUntil.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : null;
  const bookMinDate = toDateStr(today);

  // Дни от сегодня до даты открытия — раскрываем в занятые дни для календаря.
  const closedBusy = [];
  if (isClosed) {
    const dd = new Date(today); dd.setHours(0, 0, 0, 0);
    for (; dd < closedUntil; dd.setDate(dd.getDate() + 1)) closedBusy.push(toDateStr(dd));
  }
  const busyDates = expandBusyRanges(busyRanges);

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

  // ── Режим страницы: обычная аренда или фотосессия (?mode=photo) ──
  const photoRate = car.photo_rate || 0;
  const photoAvailable = photoRate > 0;
  const isPhoto = photoAvailable && searchParams.get('mode') === 'photo';
  const setMode = (m) => {
    const next = new URLSearchParams(searchParams);
    if (m === 'photo') next.set('mode', 'photo'); else next.delete('mode');
    setSearchParams(next, { replace: true });
    setError('');
  };

  // Подача: считается как +1 час по тарифу, от 3 часов съёмки — бесплатно
  const photoDeliveryFree = photoHours >= PHOTO_FREE_DELIVERY_HOURS;
  const photoDeliveryCost = needDelivery && !photoDeliveryFree ? photoRate : 0;
  const photoTotal = photoRate * photoHours + photoDeliveryCost;
  const photoFromDt = `${photoDate}T${photoTime}`;
  const photoToDate = new Date(photoFromDt);
  photoToDate.setHours(photoToDate.getHours() + photoHours);

  // ── Занятость для календаря ──
  // Аренда посуточно: любой занятый день закрыт целиком.
  // Съёмка: день закрывают только посуточные брони; чужая съёмка занимает лишь
  // свои часы, поэтому 09:00–13:00 и 14:00–18:00 в один день сосуществуют.
  // День закрываем, только если в нём не осталось ни одного свободного часа.
  const dayBusyDates = isPhoto
    ? (() => {
        const hardDays = expandBusyRanges(busyRanges.filter(r => r.kind !== 'photo'));
        const photoDays = new Set(
          busyRanges.filter(r => r.kind === 'photo').map(r => dayKey(new Date(r.from_dt)))
        );
        const full = [];
        for (const day of photoDays) {
          if (hardDays.includes(day)) continue;
          const intervals = busyIntervalsForDay(busyRanges, day);
          // Есть ли хоть один час из сетки времени, куда влезет минимальная съёмка
          const hasSlot = TIMES.some(t => {
            const startMin = Number(t.slice(0, 2)) * 60;
            return !overlapsBusy(intervals, startMin, startMin + 60);
          });
          if (!hasSlot) full.push(day);
        }
        return [...hardDays, ...full];
      })()
    : busyDates;
  const allBusyDates = closedBusy.length ? [...dayBusyDates, ...closedBusy] : dayBusyDates;

  // Часы выбранного дня съёмки: какие старты свободны под выбранную длительность
  const photoDayIntervals = isPhoto ? busyIntervalsForDay(busyRanges, photoDate) : [];
  const photoStartMin = Number(photoTime.slice(0, 2)) * 60;
  const photoEndMin = photoStartMin + photoHours * 60;
  const isPhotoSlotFree = (startMin, hours = photoHours) =>
    !overlapsBusy(photoDayIntervals, startMin, startMin + hours * 60);
  const photoSlotTaken = isPhoto && !isPhotoSlotFree(photoStartMin);
  const photoBusyLabel = photoDayIntervals.length
    ? photoDayIntervals.map(([s, e]) => `${fmtMin(s)}–${fmtMin(e)}`).join(', ')
    : '';

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
    const startDt = isPhoto ? photoFromDt : fromDt;
    const endDate = isPhoto ? photoToDate : new Date(toDt);

    // Возврат не может быть раньше получения
    if (endDate <= new Date(startDt)) {
      setError(isPhoto ? 'Укажите длительность съёмки.' : 'Дата возврата должна быть позже даты получения.');
      return;
    }
    // Съёмка не должна наехать на уже занятые часы этого дня
    if (isPhoto && photoSlotTaken) {
      setError(`В это время авто занято (${photoBusyLabel}). Выберите другое время или длительность.`);
      return;
    }
    // Машина закрыта — не даём отправить бронь с датой раньше открытия
    if (isClosed && new Date(startDt) < closedUntil) {
      setError(`Автомобиль сейчас в аренде — будет доступен с ${closedLabel}. Выберите более позднюю дату${isPhoto ? ' съёмки' : ' начала'}.`);
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      await api('/bookings', {
        method: 'POST',
        body: {
          car_id: car.id,
          kind: isPhoto ? 'photo' : 'rent',
          from_dt: new Date(startDt).toISOString(),
          to_dt: endDate.toISOString(),
          pickup_city: city,
          with_driver: false,
          with_delivery: needDelivery
        }
      });
      reachGoal(isPhoto ? 'photo_booking' : 'booking'); // цель Метрики: оформлена бронь
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
            {isPhoto
              ? <Link to="/photo">Аренда для фото</Link>
              : <Link to="/catalog">Автопарк</Link>}
            <span className="sep">/</span>
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
                  {/* Без внешних CDN (ui-avatars.com в РФ не грузится → битая
                      картинка): нет своей аватарки — рисуем кружок с инициалом */}
                  {r.user_avatar
                    ? <img src={r.user_avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    : <div className="rv-mob-ava" style={{ width: 40, height: 40, fontSize: 16 }} aria-hidden="true">{(r.user_name || 'A').charAt(0).toUpperCase()}</div>}
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

          {/* Переключатель сценария: посуточная аренда ↔ почасовая съёмка.
              Показываем только у машин с почасовым тарифом (photo_rate). */}
          {photoAvailable && (
            <div className="book-mode-tabs">
              <button
                type="button"
                className={`book-mode-tab${isPhoto ? '' : ' active'}`}
                onClick={() => setMode('rent')}
              >
                <i className="ph-fill ph-car-profile" /> Аренда
              </button>
              <button
                type="button"
                className={`book-mode-tab${isPhoto ? ' active' : ''}`}
                onClick={() => setMode('photo')}
              >
                <i className="ph-fill ph-camera" /> Фотосессия
              </button>
            </div>
          )}

          {isPhoto ? (
            <div className="price-block">
              <div className="row"><span>Съёмка, 1 час</span><b>{photoRate.toLocaleString('ru-RU')} ₽</b></div>
              <div className="row"><span>Минимальная аренда</span><b style={{ fontSize: 13, color: '#bdbdbd' }}>1 час</b></div>
              <div className="row"><span>Подача авто</span><b style={{ fontSize: 13, color: '#bdbdbd' }}>1 час по тарифу</b></div>
              <div className="row"><span>От 3 часов съёмки</span><b style={{ fontSize: 13, color: 'var(--gold)' }}>подача бесплатно</b></div>
              <div className="row"><span>Залог</span><b style={{ fontSize: 14, color: '#fff' }}>{car.deposit ? `${car.deposit.toLocaleString('ru-RU')} ₽` : '—'}</b></div>
            </div>
          ) : (
            <div className="price-block">
              <div className="row"><span>1–5 суток</span><b>{car.price_per_day?.toLocaleString('ru-RU')} ₽</b></div>
              <div className="row"><span>6–12 суток</span><b>{car.price_6_12 ? `${car.price_6_12.toLocaleString('ru-RU')} ₽` : 'договорная'}</b></div>
              <div className="row"><span>от 13 суток</span><b style={{ color: '#bdbdbd', fontSize: 13 }}>договорная</b></div>
              <div className="row"><span>от 30 суток</span><b>{car.price_30 ? `${car.price_30.toLocaleString('ru-RU')} ₽` : 'договорная'}</b></div>
              <div className="row"><span>Залог</span><b style={{ fontSize: 14, color: '#fff' }}>{car.deposit ? `${car.deposit.toLocaleString('ru-RU')} ₽` : '—'}</b></div>
              <div className="row"><span>Лимит пробега</span><b style={{ fontSize: 13, color: '#bdbdbd' }}>{car.mileage_limit || 250} км/сут</b></div>
              <div className="row"><span>Перекат</span><b style={{ fontSize: 13, color: '#bdbdbd' }}>{car.overmileage_rate || '—'} ₽/км</b></div>
            </div>
          )}

          {isClosed && (
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: '#bdbdbd', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, lineHeight: 1.5 }}>
              <i className="ph ph-calendar-blank" style={{ marginRight: 6 }} />
              Ближайшие даты заняты. Свободные даты — с <b>{closedLabel}</b>.
            </div>
          )}
          {isPhoto ? (
            <>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>В какой день хотите арендовать авто для фотосессии?</label>
                <DateRangePicker
                  from={photoDate}
                  to={photoDate}
                  single
                  singleLabel="Выбрать день съёмки"
                  minDate={bookMinDate}
                  busyDates={allBusyDates}
                  variant="sidebar"
                  onChange={({ from }) => { if (from) setPhotoDate(from); }}
                />
              </div>
              <div className="form-row" style={{ gap: 12 }}>
                <div className="field">
                  <label>Начало съёмки</label>
                  {/* Часы, занятые другой съёмкой в этот же день, недоступны —
                      но сам день остаётся открытым для съёмки в свободные часы */}
                  <select value={photoTime} onChange={e => setPhotoTime(e.target.value)}>
                    {TIMES.map(t => {
                      const taken = !isPhotoSlotFree(Number(t.slice(0, 2)) * 60);
                      return <option key={t} value={t} disabled={taken}>{t}{taken ? ' — занято' : ''}</option>;
                    })}
                  </select>
                </div>
                <div className="field">
                  <label>Длительность</label>
                  <select value={photoHours} onChange={e => setPhotoHours(Number(e.target.value))}>
                    {Array.from({ length: PHOTO_MAX_HOURS }, (_, i) => i + 1).map(h => {
                      const taken = !isPhotoSlotFree(photoStartMin, h);
                      return (
                        <option key={h} value={h} disabled={taken}>
                          {h} ч{taken ? ' — занято' : (h >= PHOTO_FREE_DELIVERY_HOURS ? ' · подача бесплатно' : '')}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              {photoBusyLabel && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 13, color: '#bdbdbd', lineHeight: 1.6 }}>
                  <i className="ph ph-clock" style={{ marginRight: 6 }} />
                  В этот день авто уже занято: <b>{photoBusyLabel}</b>. Остальные часы свободны.
                </div>
              )}
              <div className="field" style={{ marginTop: 14 }}>
                <label>Адрес съёмки</label>
                <input placeholder="г. Москва, ул. Пушкина, д. 1" value={city} onChange={e => setCity(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Даты аренды</label>
                <DateRangePicker
                  from={fromDate}
                  to={toDate}
                  minDate={bookMinDate}
                  busyDates={allBusyDates}
                  variant="sidebar"
                  onChange={({ from, to }) => {
                    if (from) {
                      setFromDate(from);
                      // не оставляем перевёрнутый диапазон, пока не выбрана новая дата возврата
                      if (!to && from > toDate) setToDate(from);
                    }
                    if (to) setToDate(to);
                  }}
                />
              </div>
              {/* gridTemplateColumns/display НЕ задаём инлайном — иначе перебивают
                  медиазапрос и на 801–1100px сайдбар остаётся в 2 колонки */}
              <div className="form-row" style={{ gap: 12 }}>
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
            </>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer', fontSize: 14, color: '#bdbdbd' }}>
            <input
              type="checkbox"
              checked={needDelivery}
              onChange={e => setNeedDelivery(e.target.checked)}
              style={{ accentColor: 'var(--gold)', width: 16, height: 16 }}
            />
            {isPhoto ? 'Нужна подача авто на локацию' : 'Нужна подача и забор авто'}
          </label>
          {needDelivery && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, fontSize: 13, color: '#bdbdbd', lineHeight: 1.6 }}>
              {isPhoto
                ? (photoDeliveryFree
                    ? 'Съёмка от 3 часов — подача автомобиля бесплатная.'
                    : `Подача считается как 1 час аренды (+${photoRate.toLocaleString('ru-RU')} ₽). При съёмке от 3 часов подача бесплатная.`)
                : 'Стоимость подачи и забора рассчитывается индивидуально. Менеджер свяжется с вами для уточнения деталей после оформления заявки.'}
            </div>
          )}

          {isPhoto ? (
            <div className="price-block" style={{ marginTop: 20 }}>
              <div className="row"><span>{photoHours} ч × {photoRate.toLocaleString('ru-RU')} ₽</span><span>{(photoRate * photoHours).toLocaleString('ru-RU')} ₽</span></div>
              {needDelivery && (
                <div className="row">
                  <span>Подача авто</span>
                  <span style={{ color: photoDeliveryFree ? 'var(--gold)' : undefined }}>
                    {photoDeliveryFree ? 'бесплатно' : `${photoRate.toLocaleString('ru-RU')} ₽`}
                  </span>
                </div>
              )}
              <div className="row"><span style={{ fontSize: 15 }}>Итого</span><b style={{ fontSize: 24 }}>{photoTotal.toLocaleString('ru-RU')} ₽</b></div>
            </div>
          ) : (
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
          )}

          {user && !user.is_verified && user.role !== 'admin' && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(251,113,133,0.08)', border: 'none', borderRadius: 8, fontSize: 13, color: '#fda4af', lineHeight: 1.6 }}>
              <i className="ph-fill ph-warning-circle" style={{ marginRight: 6 }} />
              Бронирование доступно после верификации.{' '}
              <Link to="/account#documents" style={{ color: 'var(--gold)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>Загрузить документы&nbsp;→</Link>
            </div>
          )}

          {error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 14, textAlign: 'center' }}>{error}</div>}

          {/* В режиме фотосессии «договорная цена» посуточной аренды не применяется */}
          {(() => {
            const blocked = isPhoto ? photoSlotTaken : isNegotiated;
            return (
              <button onClick={handleBook} disabled={isSubmitting || blocked} className="btn btn-filled" style={{ width: '100%', padding: 16, marginTop: 14, opacity: blocked ? 0.45 : 1 }}>
                {isSubmitting
                  ? 'Оформление...'
                  : blocked
                    ? (isPhoto ? 'Это время занято' : 'Уточните цену по телефону')
                    : (user ? (isPhoto ? 'Забронировать съёмку' : 'Забронировать') : 'Войти для бронирования')}
              </button>
            );
          })()}
          <a
            href={`https://t.me/aurixmotors?text=${encodeURIComponent(`Здравствуйте! Интересует ${car.name} на сайте AURIX MOTORS — можно подробнее?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => reachGoal('ask_car')}
            className="btn btn-ghost"
            style={{ width: '100%', padding: 14, marginTop: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <TelegramIcon size={18} /> Спросить по этой машине
          </a>
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
