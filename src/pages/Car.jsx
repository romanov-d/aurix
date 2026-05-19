import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import CarCard from '../components/CarCard.jsx';
import { useCars } from '../api/useCars.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';
import { useFavorites } from '../api/useFavorites.js';

export default function Car() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { items: FLEET, loading } = useCars({ limit: 100 });
  const { favorites, toggleFavorite } = useFavorites();
  
  // Date state
  const [fromDt, setFromDt] = useState('');
  const [toDt, setToDt] = useState('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewError, setReviewError] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Default dates for the form
  useEffect(() => {
    const d1 = new Date();
    d1.setHours(12, 0, 0, 0);
    d1.setDate(d1.getDate() + 1); // tomorrow
    const d2 = new Date(d1);
    d2.setDate(d2.getDate() + 3); // +3 days
    
    // format as YYYY-MM-DDTHH:MM for native datetime-local input
    const toLocalISO = (d) => {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    
    setFromDt(toLocalISO(d1));
    setToDt(toLocalISO(d2));
  }, []);

  useEffect(() => {
    if (!id) return;
    api(`/cars/${id}/reviews`).then(setReviews).catch(console.error);
  }, [id]);

  if (loading && FLEET.length === 0) return <div className="container" style={{ padding: '120px 0', color: '#9a9a9a' }}>Загрузка…</div>;
  
  const car = FLEET.find(c => c.id === id) || FLEET[0];
  if (!car) return null;
  const similar = FLEET.filter(c => c.id !== car.id).slice(0, 4);
  const isFav = favorites.has(car.id);
  
  // Calc days
  const d1 = new Date(fromDt);
  const d2 = new Date(toDt);
  const ms = d2.getTime() - d1.getTime();
  let days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (isNaN(days) || days < 1) days = 1;

  const subtotal = car.price_per_day * days;
  const discount = days >= 7 ? Math.round(subtotal * 0.15) : (days >= 3 ? Math.round(subtotal * 0.10) : 0);
  const total = subtotal - discount;

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) {
      nav('/login');
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
          with_driver: false
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
    <>
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
          <div className="muted" style={{ marginTop: 10, fontSize: 13, letterSpacing: '.18em', textTransform: 'uppercase' }}>{car.year} · {car.body} · {car.power_hp || car.power} л.с.</div>
        </div>
      </div>

      <div className="container detail">
        <div className="gallery">
          <div className="main-img"><img src={car.image_url || car.img} alt="" /></div>
          <div className="thumbs">
            <div className="t active"><img src={car.image_url || car.img} alt="" /></div>
            <div className="t"><img src="https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&auto=format&fit=crop&q=80" alt="" /></div>
            <div className="t"><img src="https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&auto=format&fit=crop&q=80" alt="" /></div>
            <div className="t"><img src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80" alt="" /></div>
            <div className="t"><img src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&auto=format&fit=crop&q=80" alt="" /></div>
          </div>

          <div className="divider-h"></div>
          <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22 }}>Описание</h3>
          <p className="muted" style={{ marginTop: 14, fontSize: 14, lineHeight: 1.85, color: '#bdbdbd' }}>{car.name} — премиальный автомобиль из автопарка AURIX MOTORS. Двигатель {car.engine}, мощность {car.power_hp || car.power} л.с., коробка {car.drive}. Полностью укомплектованный салон, премиальная аудиосистема и безупречное техническое состояние.</p>

          <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 36 }}>Что включено</h3>
          <ul className="muted" style={{ margin: '14px 0 0 20px', color: '#bdbdbd', fontSize: 14, lineHeight: 2 }}>
            <li>Полная страховка КАСКО + ОСАГО</li>
            <li>Бесплатная подача в пределах МКАД</li>
            <li>200 км/сутки включено</li>
            <li>Полный бак при выдаче</li>
            <li>Поддержка 24/7 и эвакуация</li>
          </ul>

          <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginTop: 40, marginBottom: 20 }}>Отзывы ({reviews.length})</h3>
          
          {user && (
            <form onSubmit={handleReview} style={{ background: '#111', padding: 20, borderRadius: 12, marginBottom: 30 }}>
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
              <div key={r.id} style={{ background: '#111', padding: 20, borderRadius: 12 }}>
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
          <div className="submeta">{car.year} · {car.body} · Чёрный</div>

          <div className="price-block">
            <div className="row"><span>1 сутки</span><b>{car.price_per_day?.toLocaleString('ru-RU')} ₽</b></div>
            <div className="row"><span>От 3 суток</span><b>−10%</b></div>
            <div className="row"><span>От 7 суток</span><b>−15%</b></div>
            <div className="row"><span>Залог</span><b style={{ fontSize: 14, color: '#fff' }}>150 000 ₽</b></div>
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: 12 }}>
            <div className="field">
              <label>Получение</label>
              <input type="datetime-local" value={fromDt} onChange={e => setFromDt(e.target.value)} />
            </div>
            <div className="field">
              <label>Возврат</label>
              <input type="datetime-local" value={toDt} onChange={e => setToDt(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>Адрес подачи</label>
            <input placeholder="г. Москва, ..." value={city} onChange={e => setCity(e.target.value)} />
          </div>

          <div className="price-block" style={{ marginTop: 20 }}>
            <div className="row"><span>{days} суток × {car.price_per_day?.toLocaleString('ru-RU')}</span><span>{subtotal.toLocaleString('ru-RU')} ₽</span></div>
            {discount > 0 && <div className="row"><span>Скидка</span><span style={{ color: 'var(--gold)' }}>−{discount.toLocaleString('ru-RU')} ₽</span></div>}
            <div className="row"><span style={{ fontSize: 15 }}>Итого</span><b style={{ fontSize: 24 }}>{total.toLocaleString('ru-RU')} ₽</b></div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 14, textAlign: 'center' }}>{error}</div>}

          <button onClick={handleBook} disabled={isSubmitting} className="btn btn-filled" style={{ width: '100%', padding: 16, marginTop: 14 }}>
            {isSubmitting ? 'Оформление...' : (user ? 'Забронировать' : 'Войти для бронирования')}
          </button>
          <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 14, letterSpacing: '.06em' }}>Мгновенное подтверждение · Оплата частями</p>

          <div className="spec-grid">
            <div className="s"><div className="lbl">Двигатель</div><div className="v">{car.engine} · {car.fuel?.toLowerCase()}</div></div>
            <div className="s"><div className="lbl">Мощность</div><div className="v">{car.power_hp || car.power} л.с.</div></div>
            <div className="s"><div className="lbl">Коробка</div><div className="v">{car.drive} · 9</div></div>
            <div className="s"><div className="lbl">Мест</div><div className="v">2 + 2</div></div>
          </div>
        </aside>
      </div>

      <section>
        <div className="container">
          <div className="section-head">
            <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Похожие</span></div>
            <h2>Также вам <em>понравится</em></h2>
          </div>
          <div id="fleet-slot" className="fleet-grid" data-limit="4">
            {similar.map(c => <CarCard key={c.id} car={c} />)}
          </div>
        </div>
      </section>
    </>
  );
}
