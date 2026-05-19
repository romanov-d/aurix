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

  const updateCarStatus = async (id, status) => {
    try {
      const updated = await api(`/admin/cars/${id}`, { method: 'PATCH', body: { status } });
      setCars(cars.map(c => c.id === id ? { ...c, status: updated.status } : c));
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
                    <th>ID / Модель</th>
                    <th>Год</th>
                    <th>Цена</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map(c => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/car/${c.id}`} style={{ color: '#fff', textDecoration: 'none' }}><b>{c.name}</b></Link><br/>
                        <span style={{ fontSize: 13, color: '#888' }}>{c.id}</span>
                      </td>
                      <td>{c.year}</td>
                      <td>{c.price_per_day.toLocaleString()} ₽</td>
                      <td>
                         <span className={`tag ${c.status === 'published' ? 'done' : c.status === 'hidden' ? 'cancel' : 'ok'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.status === 'published' ? (
                          <button className="btn btn-sm btn-ghost" onClick={() => updateCarStatus(c.id, 'hidden')}>Скрыть</button>
                        ) : (
                          <button className="btn btn-sm" onClick={() => updateCarStatus(c.id, 'published')}>Опубликовать</button>
                        )}
                      </td>
                    </tr>
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
