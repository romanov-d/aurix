import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const ACCOUNT_TABS = ['overview', 'bookings', 'history', 'favorites', 'bonuses', 'documents', 'profile'];
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';
import CarCard from '../components/CarCard.jsx';
import { useCars } from '../api/useCars.js';

export default function Account() {
  const { user, logout, refresh } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Открыть нужную вкладку по хешу URL (напр. /account#documents)
  useEffect(() => {
    const tab = location.hash.replace('#', '');
    if (ACCOUNT_TABS.includes(tab)) setActiveTab(tab);
  }, [location.hash]);
  const [bookings, setBookings] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docUploading, setDocUploading] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '', dob: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    if (user) setProfileForm({ name: user.name || '', phone: user.phone || '', email: user.email || '', dob: (user.dob || '').slice(0, 10) });
  }, [user]);

  const handleDocChange = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Файл слишком большой. Максимум — 2 МБ.'); return; }
    setDocUploading(field);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await api('/me', { method: 'PATCH', body: { [field]: reader.result } });
        await refresh();
      } catch (err) {
        alert(err.message || 'Ошибка загрузки документа');
      } finally {
        setDocUploading('');
      }
    };
    reader.readAsDataURL(file);
  };

  const viewDoc = (url) => {
    if (!url) return;
    try {
      if (url.startsWith('data:')) {
        const [meta, b64] = url.split(',');
        const mime = (meta.match(/data:(.*?);base64/) || [])[1] || 'image/jpeg';
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        window.open(URL.createObjectURL(new Blob([arr], { type: mime })), '_blank');
      } else {
        window.open(url, '_blank');
      }
    } catch { window.open(url, '_blank'); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true); setProfileMsg('');
    try {
      await api('/me', { method: 'PATCH', body: { name: profileForm.name, phone: profileForm.phone, email: profileForm.email, dob: profileForm.dob || null } });
      await refresh();
      setProfileMsg('Изменения сохранены');
    } catch (err) {
      setProfileMsg(err.message || 'Ошибка сохранения');
    } finally {
      setSavingProfile(false);
    }
  };

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
  const tierLabel = user?.role === 'admin' ? 'Администратор' : user?.role === 'partner' ? 'Партнёр' : `Участник · с ${memberSince}`;
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

  const [cancelling, setCancelling] = useState(0);
  const cancelBooking = async (id) => {
    if (!confirm('Отменить бронирование? Отменённая бронь останется в истории.')) return;
    setCancelling(id);
    try {
      const updated = await api(`/bookings/${id}`, { method: 'PATCH', body: { status: 'cancelled' } });
      setBookings(bs => bs.map(b => b.id === id ? { ...b, ...updated } : b));
    } catch (err) {
      alert(err.message || 'Не удалось отменить бронь');
    } finally {
      setCancelling(0);
    }
  };

  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'pending');
  const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
  const totalSpent = pastBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.total, 0);
  
  const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatShortDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <div className="acc-page-header">
        <div className="container">
          <h1><i className="ph-fill ph-user-circle" style={{ marginRight: 12, color: 'var(--gold)' }} />Личный кабинет</h1>
        </div>
      </div>
      <div className="container account" style={{ marginTop: '24px' }}>
        <aside className="acc-side">
          <div style={{ marginBottom: '10px', padding: '0 14px' }}>
            <Link to="/catalog" className="btn btn-filled" style={{ width: '100%', justifyContent: 'center', borderRadius: '999px', fontSize: '13px', display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
              <i className="ph-fill ph-plus" style={{ marginRight: '8px', fontSize: 16 }} /> Забронировать авто
            </Link>
          </div>
          <div style={{ marginBottom: '18px', padding: '0 14px' }}>
            <Link to="/" className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '999px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
              <i className="ph ph-arrow-left" style={{ marginRight: '6px' }} /> Вернуться на сайт
            </Link>
          </div>
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
            <a href="#logout" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)', fontSize: 13, padding: '8px 14px' }}><i className="ph-fill ph-sign-out" style={{ marginRight: 10, color: 'var(--muted)' }} /> Выйти</a>
          </div>
        </aside>

        <main className="acc-content">
          {user && !user.is_verified && (
            (user.passport_url || user.license_url || user.passport_page_url || user.registration_url) ? (
              <div className="acc-verify-banner pending">
                <i className="ph-fill ph-clock-countdown" />
                <div>
                  <b>Документы на проверке</b>
                  <span>Уже поданы на проверку — ожидайте подтверждения службой безопасности.</span>
                </div>
              </div>
            ) : (
              <div className="acc-verify-banner todo">
                <i className="ph-fill ph-warning-circle" />
                <div>
                  <b>Нужно подать документы</b>
                  <span>Без верификации бронирование недоступно. Загрузите документы для проверки.</span>
                </div>
                <button className="btn btn-sm" onClick={() => setActiveTab('documents')}>Загрузить</button>
              </div>
            )
          )}
          {loading ? (
            <AccountContentSkeleton />
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
                        <div className="actions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <Link to={`/car/${b.car.id}`} className="btn btn-sm">Детали авто</Link>
                          <button className="btn btn-sm btn-ghost" disabled={cancelling === b.id} onClick={() => cancelBooking(b.id)}>
                            {cancelling === b.id ? 'Отмена…' : 'Отменить бронь'}
                          </button>
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

              {activeTab === 'history' && pastBookings.length === 0 && (
                <div className="acc-block">
                  <div className="acc-block-head">
                    <h3>История аренды</h3>
                  </div>
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>
                    У вас пока нет завершённых аренд
                  </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(200,166,96,0.08)', border: 'none', borderRadius: 12, padding: '18px 24px', marginBottom: 28 }}>
                        <i className="ph-fill ph-coins" style={{ fontSize: 36, color: 'var(--gold)' }} />
                        <div>
                          <div style={{ fontSize: 13, color: '#888', letterSpacing: '.04em', marginBottom: 4 }}>Ваш баланс</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{(user.points || 0).toLocaleString()} <span style={{ fontSize: 16, color: '#888' }}>баллов</span></div>
                          <div style={{ fontSize: 13, color: '#bdbdbd', marginTop: 2 }}>= {(user.points || 0).toLocaleString()} ₽</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 16, background: 'var(--bg-2)', borderRadius: 12, padding: '20px 22px', alignItems: 'flex-start' }}>
                          <i className="ph-fill ph-percent" style={{ fontSize: 28, color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Приветственный бонус</div>
                            <div style={{ fontSize: 14, color: '#bdbdbd', lineHeight: 1.7 }}>
                              При регистрации вы получаете скидку <b style={{ color: '#fff' }}>10%</b> на первую аренду (1 сутки).
                              Применяется автоматически при оформлении первого заказа.
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, background: 'var(--bg-2)', borderRadius: 12, padding: '20px 22px', alignItems: 'flex-start' }}>
                          <i className="ph-fill ph-star" style={{ fontSize: 28, color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Кэшбэк с аренды</div>
                            <div style={{ fontSize: 14, color: '#bdbdbd', lineHeight: 1.7 }}>
                              С каждой завершённой аренды на ваш счёт возвращается <b style={{ color: '#fff' }}>5%</b> от суммы в виде бонусных баллов.
                              {' '}<b style={{ color: '#fff' }}>1 балл = 1 рубль.</b>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, background: 'var(--bg-2)', borderRadius: 12, padding: '20px 22px', alignItems: 'flex-start' }}>
                          <i className="ph-fill ph-coins" style={{ fontSize: 28, color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Списание баллами</div>
                            <div style={{ fontSize: 14, color: '#bdbdbd', lineHeight: 1.7 }}>
                              Накопленными баллами можно компенсировать до <b style={{ color: '#fff' }}>100%</b> стоимости аренды. Баллы списывает менеджер при оформлении — оплата по ссылке или наличными.
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
                  </div>
                  {user?.is_verified ? (
                    <div style={{ margin: '16px 24px 0', padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: '#86efac', fontSize: 13, lineHeight: 1.6 }}>
                      <i className="ph-fill ph-check-circle" style={{ marginRight: 6 }} />
                      Верификация пройдена. Документы заблокированы для изменений — чтобы что-то поправить, напишите менеджеру.
                    </div>
                  ) : (
                    <div style={{ margin: '16px 24px 0', padding: '12px 16px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, color: '#e8c66c', fontSize: 13, lineHeight: 1.6 }}>
                      <i className="ph-fill ph-info" style={{ marginRight: 6 }} />
                      Загрузите документы для верификации. До её прохождения вы можете заменять и редактировать файлы. Без верификации бронирование недоступно.
                    </div>
                  )}
                  <div className="doc-list">
                    {[
                      { field: 'passport_url', icon: 'ph-identification-card', label: 'Паспорт (разворот)' },
                      { field: 'passport_page_url', icon: 'ph-identification-badge', label: 'Паспорт (1-я страница)' },
                      { field: 'registration_url', icon: 'ph-house', label: 'Прописка' },
                      { field: 'license_url', icon: 'ph-car', label: 'Водительское удостоверение' },
                    ].map(d => {
                      const url = user?.[d.field];
                      const busy = docUploading === d.field;
                      const locked = user?.is_verified;
                      return (
                        <div className="doc-item" key={d.field}>
                          <div className="ico"><i className={`ph-fill ${d.icon}`} /></div>
                          <div className="meta">
                            <b>{d.label}</b>
                            <small style={{ color: url ? '#22c55e' : 'var(--muted)' }}>
                              {busy ? 'Загрузка…' : url ? '✓ Загружено' : 'Требуется загрузить'}
                            </small>
                          </div>
                          {url && (
                            <button type="button" onClick={() => viewDoc(url)} className="dl" title="Посмотреть" style={{ marginRight: 6, background: 'none', border: 0, cursor: 'pointer' }}>
                              <i className="ph-fill ph-eye" />
                            </button>
                          )}
                          {!locked && (
                            <label className="dl" style={{ cursor: busy ? 'default' : 'pointer' }} title={url ? 'Заменить' : 'Загрузить'}>
                              <i className={busy ? 'ph ph-spinner-gap spin' : 'ph-fill ph-upload-simple'} />
                              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} disabled={busy} onChange={(e) => handleDocChange(d.field, e)} />
                            </label>
                          )}
                          {locked && <i className="ph-fill ph-lock" style={{ color: 'var(--muted)' }} title="Заблокировано после верификации" />}
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ padding: '4px 24px 20px', color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }}>
                    Документы видны только администратору для верификации. Максимальный размер файла — 2 МБ.
                  </p>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="acc-block">
                  <div className="acc-block-head">
                    <h3>Профиль</h3>
                  </div>
                  <form className="profile-card" onSubmit={saveProfile} style={{ padding: 24 }}>
                    <div className="field" style={{ marginBottom: 16 }}>
                      <label>Имя</label>
                      <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label>Телефон</label>
                        <input type="tel" placeholder="+7 999 123 45 67" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>
                      <div className="field">
                        <label>Email</label>
                        <input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                      </div>
                    </div>
                    <div className="field" style={{ marginTop: 16 }}>
                      <label>Дата рождения</label>
                      <input type="date" value={profileForm.dob} onChange={e => setProfileForm(f => ({ ...f, dob: e.target.value }))} />
                    </div>
                    <div className="profile-row" style={{ marginTop: 8 }}><span className="lbl">Уровень клуба</span><span className="v gold">{tierLabel}</span></div>
                    <div className="profile-row">
                      <span className="lbl">Верификация СБ</span>
                      <span className="v" style={{ color: user?.is_verified ? '#22c55e' : '#888' }}>
                        {user?.is_verified ? '✓ Пройдена' : 'Не пройдена'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22 }}>
                      <button className="btn btn-filled" type="submit" disabled={savingProfile}>{savingProfile ? 'Сохранение…' : 'Сохранить'}</button>
                      {profileMsg && <span style={{ fontSize: 13, color: /сохран/i.test(profileMsg) ? '#22c55e' : '#e74c3c' }}>{profileMsg}</span>}
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

// ── Скелетон загрузки личного кабинета (контент; сайдбар уже с данными user) ──
function AccountContentSkeleton() {
  return (
    <>
      <div className="acc-stats">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="acc-stat">
            <div className="sk sk-line" style={{ width: '55%', height: 12 }} />
            <div className="sk sk-line" style={{ width: '42%', height: 26, marginTop: 14 }} />
          </div>
        ))}
      </div>
      <div className="acc-block">
        <div className="acc-block-head"><div className="sk sk-line" style={{ width: 230, height: 18 }} /></div>
        <div style={{ padding: 20, display: 'flex', gap: 18, alignItems: 'center' }}>
          <div className="sk" style={{ width: 130, height: 86, borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div className="sk sk-line" style={{ width: '46%', height: 16 }} />
            <div className="sk sk-line" style={{ width: '30%', height: 12 }} />
            <div className="sk sk-line" style={{ width: '70%', height: 12 }} />
            <div className="sk sk-line" style={{ width: '55%', height: 12 }} />
          </div>
        </div>
      </div>
    </>
  );
}
