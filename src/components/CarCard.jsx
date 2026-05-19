import { Link } from 'react-router-dom';

export default function CarCard({ car, days }) {
  const total = days ? car.price * days : null;
  return (
    <Link to={`/car/${car.id}`} className="card">
      <div className="card-img">
        {car.badge && <div className="card-badge">{car.badge}</div>}
        <img src={car.img} alt={car.name} />
      </div>
      <div className="card-body">
        <div className="card-name">{car.name}</div>
        <div className="card-meta">{car.year} / {car.body}</div>
        <div className="card-specs">
          <div className="spec"><span className="spec-lbl"><span>{car.engine}</span><small>{car.fuel}</small></span></div>
          <div className="spec"><span className="spec-lbl"><span>{car.power}</span><small>мощность</small></span></div>
          <div className="spec"><span className="spec-lbl"><span>{car.drive}</span><small>коробка</small></span></div>
        </div>
        <div className="card-price">
          <span className="from">{days ? 'от · сутки' : 'от · в сутки'}</span>
          <span className="val">{car.price.toLocaleString('ru-RU')} ₽</span>
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
