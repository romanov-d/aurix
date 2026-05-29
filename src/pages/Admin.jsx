import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState('bookings');
  
  const [bookings, setBookings] = useState([]);
  const [cars, setCars] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      nav('/');
      return;
    }
    Promise.all([
      api('/admin/bookings'),
      api('/admin/cars'),
      api('/admin/users')
    ])
      .then(([b, c, u]) => {
        setBookings(b);
        setCars(c);
        setUsers(u);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, nav]);

  const updateBookingStatus = async (id, status) => {
    try {
      const updated = await api(`/admin/bookings/${id}`, { method: 'PATCH', body: { status } });
      setBookings(bookings.map(b => b.id === id ? { ...b, status: updated.status } : b));
    } catch (e) {
      alert(e.message);
    }
  };

  const [expandedCar, setExpandedCar] = useState(null);
  const [carPhotos, setCarPhotos] = useState({});
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [badgeEdit, setBadgeEdit] = useState({});

  const updateCarStatus = async (id, status) => {
    try {
      const updated = await api(`/admin/cars/${id}`, { method: 'PATCH', body: { status } });
      setCars(cars.map(c => c.id === id ? { ...c, status: updated.status } : c));
    } catch (e) {
      alert(e.message);
    }
  };

  const saveBadge = async (id) => {
    try {
      const badge = badgeEdit[id] ?? '';
      const updated = await api(`/admin/cars/${id}`, { method: 'PATCH', body: { badge: badge || null } });
      setCars(cars.map(c => c.id === id ? { ...c, badge: updated.badge } : c));
    } catch (e) {
      alert(e.message);
    }
  };

  const loadPhotos = async (carId) => {
    if (carPhotos[carId]) return;
    const photos = await api(`/admin/cars/${carId}/photos`);
    setCarPhotos(p => ({ ...p, [carId]: photos }));
  };

  const toggleCarExpand = async (carId) => {
    if (expandedCar === carId) { setExpandedCar(null); return; }
    setExpandedCar(carId);
    await loadPhotos(carId);
    setBadgeEdit(b => ({ ...b, [carId]: cars.find(c => c.id === carId)?.badge ?? '' }));
    setNewPhotoUrl('');
  };

  const addPhoto = async (carId) => {
    if (!newPhotoUrl.trim()) return;
    try {
      const photo = await api(`/admin/cars/${carId}/photos`, { method: 'POST', body: { url: newPhotoUrl.trim() } });
      setCarPhotos(p => ({ ...p, [carId]: [...(p[carId] || []), photo] }));
      setNewPhotoUrl('');
    } catch (e) {
      alert(e.message);
    }
  };

  const deletePhoto = async (carId, photoId) => {
    await api(`/admin/cars/${carId}/photos/${photoId}`, { method: 'DELETE' });
    setCarPhotos(p => ({ ...p, [carId]: p[carId].filter(ph => ph.id !== photoId) }));
  };

  const verifyUser = async (id, is_verified) => {
    try {
      const updated = await api(`/admin/users/${id}`, { method: 'PATCH', body: { is_verified } });
      setUsers(users.map(u => u.id === id ? { ...u, is_verified: updated.is_verified } : u));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="container" style={{ padding: '120px 0', color: '#888' }}>Загрузка панели управления...</div>;

  const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/">Главная</Link><span className="sep">/</span><span>Панель управления</span></div>
          <h1>Администрирование</h1>
        </div>
      </div>

      <div className="container account">
        <aside className="acc-side">
          <nav className="acc-nav">
            <a href="#bookings" onClick={(e) => { e.preventDefault(); setActiveTab('bookings'); }} className={activeTab === 'bookings' ? 'active' : ''}><i className="ph-fill ph-calendar-check" /> Бронирования</a>
            <a href="#cars" onClick={(e) => { e.preventDefault(); setActiveTab('cars'); }} className={activeTab === 'cars' ? 'active' : ''}><i className="ph-fill ph-car" /> Автомобили</a>
            <a href="#users" onClick={(e) => { e.preventDefault(); setActiveTab('users'); }} className={activeTab === 'users' ? 'active' : ''}><i className="ph-fill ph-users" /> Пользователи</a>
          </nav>
        </aside>

        <main className="acc-content">
          {activeTab === 'bookings' && (
            <div className="acc-block">
              <div className="acc-block-head">
                <h3>Все бронирования ({bookings.length})</h3>
              </div>
              <table className="acc-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>ID / Авто</th>
                    <th>Клиент</th>
                    <th>Даты</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td>
                        <b>#{b.id}</b><br/>
                        <span style={{ fontSize: 13, color: '#888' }}>{b.car.name}</span>
                      </td>
                      <td>
                        {b.user.name}<br/>
                        <span style={{ fontSize: 13, color: '#888' }}>{b.user.email}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {formatDate(b.from_dt)}<br/>
                        {formatDate(b.to_dt)}
                      </td>
                      <td>{b.total.toLocaleString()} ₽</td>
                      <td>
                         <span className={`tag ${b.status === 'completed' ? 'done' : b.status === 'cancelled' ? 'cancel' : b.status === 'active' ? 'ok' : ''}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        {b.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm" onClick={() => updateBookingStatus(b.id, 'active')}>Выдать</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => updateBookingStatus(b.id, 'cancelled')}>Отмена</button>
                          </div>
                        )}
                        {b.status === 'active' && (
                          <button className="btn btn-sm btn-ghost" onClick={() => updateBookingStatus(b.id, 'completed')}>Завершить</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'cars' && (
            <div className="acc-block">
              <div className="acc-block-head">
                <h3>Автопарк ({cars.length})</h3>
                <button className="btn btn-sm">Добавить авто</button>
              </div>
              <table className="acc-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Модель</th>
                    <th>Плашка</th>
                    <th>Цена</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map(c => (
                    <>
                      <tr key={c.id} style={{ borderBottom: expandedCar === c.id ? '0' : undefined }}>
                        <td>
                          <Link to={`/car/${c.id}`} style={{ color: '#fff', textDecoration: 'none' }}><b>{c.name}</b></Link><br/>
                          <span style={{ fontSize: 12, color: '#555' }}>{c.id}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: c.badge ? 'var(--gold)' : '#555' }}>
                            {c.badge || '—'}
                          </span>
                        </td>
                        <td>{c.price_per_day?.toLocaleString()} ₽</td>
                        <td>
                          <span className={`tag ${c.status === 'published' ? 'done' : c.status === 'hidden' ? 'cancel' : 'ok'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-sm btn-ghost" onClick={() => toggleCarExpand(c.id)}>
                              <i className={`ph ph-${expandedCar === c.id ? 'x' : 'pencil-simple'}`} /> {expandedCar === c.id ? 'Закрыть' : 'Ред.'}
                            </button>
                            {c.status === 'published' && <button className="btn btn-sm btn-ghost" onClick={() => updateCarStatus(c.id, 'hidden')}>Скрыть</button>}
                            {c.status === 'hidden' && <button className="btn btn-sm" onClick={() => updateCarStatus(c.id, 'published')}>Опубл.</button>}
                            {c.status === 'pending' && <>
                              <button className="btn btn-sm" onClick={() => updateCarStatus(c.id, 'published')}>Одобрить</button>
                              <button className="btn btn-sm btn-ghost" onClick={() => updateCarStatus(c.id, 'rejected')}>Откл.</button>
                            </>}
                          </div>
                        </td>
                      </tr>
                      {expandedCar === c.id && (
                        <tr key={`${c.id}-edit`}>
                          <td colSpan={5} style={{ background: '#0d0d0d', padding: '18px 16px', borderRadius: 10 }}>
                            {/* Badge */}
                            <div style={{ marginBottom: 18 }}>
                              <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Плашка</div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                  value={badgeEdit[c.id] ?? c.badge ?? ''}
                                  onChange={e => setBadgeEdit(b => ({ ...b, [c.id]: e.target.value }))}
                                  placeholder="Спецпредложение, Новинка, Хит..."
                                  style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
                                />
                                <button className="btn btn-sm" onClick={() => saveBadge(c.id)}>Сохранить</button>
                                {(badgeEdit[c.id] || c.badge) && (
                                  <button className="btn btn-sm btn-ghost" onClick={() => { setBadgeEdit(b => ({ ...b, [c.id]: '' })); setTimeout(() => saveBadge(c.id), 0); }}>Убрать</button>
                                )}
                              </div>
                            </div>
                            {/* Photos */}
                            <div>
                              <div style={{ fontSize: 12, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Фотографии</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                                {(carPhotos[c.id] || []).map(ph => (
                                  <div key={ph.id} style={{ position: 'relative', width: 100, height: 70, borderRadius: 8, overflow: 'hidden', background: '#111' }}>
                                    <img src={ph.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                      onClick={() => deletePhoto(c.id, ph.id)}
                                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    ><i className="ph ph-x" /></button>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                  value={newPhotoUrl}
                                  onChange={e => setNewPhotoUrl(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && addPhoto(c.id)}
                                  placeholder="https://... URL фотографии"
                                  style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
                                />
                                <button className="btn btn-sm" onClick={() => addPhoto(c.id)}>Добавить</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="acc-block">
              <div className="acc-block-head">
                <h3>Пользователи ({users.length})</h3>
              </div>
              <table className="acc-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>ID / Имя</th>
                    <th>Email / Тел</th>
                    <th>Роль</th>
                    <th>СБ</th>
                    <th>Регистрация</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <b>{u.name}</b><br/>
                        <span style={{ fontSize: 13, color: '#888' }}>ID: {u.id}</span>
                      </td>
                      <td>
                        {u.email}<br/>
                        <span style={{ fontSize: 13, color: '#888' }}>{u.phone || '—'}</span>
                      </td>
                      <td>
                        <span className={`tag ${u.role === 'admin' ? 'done' : u.role === 'partner' ? 'ok' : ''}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.is_verified ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 12, letterSpacing: '.04em' }}>✓ СБ</span>
                            <span style={{ fontSize: 12, color: '#22c55e' }}>Верифицирован</span>
                            <button className="btn btn-sm btn-ghost" style={{ marginTop: 2, fontSize: 11, padding: '2px 8px' }} onClick={() => verifyUser(u.id, false)}>Снять</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                            <span style={{ color: '#555', fontSize: 13 }}>—</span>
                            <button className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => verifyUser(u.id, true)}>Верифицировать</button>
                          </div>
                        )}
                      </td>
                      <td>{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
