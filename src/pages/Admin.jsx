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
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      nav('/');
      return;
    }
    Promise.all([
      api('/admin/bookings'),
      api('/admin/cars'),
      api('/admin/users'),
      api('/faq')
    ])
      .then(([b, c, u, f]) => {
        setBookings(b);
        setCars(c);
        setUsers(u);
        setFaqs(f);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, nav]);

  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqForm, setFaqForm] = useState({ id: '', question: '', answer: '', sort_order: 10 });
  const [faqError, setFaqError] = useState('');
  const [faqSaving, setFaqSaving] = useState(false);

  const handleSaveFaq = async (e) => {
    e.preventDefault();
    setFaqError('');
    setFaqSaving(true);
    try {
      const payload = {
        question: faqForm.question,
        answer: faqForm.answer,
        sort_order: parseInt(faqForm.sort_order) || 0
      };
      if (faqForm.id) {
        const updated = await api(`/faq/${faqForm.id}`, {
          method: 'PUT',
          body: payload
        });
        setFaqs(faqs.map(f => f.id === faqForm.id ? updated : f));
      } else {
        const created = await api('/faq', {
          method: 'POST',
          body: payload
        });
        setFaqs([...faqs, created].sort((a, b) => a.sort_order - b.sort_order));
      }
      setShowFaqModal(false);
    } catch (err) {
      setFaqError(err.message || 'Ошибка при сохранении вопроса');
    } finally {
      setFaqSaving(false);
    }
  };

  const handleDeleteFaq = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить этот вопрос?')) return;
    try {
      await api(`/faq/${id}`, { method: 'DELETE' });
      setFaqs(faqs.filter(f => f.id !== id));
    } catch (err) {
      alert(err.message || 'Ошибка при удалении');
    }
  };

  const openFaqModal = (faq = null) => {
    if (faq) {
      setFaqForm({ id: faq.id, question: faq.question, answer: faq.answer, sort_order: faq.sort_order });
    } else {
      setFaqForm({ id: '', question: '', answer: '', sort_order: (faqs[faqs.length - 1]?.sort_order || 0) + 10 });
    }
    setFaqError('');
    setShowFaqModal(true);
  };

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
  
  // Add/Edit Car Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCarId, setEditingCarId] = useState(null);
  const [addForm, setAddForm] = useState({
    id: '', name: '', brand: '', year: 2024, body: 'Купе', fuel: 'Бензин',
    engine: '', power_hp: 300, drive: 'Автомат', price_per_day: 10000,
    deposit: 50000, mileage_limit: 250, overmileage_rate: 200, photo_rate: 5000,
    price_6_12: '', price_30: '', image_url: '', description: '', color: '', badge: ''
  });
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const handleSaveCar = async (e) => {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      const payload = {
        ...addForm,
        year: parseInt(addForm.year) || 2024,
        power_hp: parseInt(addForm.power_hp) || 0,
        price_per_day: parseInt(addForm.price_per_day) || 0,
        deposit: parseInt(addForm.deposit) || 0,
        mileage_limit: parseInt(addForm.mileage_limit) || 0,
        overmileage_rate: parseInt(addForm.overmileage_rate) || 0,
        photo_rate: parseInt(addForm.photo_rate) || 0,
        price_6_12: addForm.price_6_12 ? parseInt(addForm.price_6_12) : null,
        price_30: addForm.price_30 ? parseInt(addForm.price_30) : null,
        description: addForm.description || null,
        color: addForm.color || null,
        badge: addForm.badge || null,
      };

      if (editingCarId) {
        // Update existing car
        const updated = await api(`/admin/cars/${editingCarId}`, {
          method: 'PATCH',
          body: payload
        });
        setCars(cars.map(c => c.id === editingCarId ? updated : c));
      } else {
        // Create new car
        const created = await api('/admin/cars', {
          method: 'POST',
          body: payload
        });
        setCars([created, ...cars]);
      }

      setShowAddModal(false);
      setEditingCarId(null);
      setAddForm({
        id: '', name: '', brand: '', year: 2024, body: 'Купе', fuel: 'Бензин',
        engine: '', power_hp: 300, drive: 'Автомат', price_per_day: 10000,
        deposit: 50000, mileage_limit: 250, overmileage_rate: 200, photo_rate: 5000,
        price_6_12: '', price_30: '', image_url: '', description: '', color: '', badge: ''
      });
    } catch (err) {
      setAddError(err.message || 'Ошибка при сохранении автомобиля');
    } finally {
      setAdding(false);
    }
  };

  const openAddCarModal = () => {
    setEditingCarId(null);
    setAddForm({
      id: '', name: '', brand: '', year: 2024, body: 'Купе', fuel: 'Бензин',
      engine: '', power_hp: 300, drive: 'Автомат', price_per_day: 10000,
      deposit: 50000, mileage_limit: 250, overmileage_rate: 200, photo_rate: 5000,
      price_6_12: '', price_30: '', image_url: '', description: '', color: '', badge: ''
    });
    setAddError('');
    setShowAddModal(true);
  };

  const openEditCarModal = (car) => {
    setEditingCarId(car.id);
    setAddForm({
      id: car.id,
      name: car.name,
      brand: car.brand,
      year: car.year,
      body: car.body || 'Купе',
      fuel: car.fuel || 'Бензин',
      engine: car.engine || '',
      power_hp: car.power_hp || 300,
      drive: car.drive || 'Автомат',
      price_per_day: car.price_per_day || 10000,
      deposit: car.deposit || 50000,
      mileage_limit: car.mileage_limit || 250,
      overmileage_rate: car.overmileage_rate || 200,
      photo_rate: car.photo_rate || 5000,
      price_6_12: car.price_6_12 || '',
      price_30: car.price_30 || '',
      image_url: car.image_url || '',
      description: car.description || '',
      color: car.color || '',
      badge: car.badge || ''
    });
    setAddError('');
    setShowAddModal(true);
  };

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
      <div className="container account" style={{ marginTop: '40px' }}>
        <aside className="acc-side">
          <div style={{ marginBottom: '18px', padding: '0 14px' }}>
            <Link to="/" className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '999px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
              <i className="ph ph-arrow-left" style={{ marginRight: '6px' }} /> Вернуться на сайт
            </Link>
          </div>
          <nav className="acc-nav">
            <a href="#bookings" onClick={(e) => { e.preventDefault(); setActiveTab('bookings'); }} className={activeTab === 'bookings' ? 'active' : ''}><i className="ph-fill ph-calendar-check" /> Бронирования</a>
            <a href="#cars" onClick={(e) => { e.preventDefault(); setActiveTab('cars'); }} className={activeTab === 'cars' ? 'active' : ''}><i className="ph-fill ph-car" /> Автомобили</a>
            <a href="#users" onClick={(e) => { e.preventDefault(); setActiveTab('users'); }} className={activeTab === 'users' ? 'active' : ''}><i className="ph-fill ph-users" /> Пользователи</a>
            <a href="#faq" onClick={(e) => { e.preventDefault(); setActiveTab('faq'); }} className={activeTab === 'faq' ? 'active' : ''}><i className="ph-fill ph-question" /> FAQ</a>
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
                <button className="btn btn-sm" onClick={openAddCarModal}>Добавить авто</button>
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
                            <button className="btn btn-sm" onClick={() => openEditCarModal(c)}>
                              <i className="ph ph-pencil-simple" /> Ред.
                            </button>
                            <button className="btn btn-sm btn-ghost" onClick={() => toggleCarExpand(c.id)}>
                              <i className={`ph ph-${expandedCar === c.id ? 'x' : 'image'}`} /> {expandedCar === c.id ? 'Скрыть фото' : 'Фото/Плашка'}
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
                                  style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
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
                                  <div key={ph.id} style={{ position: 'relative', width: 100, height: 70, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-2)' }}>
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
                                  style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
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

          {activeTab === 'faq' && (
            <div className="acc-block">
              <div className="acc-block-head">
                <h3>Управление FAQ ({faqs.length})</h3>
                <button className="btn btn-sm" onClick={() => openFaqModal()}>Добавить вопрос</button>
              </div>
              <table className="acc-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Сорт.</th>
                    <th>Вопрос / Ответ</th>
                    <th style={{ width: '160px', textAlign: 'right' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {faqs.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 'bold', color: 'var(--gold)' }}>{f.sort_order}</td>
                      <td>
                        <b style={{ color: '#fff', fontSize: '15px' }}>{f.question}</b>
                        <p style={{ margin: '8px 0 0', color: '#bdbdbd', fontSize: '13px', lineHeight: '1.5' }}>{f.answer}</p>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button className="btn btn-sm" onClick={() => openFaqModal(f)}><i className="ph ph-pencil" /></button>
                          <button className="btn btn-sm btn-ghost" onClick={() => handleDeleteFaq(f.id)}><i className="ph ph-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {faqs.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>FAQ пуст. Добавьте первый вопрос.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setShowAddModal(false)}><i className="ph ph-x" /></button>
            <h3>{editingCarId ? 'Редактировать автомобиль' : 'Добавить автомобиль'}</h3>
            {addError && <div className="auth-error" style={{ marginBottom: 16 }}>{addError}</div>}
            
            <form onSubmit={handleSaveCar} className="modal-form">
              <div className="modal-grid-2">
                <div className="field">
                  <label>ID (латиница без пробелов, уникальный)</label>
                  <input value={addForm.id} onChange={e => setAddForm({...addForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '')})} placeholder="porsche-911-carrera" required disabled={editingCarId !== null} />
                </div>
                <div className="field">
                  <label>Название автомобиля</label>
                  <input value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} placeholder="Porsche 911 Carrera" required />
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="field">
                  <label>Бренд</label>
                  <input value={addForm.brand} onChange={e => setAddForm({...addForm, brand: e.target.value})} placeholder="Porsche" required />
                </div>
                <div className="field">
                  <label>Год выпуска</label>
                  <input type="number" value={addForm.year} onChange={e => setAddForm({...addForm, year: e.target.value})} placeholder="2024" required />
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="field">
                  <label>Тип кузова</label>
                  <input value={addForm.body} onChange={e => setAddForm({...addForm, body: e.target.value})} placeholder="Купе" required />
                </div>
                <div className="field">
                  <label>Тип топлива</label>
                  <input value={addForm.fuel} onChange={e => setAddForm({...addForm, fuel: e.target.value})} placeholder="Бензин" required />
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="field">
                  <label>Объем двигателя</label>
                  <input value={addForm.engine} onChange={e => setAddForm({...addForm, engine: e.target.value})} placeholder="3.0 л" required />
                </div>
                <div className="field">
                  <label>Мощность (л.с.)</label>
                  <input type="number" value={addForm.power_hp} onChange={e => setAddForm({...addForm, power_hp: e.target.value})} placeholder="480" required />
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="field">
                  <label>Коробка / Привод</label>
                  <input value={addForm.drive} onChange={e => setAddForm({...addForm, drive: e.target.value})} placeholder="Автомат" required />
                </div>
                <div className="field">
                  <label>Цвет</label>
                  <input value={addForm.color} onChange={e => setAddForm({...addForm, color: e.target.value})} placeholder="Красный" required />
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="field">
                  <label>Цена за 1-5 суток (₽)</label>
                  <input type="number" value={addForm.price_per_day} onChange={e => setAddForm({...addForm, price_per_day: e.target.value})} required />
                </div>
                <div className="field">
                  <label>Залог (₽)</label>
                  <input type="number" value={addForm.deposit} onChange={e => setAddForm({...addForm, deposit: e.target.value})} required />
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="field">
                  <label>Цена за 6-12 суток (₽, необязательно)</label>
                  <input type="number" value={addForm.price_6_12} onChange={e => setAddForm({...addForm, price_6_12: e.target.value})} />
                </div>
                <div className="field">
                  <label>Цена от 30 суток (₽, необязательно)</label>
                  <input type="number" value={addForm.price_30} onChange={e => setAddForm({...addForm, price_30: e.target.value})} />
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="field">
                  <label>Суточный лимит пробега (км)</label>
                  <input type="number" value={addForm.mileage_limit} onChange={e => setAddForm({...addForm, mileage_limit: e.target.value})} required />
                </div>
                <div className="field">
                  <label>Цена перелимита (₽/км)</label>
                  <input type="number" value={addForm.overmileage_rate} onChange={e => setAddForm({...addForm, overmileage_rate: e.target.value})} required />
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="field">
                  <label>Фотосессия (₽/час)</label>
                  <input type="number" value={addForm.photo_rate} onChange={e => setAddForm({...addForm, photo_rate: e.target.value})} required />
                </div>
                <div className="field">
                  <label>Плашка (Хит, VIP, Новинка, необязательно)</label>
                  <input value={addForm.badge} onChange={e => setAddForm({...addForm, badge: e.target.value})} placeholder="Хит" />
                </div>
              </div>

              <div className="field">
                <label>Основное изображение (URL-ссылка)</label>
                <input value={addForm.image_url} onChange={e => setAddForm({...addForm, image_url: e.target.value})} placeholder="/cars/porsche_gts.png" required />
              </div>

              <div className="field">
                <label>Описание автомобиля (для страницы авто)</label>
                <textarea value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} placeholder="Подробное описание автомобиля..." rows={3} required />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={adding}>Отмена</button>
                <button type="submit" className="btn btn-filled" disabled={adding}>{adding ? 'Сохранение...' : editingCarId ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFaqModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setShowFaqModal(false)}><i className="ph ph-x" /></button>
            <h3>{faqForm.id ? 'Редактировать вопрос' : 'Добавить вопрос в FAQ'}</h3>
            {faqError && <div className="auth-error" style={{ marginBottom: 16 }}>{faqError}</div>}
            
            <form onSubmit={handleSaveFaq} className="modal-form">
              <div className="field">
                <label>Вопрос</label>
                <input value={faqForm.question} onChange={e => setFaqForm({...faqForm, question: e.target.value})} placeholder="Можно ли арендовать авто..." required />
              </div>

              <div className="field">
                <label>Ответ</label>
                <textarea value={faqForm.answer} onChange={e => setFaqForm({...faqForm, answer: e.target.value})} placeholder="Конечно. Наша компания..." rows={5} required />
              </div>

              <div className="field">
                <label>Порядок сортировки (sort_order, чем меньше число, тем выше вопрос)</label>
                <input type="number" value={faqForm.sort_order} onChange={e => setFaqForm({...faqForm, sort_order: e.target.value})} required />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowFaqModal(false)} disabled={faqSaving}>Отмена</button>
                <button type="submit" className="btn btn-filled" disabled={faqSaving}>{faqSaving ? 'Сохранение...' : 'Сохранить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
