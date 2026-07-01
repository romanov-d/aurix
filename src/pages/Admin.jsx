import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';
import AdminChat from '../components/AdminChat.jsx';
import { adminUnread } from '../api/chat.js';

// ── Русские названия статусов ──
const BOOKING_STATUS_RU = { pending: 'Ожидает', active: 'В аренде', completed: 'Завершена', cancelled: 'Отменена' };
const CAR_STATUS_RU = { published: 'Опубликована', hidden: 'Скрыта', pending: 'На модерации', rejected: 'Отклонена' };
const ROLE_RU = { user: 'Клиент', partner: 'Партнёр', admin: 'Админ' };

// ── Этапы воронки бронирования (по порядку) ──
const STAGES = [
  { key: 'new', label: 'Новая заявка', icon: 'ph-tray' },
  { key: 'docs', label: 'Проверка документов', icon: 'ph-identification-card' },
  { key: 'prepay', label: 'Оплата бронирования', icon: 'ph-link' },
  { key: 'manager', label: 'Назначен менеджер', icon: 'ph-user-circle' },
  { key: 'issued', label: 'Выдан / в аренде', icon: 'ph-car' },
  { key: 'completed', label: 'Завершена', icon: 'ph-check-circle' },
  { key: 'cancelled', label: 'Отменена', icon: 'ph-x-circle' },
];
const STAGE_RU = Object.fromEntries(STAGES.map(s => [s.key, s.label]));
const stageRu = (s) => STAGE_RU[s] || BOOKING_STATUS_RU[s] || s;
const statusTagClass = (st) => st === 'completed' ? 'done' : st === 'cancelled' ? 'cancel' : st === 'active' ? 'ok' : '';

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sideOpen, setSideOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatUserId, setChatUserId] = useState(null); // менеджер пишет клиенту первым
  const messageUser = (id) => { setChatUserId(id); setActiveTab('chat'); };

  // Бейдж непрочитанных чатов в меню админки
  useEffect(() => {
    let alive = true;
    const tick = () => adminUnread().then((r) => { if (alive) setChatUnread(r.count || 0); }).catch(() => {});
    tick();
    const t = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [activeTab]);
  
  const [bookings, setBookings] = useState([]);
  const [cars, setCars] = useState([]);
  const [users, setUsers] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);      // { user, bookings, points }
  const [clientLoading, setClientLoading] = useState(false);

  // Поиск по пользователям (телефон / почта / ФИО)
  const [userSearch, setUserSearch] = useState('');
  // Настройки (кэшбэк %)
  const [settings, setSettings] = useState({ cashback_percent: '5' });
  // Карточка брони (изменить)
  const [bookingCard, setBookingCard] = useState(null);
  // Фильтры броней
  const [bookingStageFilter, setBookingStageFilter] = useState('all');
  const [bookingQuery, setBookingQuery] = useState('');
  // Карточка-«проваливание» в машину (история, характеристики)
  const [carView, setCarView] = useState(null);
  // Модалки ручного добавления
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);

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

  const openClient = async (id) => {
    setClientLoading(true);
    setClient({ user: { id }, bookings: [], points: [] });
    try {
      const data = await api(`/admin/users/${id}`);
      setClient(data);
    } catch (e) {
      alert(e.message || 'Не удалось загрузить профиль клиента');
      setClient(null);
    } finally {
      setClientLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      nav('/');
      return;
    }
    Promise.all([
      api('/admin/bookings'),
      api('/admin/cars'),
      api('/admin/users'),
      api('/faq'),
      api('/admin/dashboard'),
      api('/admin/settings').catch(() => ({ cashback_percent: '5' })),
      api('/blog?all=1').catch(() => [])
    ])
      .then(([b, c, u, f, d, s, bp]) => {
        setBookings(b);
        setCars(c);
        setUsers(u);
        setFaqs(f);
        setDashboard(d);
        if (s) setSettings({ cashback_percent: s.cashback_percent ?? '5' });
        setBlogPosts(Array.isArray(bp) ? bp : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, nav]);

  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqForm, setFaqForm] = useState({ id: '', question: '', answer: '', sort_order: 10 });
  const [faqError, setFaqError] = useState('');
  const [faqSaving, setFaqSaving] = useState(false);

  // ── Блог ──
  const emptyBlog = { id: '', title: '', category: '', excerpt: '', content: '', image_url: '', read_time: '', published: true };
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [blogForm, setBlogForm] = useState(emptyBlog);
  const [blogError, setBlogError] = useState('');
  const [blogSaving, setBlogSaving] = useState(false);

  const openBlogModal = (post = null) => {
    setBlogForm(post ? {
      id: post.id, title: post.title || '', category: post.category || '', excerpt: post.excerpt || '',
      content: post.content || '', image_url: post.image_url || '', read_time: post.read_time || '',
      published: post.published ?? true,
    } : emptyBlog);
    setBlogError('');
    setShowBlogModal(true);
  };

  const handleBlogImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Файл слишком большой (макс 2 МБ).'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setBlogForm(f => ({ ...f, image_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveBlog = async (e) => {
    e.preventDefault();
    setBlogError(''); setBlogSaving(true);
    try {
      const payload = {
        title: blogForm.title, category: blogForm.category || null, excerpt: blogForm.excerpt || null,
        content: blogForm.content || null, image_url: blogForm.image_url || null,
        read_time: blogForm.read_time || null, published: blogForm.published,
      };
      if (blogForm.id) {
        const updated = await api(`/blog/${blogForm.id}`, { method: 'PUT', body: payload });
        setBlogPosts(ps => ps.map(p => p.id === blogForm.id ? updated : p));
      } else {
        const created = await api('/blog', { method: 'POST', body: payload });
        setBlogPosts(ps => [created, ...ps]);
      }
      setShowBlogModal(false);
    } catch (err) {
      setBlogError(err.message || 'Ошибка при сохранении статьи');
    } finally {
      setBlogSaving(false);
    }
  };

  const handleDeleteBlog = async (id) => {
    if (!confirm('Удалить статью?')) return;
    try {
      await api(`/blog/${id}`, { method: 'DELETE' });
      setBlogPosts(ps => ps.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message || 'Ошибка при удалении');
    }
  };

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

  const patchBooking = async (id, body) => {
    const updated = await api(`/admin/bookings/${id}`, { method: 'PATCH', body });
    setBookings(bs => bs.map(b => b.id === id ? { ...b, ...updated } : b));
    setBookingCard(c => c && c.id === id ? { ...c, ...updated } : c);
    return updated;
  };

  const updateBookingStatus = async (id, status) => {
    try { await patchBooking(id, { status }); }
    catch (e) { alert(e.message); }
  };

  const setBookingStage = async (id, stage) => {
    try { await patchBooking(id, { stage }); }
    catch (e) { alert(e.message); }
  };

  // Карточка брони (изменить сумму / даты / менеджера / примечания)
  const openBookingCard = (b) => setBookingCard({
    id: b.id, total: b.total, manager: b.manager || '', notes: b.notes || '',
    pickup_city: b.pickup_city || '', stage: b.stage || 'new', status: b.status,
    car: b.car, user: b.user,
    from_dt: b.from_dt?.slice(0, 16), to_dt: b.to_dt?.slice(0, 16),
  });
  const [bookingSaving, setBookingSaving] = useState(false);
  const saveBookingCard = async (e) => {
    e.preventDefault();
    setBookingSaving(true);
    try {
      await patchBooking(bookingCard.id, {
        total: parseInt(bookingCard.total) || 0,
        manager: bookingCard.manager || null,
        notes: bookingCard.notes || null,
        pickup_city: bookingCard.pickup_city || null,
        stage: bookingCard.stage,
        from_dt: bookingCard.from_dt ? new Date(bookingCard.from_dt).toISOString() : undefined,
        to_dt: bookingCard.to_dt ? new Date(bookingCard.to_dt).toISOString() : undefined,
      });
      setBookingCard(null);
    } catch (err) { alert(err.message); }
    finally { setBookingSaving(false); }
  };

  // Удаление машины
  const deleteCar = async (car) => {
    if (!confirm(`Удалить «${car.name}»? Машина исчезнет с сайта. Действие необратимо.`)) return;
    try {
      await api(`/admin/cars/${car.id}`, { method: 'DELETE' });
      setCars(cs => cs.filter(c => c.id !== car.id));
    } catch (e) { alert(e.message); }
  };

  // Порядок машин на сайте (вверх/вниз)
  const moveCar = async (id, dir) => {
    const idx = cars.findIndex(c => c.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= cars.length) return;
    const next = [...cars];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setCars(next);
    try { await api('/admin/cars/reorder', { method: 'POST', body: { ids: next.map(c => c.id) } }); }
    catch (e) { alert(e.message); }
  };

  // Загрузка фото файлом (base64)
  const uploadPhotoFile = async (carId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Файл слишком большой (макс 2 МБ).'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const photo = await api(`/admin/cars/${carId}/photos`, { method: 'POST', body: { url: reader.result } });
        setCarPhotos(p => ({ ...p, [carId]: [...(p[carId] || []), photo] }));
      } catch (err) { alert(err.message); }
    };
    reader.readAsDataURL(file);
  };

  // Единый тариф — сохранить одно поле цены по конкретной машине
  const saveTariffField = async (carId, field, raw) => {
    const car = cars.find(c => c.id === carId);
    const nullable = field === 'price_6_12' || field === 'price_30';
    const val = raw === '' ? (nullable ? null : 0) : parseInt(raw);
    if (car && (car[field] ?? null) === (val ?? null)) return; // без изменений
    try {
      const updated = await api(`/admin/cars/${carId}`, { method: 'PATCH', body: { [field]: val } });
      setCars(cs => cs.map(c => c.id === carId ? { ...c, ...updated } : c));
    } catch (e) { alert(e.message); }
  };

  // Сохранить настройки (кэшбэк %)
  const saveSettings = async () => {
    try {
      const s = await api('/admin/settings', { method: 'PATCH', body: { cashback_percent: parseFloat(settings.cashback_percent) || 0 } });
      setSettings({ cashback_percent: s.cashback_percent });
      alert('Настройки сохранены');
    } catch (e) { alert(e.message); }
  };

  // Карточка клиента — редактирование + баллы
  const saveClientCard = async (patch) => {
    const updated = await api(`/admin/users/${client.user.id}`, { method: 'PATCH', body: patch });
    setClient(c => ({ ...c, user: { ...c.user, ...updated } }));
    setUsers(us => us.map(u => u.id === updated.id ? { ...u, ...updated } : u));
  };
  const adjustPoints = async (amount, reason) => {
    const updated = await api(`/admin/users/${client.user.id}/points`, { method: 'POST', body: { amount, reason } });
    setClient(c => ({ ...c, user: { ...c.user, points: updated.points } }));
    setUsers(us => us.map(u => u.id === updated.id ? { ...u, points: updated.points } : u));
    // обновим историю
    openClient(client.user.id);
  };

  const refreshBookings = async () => { try { setBookings(await api('/admin/bookings')); } catch {} };

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

  if (loading) return <AdminSkeleton />;

  const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const lbl = { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 };
  const backBtn = (onClick, text) => (
    <button className="btn btn-sm btn-ghost" onClick={onClick} style={{ marginBottom: 18 }}><i className="ph ph-arrow-left" /> {text}</button>
  );

  // ── Карточка авто как страница (с настоящим календарём) ──
  function renderCarDetail() {
    const c = carView;
    const money = (v) => (v || v === 0) ? `${Number(v).toLocaleString('ru-RU')} ₽` : '—';
    const carBookings = bookings.filter(b => b.car?.id === c.id);
    const revenue = carBookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.total || 0), 0);
    const fullCar = cars.find(x => x.id === c.id) || c;
    const specs = [['Год', c.year], ['Кузов', c.body], ['Топливо', c.fuel], ['Двигатель', c.engine], ['Мощность', c.power_hp ? `${c.power_hp} л.с.` : '—'], ['Коробка', c.drive], ['Цвет', c.color || '—']];
    const prices = [['1–5 суток', money(c.price_per_day)], ['6–12 суток', money(c.price_6_12)], ['от 30 суток', money(c.price_30)], ['Залог', money(c.deposit)], ['Пробег/сут', c.mileage_limit ? `${c.mileage_limit} км` : '—'], ['Перекат', c.overmileage_rate ? `${c.overmileage_rate} ₽/км` : '—'], ['Фото/час', money(c.photo_rate)]];
    return (
      <div>
        {backBtn(() => setCarView(null), 'Назад в автопарк')}
        <div className="acc-block" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
            {c.image_url && <img src={c.image_url} alt="" style={{ width: 200, height: 124, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 24 }}>{c.name}</h3>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>ID: {c.id}</div>
              <span className={`tag ${c.status === 'published' ? 'done' : c.status === 'hidden' ? 'cancel' : 'ok'}`}>{CAR_STATUS_RU[c.status] || c.status}</span>
              {c.badge && <span className="tag" style={{ marginLeft: 6, color: 'var(--gold)' }}>{c.badge}</span>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <button className="btn btn-sm" onClick={() => openEditCarModal(fullCar)}><i className="ph ph-pencil-simple" /> Редактировать</button>
                <button className="btn btn-sm btn-ghost" onClick={() => toggleCarExpand(c.id)}><i className="ph ph-image" /> Фото / плашка</button>
                <a className="btn btn-sm btn-ghost" href={`/car/${c.id}`} target="_blank" rel="noopener noreferrer">На сайте ↗</a>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '12px 16px', minWidth: 120 }}><div style={lbl}>Выручка</div><div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 18 }}>{revenue.toLocaleString('ru-RU')} ₽</div></div>
              <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '12px 16px', minWidth: 100 }}><div style={lbl}>Броней</div><div style={{ fontWeight: 700, fontSize: 18 }}>{carBookings.length}</div></div>
            </div>
          </div>

          <div className="car-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24, alignItems: 'start' }}>
            <div>
              <div style={{ ...lbl, marginBottom: 8 }}>Календарь занятости</div>
              <BookingCalendar bookings={carBookings} onPick={(b) => openBookingCard(b)} />
              <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Клик по занятой дате — откроется бронь.</div>
            </div>
            <div>
              <div style={{ ...lbl, marginBottom: 8 }}>Характеристики</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                {specs.map(([k, v]) => <div key={k}><div style={lbl}>{k}</div><div style={{ fontSize: 14 }}>{v || '—'}</div></div>)}
              </div>
              <div style={{ ...lbl, marginBottom: 8 }}>Тарифы</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {prices.map(([k, v]) => <div key={k}><div style={lbl}>{k}</div><div style={{ fontSize: 14, color: 'var(--gold)' }}>{v}</div></div>)}
              </div>
            </div>
          </div>

          <div style={{ ...lbl, margin: '22px 0 8px' }}>История бронирований ({carBookings.length})</div>
          {carBookings.length ? (
            <table className="acc-table" style={{ width: '100%', fontSize: 13 }}>
              <tbody>
                {carBookings.map(b => (
                  <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => openBookingCard(b)}>
                    <td>#{b.id}</td>
                    <td><button onClick={(e) => { e.stopPropagation(); openClient(b.user.id); }} style={{ background: 'none', border: 0, padding: 0, color: 'var(--gold)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>{b.user?.name}</button></td>
                    <td>{formatDate(b.from_dt)} — {formatDate(b.to_dt)}</td>
                    <td>{b.total?.toLocaleString()} ₽</td>
                    <td><span className={`tag ${statusTagClass(b.status)}`}>{stageRu(b.stage)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: '#888', fontSize: 13 }}>Бронирований пока нет</p>}
        </div>
      </div>
    );
  }

  // ── Карточка клиента как страница ──
  function renderClientDetail() {
    const u = client.user;
    const inp = { width: '100%', background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: 'var(--head)', padding: '10px 12px', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' };
    const save = (patch) => saveClientCard(patch).catch(e => alert(e.message));
    const docs = [['passport_url', 'Паспорт'], ['passport_page_url', 'Паспорт (1-я стр.)'], ['registration_url', 'Прописка'], ['license_url', 'Вод. удостоверение']];
    return (
      <div>
        {backBtn(() => setClient(null), 'Назад к пользователям')}
        <div className="acc-block" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>Карточка клиента · ID {u.id}</h3>
          {clientLoading ? <p style={{ color: '#888' }}>Загрузка профиля…</p> : (
            <div style={{ maxWidth: 760 }} key={u.id}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div><div style={lbl}>ФИО</div><input style={inp} defaultValue={u.name || ''} onBlur={e => e.target.value !== u.name && save({ name: e.target.value })} /></div>
                <div><div style={lbl}>Телефон</div><input style={inp} defaultValue={u.phone || ''} onBlur={e => e.target.value !== (u.phone || '') && save({ phone: e.target.value })} /></div>
                <div><div style={lbl}>Email</div><input style={inp} defaultValue={u.email || ''} onBlur={e => e.target.value !== u.email && save({ email: e.target.value })} /></div>
                <div><div style={lbl}>Дата рождения</div><input type="date" style={inp} defaultValue={(u.dob || '').slice(0, 10)} onBlur={e => save({ dob: e.target.value })} /></div>
                <div><div style={lbl}>Роль</div><select style={inp} defaultValue={u.role} onChange={e => save({ role: e.target.value })}>{Object.entries(ROLE_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><div style={lbl}>Ответственный менеджер</div><input style={inp} defaultValue={u.manager || ''} placeholder="Имя менеджера" onBlur={e => e.target.value !== (u.manager || '') && save({ manager: e.target.value })} /></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={lbl}>Примечание для админов</div>
                <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} defaultValue={u.admin_note || ''} placeholder="Заметки по клиенту (видны только админам)" onBlur={e => e.target.value !== (u.admin_note || '') && save({ admin_note: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16, padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 10 }}>
                <div><div style={lbl}>Баланс баллов</div><div style={{ color: 'var(--gold)', fontSize: 18, fontWeight: 700 }}>{(u.points || 0).toLocaleString()} ₽</div></div>
                <button className="btn btn-sm" onClick={() => { const a = parseInt(prompt('Сколько баллов начислить?')); if (a > 0) adjustPoints(a, prompt('Причина начисления:') || 'Начисление администратором').catch(e => alert(e.message)); }}>+ Начислить</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { const a = parseInt(prompt('Сколько баллов списать?')); if (a > 0) adjustPoints(-a, prompt('Причина списания:') || 'Списание администратором').catch(e => alert(e.message)); }}>− Списать</button>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ color: u.is_verified ? '#22c55e' : '#fb7185', fontSize: 13, marginRight: 8 }}>{u.is_verified ? '✓ Верифицирован' : 'Не верифицирован'}</span>
                  <button className="btn btn-sm" onClick={() => save({ is_verified: !u.is_verified })}>{u.is_verified ? 'Снять' : 'Верифицировать'}</button>
                </div>
              </div>
              <div style={{ ...lbl, marginBottom: 8 }}>Документы</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                {docs.map(([f, name]) => u[f] ? <button key={f} type="button" className="btn btn-sm" onClick={() => viewDoc(u[f])}>{name} ↗</button> : <span key={f} className="tag cancel">{name}: нет</span>)}
              </div>
              <div style={{ ...lbl, marginBottom: 8 }}>История бронирований ({client.bookings.length})</div>
              {client.bookings.length ? (
                <table className="acc-table" style={{ width: '100%', fontSize: 13 }}>
                  <tbody>
                    {client.bookings.map(bk => (
                      <tr key={bk.id}>
                        <td>{bk.car.name}{bk.with_delivery && <span className="tag" style={{ marginLeft: 6, fontSize: 10 }}>доставка</span>}{bk.notes && <div style={{ fontSize: 11, color: '#888' }}>{bk.notes}</div>}</td>
                        <td>{formatDate(bk.from_dt)} — {formatDate(bk.to_dt)}</td>
                        <td>{bk.total.toLocaleString()} ₽</td>
                        <td><span className={`tag ${statusTagClass(bk.status)}`}>{stageRu(bk.stage)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: '#888', fontSize: 13 }}>Бронирований пока нет</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="acc-page-header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button className="acc-burger" onClick={() => setSideOpen(true)}><i className="ph ph-list" /> Меню</button>
          <h1><i className="ph-fill ph-shield-check" style={{ marginRight: 12, color: 'var(--gold)' }} />Панель управления</h1>
        </div>
      </div>
      <div className={`container account${sideOpen ? ' side-open' : ''}`} style={{ marginTop: '24px' }}>
        <div className="acc-side-backdrop" onClick={() => setSideOpen(false)} />
        <aside className="acc-side">
          <div style={{ marginBottom: '18px', padding: '0 14px' }}>
            <Link to="/" className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '999px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
              <i className="ph ph-arrow-left" style={{ marginRight: '6px' }} /> Вернуться на сайт
            </Link>
          </div>
          <nav className="acc-nav" onClick={() => setSideOpen(false)}>
            <a href="#dashboard" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }} className={activeTab === 'dashboard' ? 'active' : ''}><i className="ph-fill ph-chart-line-up" /> Дашборд</a>
            <a href="#bookings" onClick={(e) => { e.preventDefault(); setActiveTab('bookings'); }} className={activeTab === 'bookings' ? 'active' : ''}><i className="ph-fill ph-calendar-check" /> Бронирования</a>
            <a href="#cars" onClick={(e) => { e.preventDefault(); setActiveTab('cars'); }} className={activeTab === 'cars' ? 'active' : ''}><i className="ph-fill ph-car" /> Автомобили</a>
            <a href="#users" onClick={(e) => { e.preventDefault(); setActiveTab('users'); }} className={activeTab === 'users' ? 'active' : ''}><i className="ph-fill ph-users" /> Пользователи</a>
            <a href="#chat" onClick={(e) => { e.preventDefault(); setActiveTab('chat'); }} className={activeTab === 'chat' ? 'active' : ''}><i className="ph-fill ph-chat-circle-dots" /> Чаты {chatUnread > 0 && <span className="badge">{chatUnread}</span>}</a>
            <a href="#tariffs" onClick={(e) => { e.preventDefault(); setActiveTab('tariffs'); }} className={activeTab === 'tariffs' ? 'active' : ''}><i className="ph-fill ph-table" /> Тарифы</a>
            <a href="#faq" onClick={(e) => { e.preventDefault(); setActiveTab('faq'); }} className={activeTab === 'faq' ? 'active' : ''}><i className="ph-fill ph-question" /> FAQ</a>
            <a href="#blog" onClick={(e) => { e.preventDefault(); setActiveTab('blog'); }} className={activeTab === 'blog' ? 'active' : ''}><i className="ph-fill ph-newspaper" /> Блог</a>
            <a href="#settings" onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }} className={activeTab === 'settings' ? 'active' : ''}><i className="ph-fill ph-gear" /> Настройки</a>
          </nav>
        </aside>

        <main className="acc-content">
          {carView ? renderCarDetail() : client ? renderClientDetail() : (<>
          {activeTab === 'dashboard' && dashboard && (() => {
            const d = dashboard;
            const fmtMoney = (v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)} млн` : v >= 1000 ? `${Math.round(v / 1000)} тыс` : String(v);
            const maxRevenue = Math.max(...(d.revenue_by_month || []).map(m => Number(m.revenue)), 1);

            // Calendar helpers: build 14-day grid
            const today = new Date();
            const calDays = Array.from({ length: 14 }, (_, i) => {
              const dt = new Date(today); dt.setDate(dt.getDate() + i);
              return dt;
            });
            // Group calendar bookings by car
            const calCars = {};
            (d.calendar || []).forEach(b => {
              if (!calCars[b.car_id]) calCars[b.car_id] = { name: b.car_name, brand: b.brand, bookings: [] };
              calCars[b.car_id].bookings.push(b);
            });
            const calCarIds = Object.keys(calCars);

            const isBooked = (carId, day) => {
              const dayStart = new Date(day); dayStart.setHours(0,0,0,0);
              const dayEnd = new Date(day); dayEnd.setHours(23,59,59,999);
              return calCars[carId]?.bookings.find(b => {
                const from = new Date(b.from_dt);
                const to = new Date(b.to_dt);
                return from <= dayEnd && to >= dayStart;
              });
            };

            const fmtShort = (dt) => dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            const fmtWeekday = (dt) => dt.toLocaleDateString('ru-RU', { weekday: 'short' });
            const isToday = (dt) => dt.toDateString() === today.toDateString();
            const isWeekend = (dt) => dt.getDay() === 0 || dt.getDay() === 6;

            return (
              <>
                {/* KPI Cards */}
                <div className="dash-kpi-grid">
                  <div className="dash-kpi">
                    <div className="dash-kpi-icon" style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--gold)' }}><i className="ph-fill ph-currency-circle-dollar" /></div>
                    <div className="dash-kpi-data">
                      <div className="dash-kpi-value">{fmtMoney(d.revenue)} ₽</div>
                      <div className="dash-kpi-label">Общая выручка</div>
                    </div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-icon" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}><i className="ph-fill ph-calendar-blank" /></div>
                    <div className="dash-kpi-data">
                      <div className="dash-kpi-value">{fmtMoney(d.month_revenue)} ₽</div>
                      <div className="dash-kpi-label">Выручка за месяц</div>
                    </div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-icon" style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}><i className="ph-fill ph-clipboard-text" /></div>
                    <div className="dash-kpi-data">
                      <div className="dash-kpi-value">{d.bookings_total}</div>
                      <div className="dash-kpi-label">Всего бронирований</div>
                    </div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-icon" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}><i className="ph-fill ph-users-three" /></div>
                    <div className="dash-kpi-data">
                      <div className="dash-kpi-value">{d.clients}</div>
                      <div className="dash-kpi-label">Клиентов</div>
                    </div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-icon" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}><i className="ph-fill ph-car-profile" /></div>
                    <div className="dash-kpi-data">
                      <div className="dash-kpi-value">{d.cars_published} <span style={{ fontSize: 13, color: '#666' }}>/ {d.cars_total}</span></div>
                      <div className="dash-kpi-label">Авто в парке</div>
                    </div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-icon" style={{ background: 'rgba(251,113,133,0.12)', color: '#fb7185' }}><i className="ph-fill ph-hourglass-medium" /></div>
                    <div className="dash-kpi-data">
                      <div className="dash-kpi-value">{d.bookings_pending}</div>
                      <div className="dash-kpi-label">Ожидают подтверждения</div>
                    </div>
                  </div>
                </div>

                {/* Revenue Chart + Top Cars — side by side */}
                <div className="dash-row">
                  {/* Revenue Chart */}
                  <div className="acc-block dash-chart-block">
                    <div className="acc-block-head"><h3>Выручка по месяцам</h3></div>
                    <div style={{ padding: '24px' }}>
                      {d.revenue_by_month.length === 0 ? (
                        <p style={{ color: '#666', fontSize: 14 }}>Нет данных за последние 6 месяцев</p>
                      ) : (
                        <svg viewBox={`0 0 ${d.revenue_by_month.length * 80} 200`} style={{ width: '100%', height: 200 }}>
                          {d.revenue_by_month.map((m, i) => {
                            const barH = (Number(m.revenue) / maxRevenue) * 150;
                            const x = i * 80 + 10;
                            return (
                              <g key={m.month}>
                                <defs>
                                  <linearGradient id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--gold)" />
                                    <stop offset="100%" stopColor="rgba(212,175,55,0.3)" />
                                  </linearGradient>
                                </defs>
                                <rect x={x} y={180 - barH} width={60} height={barH} rx={6} fill={`url(#bar-grad-${i})`} />
                                <text x={x + 30} y={172 - barH} textAnchor="middle" fill="#fff" fontSize="11" fontFamily="Inter, sans-serif">
                                  {fmtMoney(Number(m.revenue))} ₽
                                </text>
                                <text x={x + 30} y={196} textAnchor="middle" fill="#888" fontSize="11" fontFamily="Inter, sans-serif">
                                  {m.month_name?.slice(0, 3) || m.month}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Top Cars */}
                  <div className="acc-block dash-top-block">
                    <div className="acc-block-head"><h3>Топ-5 авто по выручке</h3></div>
                    <div style={{ padding: '16px 0' }}>
                      {d.top_cars.filter(c => Number(c.revenue) > 0).length === 0 ? (
                        <p style={{ color: '#666', fontSize: 14, padding: '0 24px' }}>Нет завершённых аренд</p>
                      ) : (
                        d.top_cars.filter(c => Number(c.revenue) > 0).map((car, i) => (
                          <div key={car.id} className="dash-top-row">
                            <span className="dash-top-pos">{i + 1}</span>
                            <img src={car.image_url} alt="" className="dash-top-img" />
                            <div className="dash-top-info">
                              <div className="dash-top-name">{car.name}</div>
                              <div className="dash-top-meta">{Number(car.rentals)} аренд</div>
                            </div>
                            <div className="dash-top-revenue">{Number(car.revenue).toLocaleString('ru-RU')} ₽</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking Calendar */}
                <div className="acc-block">
                  <div className="acc-block-head">
                    <h3>Календарь бронирований <span style={{ fontSize: 13, color: '#666', fontWeight: 400 }}>· 14 дней</span></h3>
                  </div>
                  <div className="dash-calendar-wrap">
                    {calCarIds.length === 0 ? (
                      <p style={{ color: '#666', fontSize: 14, padding: '24px' }}>Нет активных бронирований на ближайшие 14 дней</p>
                    ) : (
                      <table className="dash-calendar">
                        <thead>
                          <tr>
                            <th className="dash-cal-car-th">Авто</th>
                            {calDays.map((dt, i) => (
                              <th key={i} className={`dash-cal-day-th${isToday(dt) ? ' today' : ''}${isWeekend(dt) ? ' weekend' : ''}`}>
                                <div>{fmtWeekday(dt)}</div>
                                <div>{dt.getDate()}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {calCarIds.map(carId => (
                            <tr key={carId}>
                              <td className="dash-cal-car-td">
                                <div className="dash-cal-car-name">{calCars[carId].name}</div>
                              </td>
                              {calDays.map((dt, i) => {
                                const booking = isBooked(carId, dt);
                                return (
                                  <td key={i} className={`dash-cal-cell${booking ? ' booked' : ''}${isToday(dt) ? ' today' : ''}${isWeekend(dt) ? ' weekend' : ''}`}
                                    title={booking ? `${booking.user_name} · ${booking.status}` : 'Свободно'}
                                  >
                                    {booking && <div className={`dash-cal-dot ${booking.status}`} />}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="dash-stats-row">
                  <div className="dash-stat-mini">
                    <span className="dash-stat-mini-label">Средний чек</span>
                    <span className="dash-stat-mini-value">{d.avg_booking.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="dash-stat-mini">
                    <span className="dash-stat-mini-label">Завершено</span>
                    <span className="dash-stat-mini-value">{d.bookings_completed}</span>
                  </div>
                  <div className="dash-stat-mini">
                    <span className="dash-stat-mini-label">Активных</span>
                    <span className="dash-stat-mini-value" style={{ color: '#34d399' }}>{d.bookings_active}</span>
                  </div>
                  <div className="dash-stat-mini">
                    <span className="dash-stat-mini-label">Отменено</span>
                    <span className="dash-stat-mini-value" style={{ color: '#fb7185' }}>{d.bookings_cancelled}</span>
                  </div>
                </div>
              </>
            );
          })()}

          {activeTab === 'bookings' && (() => {
            const q = bookingQuery.trim().toLowerCase();
            const shownBookings = bookings.filter(b => {
              if (bookingStageFilter !== 'all') {
                if (bookingStageFilter === 'active' && b.status !== 'active') return false;
                if (bookingStageFilter === 'pending' && b.status !== 'pending') return false;
                if (bookingStageFilter === 'completed' && b.status !== 'completed') return false;
                if (bookingStageFilter === 'cancelled' && b.status !== 'cancelled') return false;
              }
              if (q) {
                const hay = [`#${b.id}`, b.car?.name, b.user?.name, b.user?.email, b.user?.phone, b.manager].join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
              }
              return true;
            });
            return (
            <div className="acc-block">
              <div className="acc-block-head" style={{ flexWrap: 'wrap', gap: 12 }}>
                <h3>Бронирования ({shownBookings.length})</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="ph ph-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <input value={bookingQuery} onChange={e => setBookingQuery(e.target.value)} placeholder="Поиск: клиент / авто / #ID"
                      style={{ background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: 'var(--head)', padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', width: 220 }} />
                  </div>
                  <select value={bookingStageFilter} onChange={e => setBookingStageFilter(e.target.value)}
                    style={{ background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: 'var(--head)', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
                    <option value="all">Все статусы</option>
                    <option value="pending">Ожидают</option>
                    <option value="active">В аренде</option>
                    <option value="completed">Завершённые</option>
                    <option value="cancelled">Отменённые</option>
                  </select>
                  <button className="btn btn-sm" onClick={() => setShowAddBooking(true)}><i className="ph ph-plus" /> Добавить</button>
                </div>
              </div>
              <table className="acc-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>ID / Авто</th>
                    <th>Клиент</th>
                    <th>Даты</th>
                    <th>Сумма</th>
                    <th>Этап воронки</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {shownBookings.map(b => (
                    <tr key={b.id}>
                      <td>
                        <b>#{b.id}</b>{b.source === 'manual' && <span className="tag" style={{ marginLeft: 6, fontSize: 10 }}>вручную</span>}<br/>
                        <button onClick={() => setCarView(cars.find(c => c.id === b.car.id) || b.car)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--gold)', cursor: 'pointer', font: 'inherit', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 2 }} title="Карточка авто">{b.car.name}</button>
                      </td>
                      <td>
                        <button
                          onClick={() => openClient(b.user.id)}
                          style={{ background: 'none', border: 0, padding: 0, color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, font: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
                          title="Открыть карточку клиента"
                        >{b.user.name}</button>
                        {b.user.is_verified
                          ? <span title="Верифицирован" style={{ color: '#22c55e', marginLeft: 6 }}>✓</span>
                          : <span title="Не верифицирован" style={{ color: '#fb7185', marginLeft: 6 }}>!</span>}
                        <br/>
                        <span style={{ fontSize: 13, color: '#888' }}>{b.user.phone || b.user.email}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {formatDate(b.from_dt)}<br/>
                        {formatDate(b.to_dt)}
                      </td>
                      <td>{b.total.toLocaleString()} ₽</td>
                      <td>
                        <span className={`tag ${statusTagClass(b.status)}`} style={{ marginBottom: 6, display: 'inline-block' }}>{stageRu(b.stage)}</span>
                        {b.status !== 'cancelled' && b.status !== 'completed' && (
                          <select
                            value={b.stage || 'new'}
                            onChange={e => setBookingStage(b.id, e.target.value)}
                            style={{ display: 'block', width: '100%', background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: 'var(--head)', padding: '5px 8px', borderRadius: 7, fontSize: 12, fontFamily: 'inherit' }}
                          >
                            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {b.status === 'pending' && <button className="btn btn-sm" onClick={() => updateBookingStatus(b.id, 'active')}>Выдать</button>}
                          {b.status === 'active' && <button className="btn btn-sm" onClick={() => updateBookingStatus(b.id, 'completed')}>Завершить</button>}
                          {(b.status === 'pending' || b.status === 'active') && <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Отменить бронь?')) updateBookingStatus(b.id, 'cancelled'); }}>Отменить</button>}
                          <button className="btn btn-sm btn-ghost" onClick={() => openBookingCard(b)}><i className="ph ph-pencil-simple" /> Изменить</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {shownBookings.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '36px 0', color: '#888' }}>Ничего не найдено</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            );
          })()}

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
                          <button onClick={() => setCarView(c)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--head)', cursor: 'pointer', font: 'inherit', textAlign: 'left' }} title="Открыть карточку"><b>{c.name}</b></button><br/>
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
                            {CAR_STATUS_RU[c.status] || c.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
                              <button className="btn btn-sm btn-ghost" title="Выше" style={{ padding: '2px 7px', lineHeight: 1 }} onClick={() => moveCar(c.id, -1)}><i className="ph ph-caret-up" /></button>
                              <button className="btn btn-sm btn-ghost" title="Ниже" style={{ padding: '2px 7px', lineHeight: 1 }} onClick={() => moveCar(c.id, 1)}><i className="ph ph-caret-down" /></button>
                            </span>
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
                            <button className="btn btn-sm btn-ghost" title="Удалить машину" style={{ color: '#fb7185' }} onClick={() => deleteCar(c)}><i className="ph ph-trash" /></button>
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
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <input
                                  value={newPhotoUrl}
                                  onChange={e => setNewPhotoUrl(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && addPhoto(c.id)}
                                  placeholder="https://... или /cars/... — ссылка на фото"
                                  style={{ flex: 1, minWidth: 180, background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: 'var(--head)', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
                                />
                                <button className="btn btn-sm" onClick={() => addPhoto(c.id)}>Добавить по ссылке</button>
                                <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
                                  <i className="ph ph-upload-simple" /> Загрузить файл
                                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadPhotoFile(c.id, e)} />
                                </label>
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

          {activeTab === 'users' && (() => {
            const term = userSearch.trim().toLowerCase();
            const shown = term
              ? users.filter(u => [u.name, u.email, u.phone].some(v => (v || '').toLowerCase().includes(term)))
              : users;
            return (
            <div className="acc-block">
              <div className="acc-block-head" style={{ flexWrap: 'wrap', gap: 12 }}>
                <h3>Пользователи ({shown.length})</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="ph ph-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Поиск: телефон / почта / ФИО"
                      style={{ background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: 'var(--head)', padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', width: 240 }}
                    />
                  </div>
                  <button className="btn btn-sm" onClick={() => setShowAddUser(true)}><i className="ph ph-plus" /> Добавить</button>
                </div>
              </div>
              <table className="acc-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>ID / Имя</th>
                    <th>Email / Тел</th>
                    <th>Роль</th>
                    <th>Менеджер</th>
                    <th>СБ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(u => (
                    <tr key={u.id}>
                      <td>
                        <button onClick={() => openClient(u.id)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, font: 'inherit', textAlign: 'left' }}>{u.name}</button><br/>
                        <span style={{ fontSize: 13, color: '#888' }}>ID: {u.id}</span>
                      </td>
                      <td>
                        {u.email}<br/>
                        <span style={{ fontSize: 13, color: '#888' }}>{u.phone || '—'}</span>
                      </td>
                      <td>
                        <span className={`tag ${u.role === 'admin' ? 'done' : u.role === 'partner' ? 'ok' : ''}`}>
                          {ROLE_RU[u.role] || u.role}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: u.manager ? 'var(--head)' : '#555' }}>{u.manager || '—'}</td>
                      <td>
                        {u.is_verified ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                            <span style={{ fontSize: 12, color: '#22c55e' }}>✓ Верифицирован</span>
                            <button className="btn btn-sm btn-ghost" style={{ marginTop: 2, fontSize: 11, padding: '2px 8px' }} onClick={() => verifyUser(u.id, false)}>Снять</button>
                          </div>
                        ) : (
                          <button className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => verifyUser(u.id, true)}>Верифицировать</button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm" onClick={() => messageUser(u.id)} title="Написать клиенту"><i className="ph ph-chat-circle-dots" /> Написать</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => openClient(u.id)}>Карточка</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })()}

          {activeTab === 'chat' && <AdminChat onOpenClient={openClient} openUserId={chatUserId} onOpened={() => setChatUserId(null)} />}

          {activeTab === 'tariffs' && (
            <div className="acc-block">
              <div className="acc-block-head">
                <h3>Единый тариф ({cars.length} авто)</h3>
                <span style={{ fontSize: 12, color: '#888' }}>Меняйте цены прямо в таблице — Enter или уход с поля сохраняет</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="acc-table" style={{ width: '100%', minWidth: 820, fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 160 }}>Авто</th>
                      <th>1–5 дн</th>
                      <th>6–12 дн</th>
                      <th>от 30 дн</th>
                      <th>Залог</th>
                      <th>Пробег/сут</th>
                      <th>Перекат ₽/км</th>
                      <th>Фото ₽/ч</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cars.map(c => (
                      <tr key={c.id}>
                        <td><b style={{ fontSize: 13 }}>{c.name}</b></td>
                        {['price_per_day','price_6_12','price_30','deposit','mileage_limit','overmileage_rate','photo_rate'].map(field => (
                          <td key={field}>
                            <input
                              type="number"
                              defaultValue={c[field] ?? ''}
                              onBlur={e => saveTariffField(c.id, field, e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                              style={{ width: 92, background: 'var(--bg-2)', border: '1px solid #2a2a2a', color: 'var(--gold)', padding: '6px 8px', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="acc-block">
              <div className="acc-block-head"><h3>Настройки</h3></div>
              <div style={{ padding: 24, maxWidth: 460 }}>
                <div className="field" style={{ marginBottom: 18 }}>
                  <label>Кэшбэк с завершённой аренды, %</label>
                  <input
                    type="number" min="0" max="100" step="0.5"
                    value={settings.cashback_percent}
                    onChange={e => setSettings({ cashback_percent: e.target.value })}
                  />
                  <p style={{ fontSize: 12, color: '#888', marginTop: 8, lineHeight: 1.6 }}>
                    Начисляется бонусными баллами после завершения бронирования (1 балл = 1 ₽). Списание баллов — вручную в карточке клиента.
                  </p>
                </div>
                <button className="btn btn-filled" onClick={saveSettings}>Сохранить</button>
              </div>
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

          {activeTab === 'blog' && (
            <div className="acc-block">
              <div className="acc-block-head">
                <h3>Блог ({blogPosts.length})</h3>
                <button className="btn btn-sm" onClick={() => openBlogModal()}><i className="ph ph-plus" /> Добавить статью</button>
              </div>
              <table className="acc-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>Фото</th>
                    <th>Заголовок</th>
                    <th style={{ width: 130 }}>Категория</th>
                    <th style={{ width: 110 }}>Статус</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {blogPosts.map(p => (
                    <tr key={p.id}>
                      <td>
                        {p.image_url
                          ? <img src={p.image_url} alt="" style={{ width: 54, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                          : <div style={{ width: 54, height: 40, borderRadius: 6, background: 'var(--bg-2)' }} />}
                      </td>
                      <td>
                        <Link to={`/blog/${p.id}`} style={{ color: 'var(--head)', textDecoration: 'none', fontWeight: 600 }}>{p.title}</Link>
                        <div style={{ fontSize: 12, color: '#666' }}>{formatDate(p.created_at)}</div>
                      </td>
                      <td><span style={{ fontSize: 13, color: '#bdbdbd' }}>{p.category || '—'}</span></td>
                      <td><span className={`tag ${p.published ? 'done' : 'cancel'}`}>{p.published ? 'Опубл.' : 'Черновик'}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button className="btn btn-sm" onClick={() => openBlogModal(p)}><i className="ph ph-pencil" /></button>
                          <button className="btn btn-sm btn-ghost" onClick={() => handleDeleteBlog(p.id)}><i className="ph ph-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {blogPosts.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>Статей пока нет. Добавьте первую.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          </>)}
        </main>
      </div>

      {showBlogModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setShowBlogModal(false)}><i className="ph ph-x" /></button>
            <h3>{blogForm.id ? 'Редактировать статью' : 'Новая статья'}</h3>
            {blogError && <div className="auth-error" style={{ marginBottom: 16 }}>{blogError}</div>}
            <form onSubmit={handleSaveBlog} className="modal-form">
              <div className="field">
                <label>Заголовок</label>
                <input value={blogForm.title} onChange={e => setBlogForm({ ...blogForm, title: e.target.value })} required />
              </div>
              <div className="modal-grid-2">
                <div className="field">
                  <label>Категория</label>
                  <input value={blogForm.category} onChange={e => setBlogForm({ ...blogForm, category: e.target.value })} placeholder="Обзоры, Тренды…" />
                </div>
                <div className="field">
                  <label>Время чтения</label>
                  <input value={blogForm.read_time} onChange={e => setBlogForm({ ...blogForm, read_time: e.target.value })} placeholder="5 мин" />
                </div>
              </div>
              <div className="field">
                <label>Краткое описание (для карточки)</label>
                <textarea rows={2} value={blogForm.excerpt} onChange={e => setBlogForm({ ...blogForm, excerpt: e.target.value })} />
              </div>
              <div className="field">
                <label>Текст статьи (абзацы — через пустую строку)</label>
                <textarea rows={8} value={blogForm.content} onChange={e => setBlogForm({ ...blogForm, content: e.target.value })} />
              </div>
              <div className="field">
                <label>Изображение</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input style={{ flex: 1, minWidth: 200 }} value={blogForm.image_url} onChange={e => setBlogForm({ ...blogForm, image_url: e.target.value })} placeholder="https://… или загрузите файл" />
                  <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
                    <i className="ph ph-upload-simple" /> Файл
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBlogImage} />
                  </label>
                </div>
                {blogForm.image_url && <img src={blogForm.image_url} alt="" style={{ marginTop: 10, width: 160, height: 100, objectFit: 'cover', borderRadius: 8 }} />}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#bdbdbd', margin: '4px 0' }}>
                <input type="checkbox" checked={blogForm.published} onChange={e => setBlogForm({ ...blogForm, published: e.target.checked })} style={{ accentColor: 'var(--gold)' }} /> Опубликовать (видно на сайте)
              </label>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowBlogModal(false)} disabled={blogSaving}>Отмена</button>
                <button type="submit" className="btn btn-filled" disabled={blogSaving}>{blogSaving ? 'Сохранение…' : 'Сохранить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setShowAddModal(false)}><i className="ph ph-x" /></button>
            <h3>{editingCarId ? 'Редактировать автомобиль' : 'Добавить автомобиль'}</h3>
            {addError && <div className="auth-error" style={{ marginBottom: 16 }}>{addError}</div>}
            
            <form onSubmit={handleSaveCar} className="modal-form">
              <div className="modal-grid-2">
                <div className="field">
                  <label>ID для поиска (латиница, цифры, дефис){editingCarId && <span style={{ color: 'var(--gold)' }}> · можно менять</span>}</label>
                  <input value={addForm.id} onChange={e => setAddForm({...addForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '')})} placeholder="porsche-911-carrera" required />
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

      {bookingCard && (
        <div className="modal-overlay" onClick={() => setBookingCard(null)}>
          <div className="modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setBookingCard(null)}><i className="ph ph-x" /></button>
            <h3 style={{ margin: '0 0 4px' }}>Бронь #{bookingCard.id}</h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>{bookingCard.car?.name} · {bookingCard.user?.name}</p>
            <form onSubmit={saveBookingCard} className="modal-form">
              <div className="modal-grid-2">
                <div className="field"><label>Сумма (₽)</label><input type="number" value={bookingCard.total} onChange={e => setBookingCard({ ...bookingCard, total: e.target.value })} required /></div>
                <div className="field"><label>Этап воронки</label>
                  <select value={bookingCard.stage} onChange={e => setBookingCard({ ...bookingCard, stage: e.target.value })}>
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-grid-2">
                <div className="field"><label>Начало аренды</label><input type="datetime-local" value={bookingCard.from_dt || ''} onChange={e => setBookingCard({ ...bookingCard, from_dt: e.target.value })} /></div>
                <div className="field"><label>Конец аренды</label><input type="datetime-local" value={bookingCard.to_dt || ''} onChange={e => setBookingCard({ ...bookingCard, to_dt: e.target.value })} /></div>
              </div>
              <div className="modal-grid-2">
                <div className="field"><label>Ответственный менеджер</label><input value={bookingCard.manager} onChange={e => setBookingCard({ ...bookingCard, manager: e.target.value })} placeholder="Имя менеджера" /></div>
                <div className="field"><label>Адрес подачи</label><input value={bookingCard.pickup_city} onChange={e => setBookingCard({ ...bookingCard, pickup_city: e.target.value })} /></div>
              </div>
              <div className="field"><label>Примечание</label><textarea rows={2} value={bookingCard.notes} onChange={e => setBookingCard({ ...bookingCard, notes: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setBookingCard(null)}>Отмена</button>
                <button type="submit" className="btn btn-filled" disabled={bookingSaving}>{bookingSaving ? 'Сохранение…' : 'Сохранить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddUser && (
        <AddUserModal onClose={() => setShowAddUser(false)} onCreated={(u) => { setUsers(us => [u, ...us]); setShowAddUser(false); }} />
      )}

      {showAddBooking && (
        <AddBookingModal cars={cars} users={users} onClose={() => setShowAddBooking(false)} onCreated={() => { refreshBookings(); setShowAddBooking(false); }} />
      )}
    </>
  );
}

// ── Календарь занятости авто (месяц, клик по дате → бронь) ──
const CAL_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const CAL_DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
function BookingCalendar({ bookings, onPick }) {
  const today = new Date();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const first = new Date(ym.y, ym.m, 1);
  let lead = first.getDay(); lead = lead === 0 ? 6 : lead - 1;
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const colorFor = (st) => st === 'completed' ? '#34d399' : st === 'active' ? '#d4af37' : st === 'pending' ? '#60a5fa' : '#888';
  const bookingForDay = (d) => {
    const dayStart = new Date(ym.y, ym.m, d, 0, 0, 0);
    const dayEnd = new Date(ym.y, ym.m, d, 23, 59, 59);
    return bookings.find(b => {
      if (b.status === 'cancelled') return false;
      return new Date(b.from_dt) <= dayEnd && new Date(b.to_dt) >= dayStart;
    });
  };
  const prev = () => setYm(s => s.m === 0 ? { y: s.y - 1, m: 11 } : { y: s.y, m: s.m - 1 });
  const next = () => setYm(s => s.m === 11 ? { y: s.y + 1, m: 0 } : { y: s.y, m: s.m + 1 });
  const isToday = (d) => today.getFullYear() === ym.y && today.getMonth() === ym.m && today.getDate() === d;
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button className="btn btn-sm btn-ghost" onClick={prev}><i className="ph ph-caret-left" /></button>
        <b>{CAL_MONTHS[ym.m]} {ym.y}</b>
        <button className="btn btn-sm btn-ghost" onClick={next}><i className="ph ph-caret-right" /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
        {CAL_DOW.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={'e' + i} />;
          const b = bookingForDay(d);
          const col = b ? colorFor(b.status) : null;
          return (
            <button key={d} onClick={() => b && onPick(b)} disabled={!b} title={b ? `#${b.id} · ${b.user?.name || ''}` : ''}
              style={{ aspectRatio: '1', borderRadius: 8, border: isToday(d) ? '1px solid var(--gold)' : '1px solid transparent', background: b ? col + '22' : 'var(--bg-1)', color: b ? col : '#777', cursor: b ? 'pointer' : 'default', fontSize: 13, fontWeight: b ? 700 : 400, fontFamily: 'inherit' }}>
              {d}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, color: '#888', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', marginRight: 5 }} />Ожидает</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#d4af37', marginRight: 5 }} />В аренде</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#34d399', marginRight: 5 }} />Завершена</span>
      </div>
    </div>
  );
}

// ── Ручное добавление клиента ──
function AddUserModal({ onClose, onCreated }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', role: 'user', is_verified: false, manager: '', admin_note: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      const created = await api('/admin/users', { method: 'POST', body: { ...f, password: f.password || undefined } });
      onCreated(created);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><i className="ph ph-x" /></button>
        <h3>Новый клиент</h3>
        {err && <div className="auth-error" style={{ marginBottom: 14 }}>{err}</div>}
        <form onSubmit={submit} className="modal-form">
          <div className="modal-grid-2">
            <div className="field"><label>ФИО</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></div>
            <div className="field"><label>Телефон</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} required /></div>
          </div>
          <div className="modal-grid-2">
            <div className="field"><label>Email</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required /></div>
            <div className="field"><label>Пароль (необязательно)</label><input value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="сгенерируется автоматически" /></div>
          </div>
          <div className="modal-grid-2">
            <div className="field"><label>Роль</label>
              <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
                <option value="user">Клиент</option><option value="partner">Партнёр</option><option value="admin">Админ</option>
              </select>
            </div>
            <div className="field"><label>Менеджер</label><input value={f.manager} onChange={e => setF({ ...f, manager: e.target.value })} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#bdbdbd', margin: '4px 0' }}>
            <input type="checkbox" checked={f.is_verified} onChange={e => setF({ ...f, is_verified: e.target.checked })} style={{ accentColor: 'var(--gold)' }} /> Сразу верифицирован
          </label>
          <div className="field"><label>Примечание</label><textarea rows={2} value={f.admin_note} onChange={e => setF({ ...f, admin_note: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-filled" disabled={saving}>{saving ? 'Создание…' : 'Создать'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Ручное добавление брони (клиент позвонил) ──
function AddBookingModal({ cars, users, onClose, onCreated }) {
  const [f, setF] = useState({
    car_id: '', mode: 'existing', user_id: '', client_name: '', client_email: '', client_phone: '',
    from_dt: '', to_dt: '', total: '', pickup_city: '', with_delivery: false, manager: '', notes: '', stage: 'new',
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setSaving(true);
    try {
      const body = {
        car_id: f.car_id,
        from_dt: new Date(f.from_dt).toISOString(),
        to_dt: new Date(f.to_dt).toISOString(),
        total: parseInt(f.total) || 0,
        pickup_city: f.pickup_city || null, with_delivery: f.with_delivery,
        manager: f.manager || null, notes: f.notes || null, stage: f.stage,
      };
      if (f.mode === 'existing') body.user_id = parseInt(f.user_id);
      else { body.client_name = f.client_name; body.client_email = f.client_email; body.client_phone = f.client_phone; }
      await api('/admin/bookings', { method: 'POST', body });
      onCreated();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 560, maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><i className="ph ph-x" /></button>
        <h3>Новая бронь (вручную)</h3>
        {err && <div className="auth-error" style={{ marginBottom: 14 }}>{err}</div>}
        <form onSubmit={submit} className="modal-form">
          <div className="field"><label>Автомобиль</label>
            <select value={f.car_id} onChange={e => setF({ ...f, car_id: e.target.value })} required>
              <option value="">— выберите —</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Клиент</label>
            <div style={{ display: 'flex', gap: 14, margin: '6px 0' }}>
              <label style={{ fontSize: 13 }}><input type="radio" checked={f.mode === 'existing'} onChange={() => setF({ ...f, mode: 'existing' })} /> Существующий</label>
              <label style={{ fontSize: 13 }}><input type="radio" checked={f.mode === 'new'} onChange={() => setF({ ...f, mode: 'new' })} /> Новый</label>
            </div>
          </div>
          {f.mode === 'existing' ? (
            <div className="field"><label>Из списка</label>
              <select value={f.user_id} onChange={e => setF({ ...f, user_id: e.target.value })} required>
                <option value="">— выберите клиента —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.phone || u.email}</option>)}
              </select>
            </div>
          ) : (
            <div className="modal-grid-2">
              <div className="field"><label>ФИО</label><input value={f.client_name} onChange={e => setF({ ...f, client_name: e.target.value })} required /></div>
              <div className="field"><label>Телефон</label><input value={f.client_phone} onChange={e => setF({ ...f, client_phone: e.target.value })} /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Email</label><input type="email" value={f.client_email} onChange={e => setF({ ...f, client_email: e.target.value })} required /></div>
            </div>
          )}
          <div className="modal-grid-2">
            <div className="field"><label>Начало</label><input type="datetime-local" value={f.from_dt} onChange={e => setF({ ...f, from_dt: e.target.value })} required /></div>
            <div className="field"><label>Конец</label><input type="datetime-local" value={f.to_dt} onChange={e => setF({ ...f, to_dt: e.target.value })} required /></div>
          </div>
          <div className="modal-grid-2">
            <div className="field"><label>Сумма (₽)</label><input type="number" value={f.total} onChange={e => setF({ ...f, total: e.target.value })} required /></div>
            <div className="field"><label>Этап</label>
              <select value={f.stage} onChange={e => setF({ ...f, stage: e.target.value })}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-grid-2">
            <div className="field"><label>Менеджер</label><input value={f.manager} onChange={e => setF({ ...f, manager: e.target.value })} /></div>
            <div className="field"><label>Адрес подачи</label><input value={f.pickup_city} onChange={e => setF({ ...f, pickup_city: e.target.value })} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#bdbdbd', margin: '4px 0' }}>
            <input type="checkbox" checked={f.with_delivery} onChange={e => setF({ ...f, with_delivery: e.target.checked })} style={{ accentColor: 'var(--gold)' }} /> Нужна доставка
          </label>
          <div className="field"><label>Примечание</label><textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-filled" disabled={saving}>{saving ? 'Создание…' : 'Создать бронь'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Скелетон загрузки админ-панели ──
function AdminSkeleton() {
  const ln = (s) => <div className="sk sk-line" style={s} />;
  return (
    <>
      <div className="acc-page-header">
        <div className="container">{ln({ width: 300, height: 30 })}</div>
      </div>
      <div className="container account" style={{ marginTop: 24 }}>
        <aside className="acc-side">
          <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ln({ width: '100%', height: 38, borderRadius: 999 })}
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="sk sk-line" style={{ width: '100%', height: 34, borderRadius: 8 }} />
            ))}
          </div>
        </aside>
        <main className="acc-content">
          <div className="dash-kpi-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="dash-kpi">
                <div className="sk" style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="sk sk-line" style={{ width: '60%', height: 18 }} />
                  <div className="sk sk-line" style={{ width: '80%', height: 11, marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="acc-block" style={{ marginTop: 20 }}>
            <div className="acc-block-head">{ln({ width: 210, height: 18 })}</div>
            <div style={{ padding: '4px 0' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                  <div className="sk sk-line" style={{ width: '22%', height: 14 }} />
                  <div className="sk sk-line" style={{ width: '26%', height: 14 }} />
                  <div className="sk sk-line" style={{ width: '16%', height: 14 }} />
                  <div className="sk sk-line" style={{ width: 96, height: 26, marginLeft: 'auto', borderRadius: 999 }} />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
