import { Link, useNavigate } from 'react-router-dom';
import { useFavorites } from '../api/useFavorites.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function CarCard({ car, days }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { favorites, toggleFavorite } = useFavorites();
  
  const price = car.price_per_day || car.price || 0;
  const image = car.image_url || car.img || '';
  const total = days ? price * days : null;
  const isFav = favorites.has(car.id);

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    if (!user) {
      nav('/login');
      return;
    }
    await toggleFavorite(car.id);
  };

  return (
    <Link to={`/car/${car.id}`} className="card">
      <div className="card-img">
        {car.badge && <div className="card-badge">{car.badge}</div>}
        <button 
          className={`card-fav-btn ${isFav ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            background: isFav ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0,0,0,0.4)',
            border: 'none', borderRadius: '50%', width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: '0.2s'
          }}
        >
          <i className={isFav ? "ph-fill ph-heart" : "ph ph-heart"} style={{ color: isFav ? '#ef4444' : '#fff', fontSize: 20 }} />
        </button>
        <img src={image} alt={car.name} />
      </div>
      <div className="card-body">
        <div className="card-name">{car.name}</div>
        <div className="card-meta">{car.year} / {car.body}</div>
        <div className="card-specs">
          <div className="spec"><span className="spec-lbl"><span>{car.engine}</span><small>{car.fuel}</small></span></div>
          <div className="spec"><span className="spec-lbl"><span>{car.power_hp || car.power}</span><small>мощность</small></span></div>
          <div className="spec"><span className="spec-lbl"><span>{car.drive}</span><small>коробка</small></span></div>
        </div>
        <div className="card-price">
          <span className="from">{days ? 'от · сутки' : 'от · в сутки'}</span>
          <span className="val">{price.toLocaleString('ru-RU')} ₽</span>
        </div>
        {days && (
          <div className="r-total">
            <span className="lbl">Итого за {days} сут.</span>
            <span className="val">{total.toLocaleString('ru-RU')} ₽<small>с учётом скидки</small></span>
          </div>
        )}
      </div>
    </Link>
  );
}
