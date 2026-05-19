import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Account() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const firstName = user?.name?.split(' ')[0] || 'Гость';
  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();
  const tierLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'partner' ? 'Партнёр' : `Member · с ${memberSince}`;
  const avatar = user?.avatar_url || 'https://randomuser.me/api/portraits/men/41.jpg';

  const onLogout = async (e) => {
    e.preventDefault();
    await logout();
    nav('/', { replace: true });
  };

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/">Главная</Link><span className="sep">/</span><span>Личный кабинет</span></div>
          <h1>Добро пожаловать, <em>{firstName}</em></h1>
          <p style={{ color: '#bdbdbd', marginTop: 14, fontSize: 14, letterSpacing: '.04em' }}>{user?.email}</p>
        </div>
      </div>

      <div className="container account">
        <aside className="acc-side">
          <div className="acc-user">
            <img className="acc-avatar" src={avatar} alt={user?.name || ''} />
            <div className="info">
              <div className="name">{user?.name}</div>
              <div className="tier">{tierLabel}</div>
            </div>
          </div>
          <nav className="acc-nav">
            <a href="#" className="active"><i className="ph-fill ph-squares-four" /> Обзор</a>
            <a href="#"><i className="ph-fill ph-calendar-check" /> Бронирования <span className="badge">2</span></a>
            <a href="#"><i className="ph-fill ph-clock-counter-clockwise" /> История</a>
            <a href="#"><i className="ph-fill ph-file-text" /> Документы</a>
            <a href="#"><i className="ph-fill ph-credit-card" /> Платежи</a>
            <a href="#"><i className="ph-fill ph-star" /> Клубная карта</a>
            <a href="#"><i className="ph-fill ph-heart" /> Избранное</a>
            <a href="#"><i className="ph-fill ph-user" /> Профиль</a>
            <a href="#"><i className="ph-fill ph-bell" /> Уведомления</a>
          </nav>
          <div className="acc-logout">
            <a href="#logout" onClick={onLogout} className="acc-nav" style={{ display: 'flex', color: 'var(--muted)', fontSize: 13, padding: '8px 14px' }}><i className="ph-fill ph-sign-out" style={{ marginRight: 10, color: 'var(--muted)' }} /> Выйти</a>
          </div>
        </aside>

        <main className="acc-content">

          <div className="acc-stats">
            <div className="acc-stat">
              <div className="lbl"><i className="ph-fill ph-car-profile" /> Аренд</div>
              <div className="v">12<small>всего</small></div>
            </div>
            <div className="acc-stat">
              <div className="lbl"><i className="ph-fill ph-calendar-check" /> Активных</div>
              <div className="v">1<small>сейчас</small></div>
            </div>
            <div className="acc-stat">
              <div className="lbl"><i className="ph-fill ph-currency-rub" /> Потрачено</div>
              <div className="v">2.4<small>млн ₽</small></div>
            </div>
            <div className="acc-stat">
              <div className="lbl"><i className="ph-fill ph-star" /> Кэшбек</div>
              <div className="v">68 200<small>₽</small></div>
            </div>
          </div>

          <div className="acc-block">
            <div className="acc-block-head">
              <h3>Активное бронирование</h3>
              <a href="#">Все бронирования →</a>
            </div>
            <div className="booking-active">
              <div className="img"><img src="https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=600&auto=format&fit=crop&q=80" alt="" /></div>
              <div className="info">
                <div className="name">Mercedes-AMG SL 43</div>
                <div className="meta">2022 · Кабриолет · Чёрный · #BR-2026-0142</div>
                <div className="dates">
                  <div>Получение<b>15 мая, 12:00</b></div>
                  <div>Возврат<b>22 мая, 12:00</b></div>
                  <div>Адрес<b>Внуково · Терминал A</b></div>
                </div>
                <div className="status">В работе</div>
              </div>
              <div className="actions">
                <a href="#" className="btn btn-sm">Детали</a>
                <a href="#" className="btn btn-sm btn-ghost">Продлить</a>
              </div>
            </div>
          </div>

          <div className="acc-block">
            <div className="acc-block-head">
              <h3>История аренды</h3>
              <a href="#">Скачать отчёт →</a>
            </div>
            <table className="acc-table">
              <thead>
                <tr>
                  <th>Автомобиль</th>
                  <th>Период</th>
                  <th>Город</th>
                  <th>Стоимость</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><div className="car-cell"><img src="https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=300&auto=format&fit=crop&q=80" alt="" /><div><b>Mercedes-AMG SL 43</b><span>#BR-2026-0142</span></div></div></td>
                  <td>15 — 22 мая 2026</td>
                  <td>Москва</td>
                  <td className="price">226 100 ₽</td>
                  <td><span className="tag ok">Активна</span></td>
                </tr>
                <tr>
                  <td><div className="car-cell"><img src="https://images.unsplash.com/photo-1631295868223-63265b40d9e4?w=300&auto=format&fit=crop&q=80" alt="" /><div><b>Rolls-Royce Cullinan</b><span>#BR-2026-0118</span></div></div></td>
                  <td>20 — 24 апреля 2026</td>
                  <td>Дубай</td>
                  <td className="price">480 000 ₽</td>
                  <td><span className="tag done">Завершена</span></td>
                </tr>
                <tr>
                  <td><div className="car-cell"><img src="https://images.unsplash.com/photo-1633509817627-5b9c071e6126?w=300&auto=format&fit=crop&q=80" alt="" /><div><b>Lamborghini Urus</b><span>#BR-2026-0089</span></div></div></td>
                  <td>1 — 3 марта 2026</td>
                  <td>Москва</td>
                  <td className="price">234 000 ₽</td>
                  <td><span className="tag done">Завершена</span></td>
                </tr>
                <tr>
                  <td><div className="car-cell"><img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300&auto=format&fit=crop&q=80" alt="" /><div><b>Porsche 911 Carrera</b><span>#BR-2026-0061</span></div></div></td>
                  <td>14 — 16 февраля 2026</td>
                  <td>Сочи</td>
                  <td className="price">126 000 ₽</td>
                  <td><span className="tag done">Завершена</span></td>
                </tr>
                <tr>
                  <td><div className="car-cell"><img src="https://images.unsplash.com/photo-1612825173281-9a193378527e?w=300&auto=format&fit=crop&q=80" alt="" /><div><b>Mercedes G63 AMG</b><span>#BR-2026-0034</span></div></div></td>
                  <td>10 — 12 января 2026</td>
                  <td>Москва</td>
                  <td className="price">110 000 ₽</td>
                  <td><span className="tag cancel">Отменена</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="acc-grid-2">
            <div className="acc-block">
              <div className="acc-block-head">
                <h3>Документы</h3>
                <a href="#">Загрузить →</a>
              </div>
              <div className="doc-list">
                <div className="doc-item">
                  <div className="ico"><i className="ph-fill ph-identification-card" /></div>
                  <div className="meta"><b>Паспорт РФ</b><small>Загружено · 18 марта 2024</small></div>
                  <a href="#" className="dl"><i className="ph-fill ph-download-simple" /></a>
                </div>
                <div className="doc-item">
                  <div className="ico"><i className="ph-fill ph-car" /></div>
                  <div className="meta"><b>Водительское удостоверение</b><small>Действует до 2032 · стаж 8 лет</small></div>
                  <a href="#" className="dl"><i className="ph-fill ph-download-simple" /></a>
                </div>
                <div className="doc-item">
                  <div className="ico"><i className="ph-fill ph-file-text" /></div>
                  <div className="meta"><b>Договор аренды #BR-2026-0142</b><small>15 мая 2026 · Mercedes-AMG SL 43</small></div>
                  <a href="#" className="dl"><i className="ph-fill ph-download-simple" /></a>
                </div>
                <div className="doc-item">
                  <div className="ico"><i className="ph-fill ph-receipt" /></div>
                  <div className="meta"><b>Счёт-фактура за апрель</b><small>480 000 ₽ · оплачено</small></div>
                  <a href="#" className="dl"><i className="ph-fill ph-download-simple" /></a>
                </div>
              </div>
            </div>

            <div className="acc-block">
              <div className="acc-block-head">
                <h3>Профиль и карта</h3>
                <a href="#">Изменить →</a>
              </div>
              <div className="profile-card">
                <div className="profile-row"><span className="lbl">ФИО</span><span className="v">Иван Петров</span></div>
                <div className="profile-row"><span className="lbl">Телефон</span><span className="v">+7 999 ··· 45 67</span></div>
                <div className="profile-row"><span className="lbl">Email</span><span className="v">i.petrov@mail.com</span></div>
                <div className="profile-row"><span className="lbl">Дата рождения</span><span className="v">14.07.1988</span></div>
                <div className="profile-row"><span className="lbl">Уровень клуба</span><span className="v gold">Gold Member</span></div>
                <div className="profile-row"><span className="lbl">Карта №</span><span className="v gold">5224 8842 1027</span></div>
                <div className="profile-row"><span className="lbl">Скидка</span><span className="v gold">−18%</span></div>
                <div className="profile-row"><span className="lbl">Действует до</span><span className="v">12 / 2028</span></div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
