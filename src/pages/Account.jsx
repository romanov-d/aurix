import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';
import CarCard from '../components/CarCard.jsx';
import { useCars } from '../api/useCars.js';

export default function Account() {
  const { user, logout, refresh } = useAuth();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Load all cars to display in favorites
  const { items: allCars } = useCars({ limit: 100 });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api('/me/bookings'),
      api('/me/favorites'),
      api('/me/points')
    ])
      .then(([bData, fData, pData]) => {
        setBookings(bData);
        setFavoriteIds(fData);
        setPointsHistory(pData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const firstName = user?.name?.split(' ')[0] || 'Гость';
  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();
  const tierLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'partner' ? 'Партнёр' : `Member · с ${memberSince}`;
  const avatar = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=random&color=fff&size=128`;

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер — 1 МБ.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await api('/me', {
          method: 'PATCH',
          body: { avatar_url: reader.result }
        });
        await refresh();
      } catch (err) {
        alert(err.message || 'Ошибка при загрузке аватара');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onLogout = async (e) => {
    e.preventDefault();
    await logout();
    nav('/', { replace: true });
  };

  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'pending');
  const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
  const totalSpent = pastBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.total, 0);
  
  const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatShortDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

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
            <div className="acc-avatar-wrapper">
              <img className="acc-avatar" src={avatar} alt={user?.name || ''} />
              <label htmlFor="avatar-upload" className={`avatar-overlay ${uploading ? 'loading' : ''}`} title="Сменить аватар">
                <i className={uploading ? "ph ph-spinner-gap spin" : "ph ph-camera"} />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </div>
            <div className="info">
              <div className="name">{user?.name}</div>
              <div className="tier">{tierLabel}</div>
            </div>
          </div>
          <nav className="acc-nav">
            <a href="#overview" onClick={(e) => { e.preventDefault(); setActiveTab('overview'); }} className={activeTab === 'overview' ? 'active' : ''}><i className="ph-fill ph-squares-four" /> Обзор</a>
            <a href="#bookings" onClick={(e) => { e.preventDefault(); setActiveTab('bookings'); }} className={activeTab === 'bookings' ? 'active' : ''}><i className="ph-fill ph-calendar-check" /> Бронирования {activeBookings.length > 0 && <span className="badge">{activeBookings.length}</span>}</a>
            <a href="#history" onClick={(e) => { e.preventDefault(); setActiveTab('history'); }} className={activeTab === 'history' ? 'active' : ''}><i className="ph-fill ph-clock-counter-clockwise" /> История</a>
            <a href="#favorites" onClick={(e) => { e.preventDefault(); setActiveTab('favorites'); }} className={activeTab === 'favorites' ? 'active' : ''}><i className="ph-fill ph-heart" /> Избранное {favoriteIds.length > 0 && <span className="badge">{favoriteIds.length}</span>}</a>
            <a href="#bonuses" onClick={(e) => { e.preventDefault(); setActiveTab('bonuses'); }} className={activeTab === 'bonuses' ? 'active' : ''}><i className="ph-fill ph-gift" /> Бонусы</a>
            <a href="#documents" onClick={(e) => { e.preventDefault(); setActiveTab('documents'); }} className={activeTab === 'documents' ? 'active' : ''}><i className="ph-fill ph-file-text" /> Документы</a>
            <a href="#profile" onClick={(e) => { e.preventDefault(); setActiveTab('profile'); }} className={activeTab === 'profile' ? 'active' : ''}><i className="ph-fill ph-user" /> Профиль</a>
          </nav>
          <div className="acc-logout">
            <a href="#logout" onClick={onLogout} className="acc-nav" style={{ display: 'flex', color: 'var(--muted)', fontSize: 13, padding: '8px 14px' }}><i className="ph-fill ph-sign-out" style={{ marginRight: 10, color: 'var(--muted)' }} /> Выйти</a>
          </div>
        </aside>

        <main className="acc-content">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Загрузка данных...</div>
          ) : (
            <>
              {(activeTab === 'overview' || activeTab === 'bookings') && (
                <>
                  <div className="acc-stats">
                    <div className="acc-stat">
                      <div className="lbl"><i className="ph-fill ph-car-profile" /> Аренд</div>
                      <div className="v">{bookings.length}<small>всего</small></div>
                    </div>
                    <div className="acc-stat">
                      <div className="lbl"><i className="ph-fill ph-calendar-check" /> Активных</div>
                      <div className="v">{activeBookings.length}<small>сейчас</small></div>
                    </div>
                    <div className="acc-stat">
                      <div className="lbl"><i className="ph-fill ph-currency-rub" /> Потрачено</div>
                      <div className="v">{totalSpent > 0 ? (totalSpent / 1000000).toFixed(1) : 0}<small>млн ₽</small></div>
                    </div>
                  </div>

                  {activeBookings.length > 0 ? activeBookings.map(b => (
                    <div className="acc-block" key={b.id}>
                      <div className="acc-block-head">
                        <h3>Активное бронирование #{b.id}</h3>
                      </div>
                      <div className="booking-active">
                        <div className="img"><img src={b.car.image_url} alt={b.car.name} /></div>
                        <div className="info">
                          <div className="name">{b.car.name}</div>
                          <div className="meta">{b.car.year} · {b.car.body}</div>
                          <div className="dates">
                            <div>Получение<b>{formatDate(b.from_dt)}</b></div>
                            <div>Возврат<b>{formatDate(b.to_dt)}</b></div>
                            <div>Сумма<b>{b.total.toLocaleString()} ₽</b></div>
                          </div>
                          <div className="status">{b.status === 'pending' ? 'Ожидает подтверждения' : 'В работе'}</div>
                        </div>
                        <div className="actions">
                          <Link to={`/catalog/${b.car.id}`} className="btn btn-sm">Детали авто</Link>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="acc-block">
                      <div className="acc-block-head">
                        <h3>У вас нет активных бронирований</h3>
                      </div>
                      <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                         <Link to="/catalog" className="btn">Перейти в каталог</Link>
                      </div>
                    </div>
                  )}
                </>
              )}

              {(activeTab === 'overview' || activeTab === 'history') && pastBookings.length > 0 && (
                <div className="acc-block">
                  <div className="acc-block-head">
                    <h3>История аренды</h3>
                  </div>
                  <table className="acc-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Автомобиль</th>
                        <th>Период</th>
                        <th>Стоимость</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastBookings.map(b => (
                        <tr key={b.id}>
                          <td>
                            <div className="car-cell">
                              <img src={b.car.image_url} alt={b.car.name} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                              <div><b>{b.car.name}</b></div>
                            </div>
                          </td>
                          <td>{formatShortDate(b.from_dt)} — {formatShortDate(b.to_dt)}</td>
                          <td className="price">{b.total.toLocaleString()} ₽</td>
                          <td>
                            <span className={`tag ${b.status === 'completed' ? 'done' : 'cancel'}`}>
                              {b.status === 'completed' ? 'Завершена' : 'Отменена'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="acc-block">
                  <div className="acc-block-head">
                    <h3>Избранное</h3>
                  </div>
                  {favoriteIds.length > 0 ? (
                    <div className="fleet-grid" data-limit="4" style={{ padding: 20 }}>
                      {allCars.filter(c => favoriteIds.includes(c.id)).map(c => <CarCard key={c.id} car={c} />)}
                    </div>
                  ) : (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>
                      Вы еще не добавили ни одного автомобиля в избранное
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'bonuses' && (
                <>
                  <div className="acc-block">
                    <div className="acc-block-head">
                      <h3><i className="ph-fill ph-gift" style={{ marginRight: 10, color: 'var(--gold)' }} />Бонусная программа</h3>
                    </div>
                    <div style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(200,166,96,0.08)', border: '1px solid rgba(200,166,96,0.25)', borderRadius: 12, padding: '18px 24px', marginBottom: 28 }}>
                        <i className="ph-fill ph-coins" style={{ fontSize: 36, color: 'var(--gold)' }} />
                        <div>
                          <div style={{ fontSize: 13, color: '#888', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Ваш баланс</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{(user.points || 0).toLocaleString()} <span style={{ fontSize: 16, color: '#888' }}>баллов</span></div>
                          <div style={{ fontSize: 13, color: '#bdbdbd', marginTop: 2 }}>= {(user.points || 0).toLocaleString()} ₽</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 16, background: 'var(--bg-2)', border: '1px solid #222', borderRadius: 12, padding: '20px 22px', alignItems: 'flex-start' }}>
                          <i className="ph-fill ph-percent" style={{ fontSize: 28, color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Приветственный бонус</div>
                            <div style={{ fontSize: 14, color: '#bdbdbd', lineHeight: 1.7 }}>
                              При регистрации вы получаете скидку <b style={{ color: '#fff' }}>10%</b> на первую аренду (1 сутки).
                              Применяется автоматически при оформлении первого заказа.
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, background: 'var(--bg-2)', border: '1px solid #222', borderRadius: 12, padding: '20px 22px', alignItems: 'flex-start' }}>
                          <i className="ph-fill ph-star" style={{ fontSize: 28, color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Кэшбэк с аренды</div>
                            <div style={{ fontSize: 14, color: '#bdbdbd', lineHeight: 1.7 }}>
                              С каждой завершённой аренды на ваш счёт возвращается <b style={{ color: '#fff' }}>5%</b> от суммы в виде бонусных баллов.
                              {' '}<b style={{ color: '#fff' }}>1 балл = 1 рубль.</b>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, background: 'var(--bg-2)', border: '1px solid #222', borderRadius: 12, padding: '20px 22px', alignItems: 'flex-start' }}>
                          <i className="ph-fill ph-coins" style={{ fontSize: 28, color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Оплата баллами</div>
                            <div style={{ fontSize: 14, color: '#bdbdbd', lineHeight: 1.7 }}>
                              Накопленными баллами можно оплатить до <b style={{ color: '#fff' }}>100%</b> стоимости аренды любого автомобиля.
                            </div>
                          </div>
                        </div>
                      </div>

                      {pointsHistory.length > 0 && (
                        <div style={{ marginTop: 32 }}>
                          <h4 style={{ color: 'var(--gold)', marginBottom: 16, fontSize: 15, fontWeight: 600 }}>История начислений</h4>
                          <table className="acc-table" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Дата</th>
                                <th>Назначение</th>
                                <th style={{ textAlign: 'right' }}>Баллы</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pointsHistory.map(p => (
                                <tr key={p.id}>
                                  <td>{formatShortDate(p.created_at)}</td>
                                  <td>{p.reason}</td>
                                  <td className="price" style={{ textAlign: 'right', color: p.amount > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
                                    {p.amount > 0 ? `+${p.amount}` : p.amount}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'documents' && (
                <div className="acc-block">
                  <div className="acc-block-head">
                    <h3>Документы</h3>
                    <a href="#">Загрузить →</a>
                  </div>
                  <div className="doc-list">
                    <div className="doc-item">
                      <div className="ico"><i className="ph-fill ph-identification-card" /></div>
                      <div className="meta"><b>Паспорт</b><small>Требуется загрузить</small></div>
                      <a href="#" className="dl"><i className="ph-fill ph-upload-simple" /></a>
                    </div>
                    <div className="doc-item">
                      <div className="ico"><i className="ph-fill ph-car" /></div>
                      <div className="meta"><b>Водительское удостоверение</b><small>Требуется загрузить</small></div>
                      <a href="#" className="dl"><i className="ph-fill ph-upload-simple" /></a>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="acc-block">
                  <div className="acc-block-head">
                    <h3>Профиль</h3>
                  </div>
                  <div className="profile-card">
                    <div className="profile-row"><span className="lbl">ФИО</span><span className="v">{user?.name}</span></div>
                    <div className="profile-row"><span className="lbl">Телефон</span><span className="v">{user?.phone || '—'}</span></div>
                    <div className="profile-row"><span className="lbl">Email</span><span className="v">{user?.email}</span></div>
                    <div className="profile-row"><span className="lbl">Уровень клуба</span><span className="v gold">{tierLabel}</span></div>
                    <div className="profile-row">
                      <span className="lbl">Верификация СБ</span>
                      <span className="v" style={{ color: user?.is_verified ? '#22c55e' : '#888' }}>
                        {user?.is_verified ? '✓ Пройдена' : 'Не пройдена'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
