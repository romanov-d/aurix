'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, ShieldCheck, ExternalLink, Send, Paperclip } from 'lucide-react';
import { api } from '@/lib/aurix-api';
import { UserHero } from '@/partials/common/user-hero';
import { Statistics } from '@/pages/public-profile/profiles/company/components/statistics';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fmtMoney = (n) => (n || n === 0 ? Number(n).toLocaleString('ru-RU') : '0') + ' ₽';
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' });
};
const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const STATUS_RU = { pending: 'Ожидает', active: 'В аренде', completed: 'Завершена', cancelled: 'Отменена' };
const DOCS = [
  ['passport_url', 'Паспорт (разворот)'],
  ['passport_page_url', 'Паспорт (1-я страница)'],
  ['registration_url', 'Прописка'],
  ['license_url', 'Вод. удостоверение'],
];
const TABS = [
  ['overview', 'Обзор'], ['bookings', 'Бронирования'], ['history', 'История'],
  ['favorites', 'Избранное'], ['bonuses', 'Бонусы'], ['documents', 'Документы'],
  ['profile', 'Профиль'], ['chat', 'Чат'],
];
const fieldLabel = 'text-xs text-muted-foreground mb-1.5';

function readFile(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onloadend = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

export function LkPage() {
  const [tab, setTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [favIds, setFavIds] = useState([]);
  const [cars, setCars] = useState([]);
  const [points, setPoints] = useState([]);
  const [msg, setMsg] = useState('');

  const loadUser = useCallback(() => {
    api.get('/auth/me').then((d) => setUser(d?.user || null)).catch(() => {});
  }, []);

  useEffect(() => {
    loadUser();
    api.get('/me/bookings').then((d) => setBookings(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
    api.get('/me/favorites').then((d) => setFavIds(Array.isArray(d) ? d : [])).catch(() => {});
    api.get('/me/points').then((d) => setPoints(Array.isArray(d) ? d : [])).catch(() => {});
    api.get('/cars?limit=100').then((d) => setCars(d?.items || [])).catch(() => {});
  }, [loadUser]);

  const active = bookings.filter((b) => b.status === 'active' || b.status === 'pending');
  const past = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled');
  const spent = bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + (b.total || 0), 0);
  const favCars = useMemo(() => cars.filter((c) => favIds.includes(c.id)), [cars, favIds]);

  const patchMe = async (patch, okMsg) => {
    try { await api.patch('/me', patch); loadUser(); if (okMsg) { setMsg(okMsg); setTimeout(() => setMsg(''), 2500); } }
    catch (e) { alert(e.message || 'Ошибка'); }
  };

  const uploadDoc = async (field, e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Файл больше 2 МБ'); return; }
    patchMe({ [field]: await readFile(file) });
  };
  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) { alert('Аватар больше 1 МБ'); return; }
    patchMe({ avatar_url: await readFile(file) });
  };

  const cancelBooking = async (id) => {
    if (!confirm('Отменить бронь?')) return;
    try { await api.patch(`/bookings/${id}`, { status: 'cancelled' }); api.get('/me/bookings').then((d) => setBookings(Array.isArray(d) ? d : [])); }
    catch (e) { alert(e.message); }
  };

  if (!user) return <Container><div className="py-16 text-center text-muted-foreground">Загрузка…</div></Container>;

  const initials = (user.name || user.email || 'A').trim().charAt(0).toUpperCase();
  const heroImage = user.avatar_url
    ? <img src={user.avatar_url} alt="" className="size-[100px] rounded-full object-cover border-2 border-primary/40" />
    : <div className="flex items-center justify-center rounded-full border-2 border-primary/40 size-[100px] bg-primary text-primary-foreground text-4xl font-semibold">{initials}</div>;
  const statItems = [
    { number: String(bookings.length), label: 'Аренд' },
    { number: String(active.length), label: 'Активных' },
    { number: fmtMoney(spent), label: 'Потрачено' },
    { number: `${(user.points || 0).toLocaleString('ru-RU')} ₽`, label: 'Баллы' },
  ];

  return (
    <Fragment>
      <UserHero
        name={user.name || 'Клиент'} image={heroImage}
        info={[
          { label: user.phone || 'телефон не указан', icon: Phone },
          { email: user.email, icon: Mail },
          { label: user.is_verified ? 'Верификация пройдена' : 'Не верифицирован', icon: ShieldCheck },
        ]}
      />

      <Container>
        {!user.is_verified && (
          <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-500 px-4 py-3 text-sm">
            Загрузите документы для верификации — без неё бронирование недоступно. Вкладка «Документы».
          </div>
        )}

        {/* Аватар */}
        <div className="mb-4">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-primary">
            <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            Сменить аватар
          </label>
        </div>

        <Statistics items={statItems} />

        {/* Табы */}
        <div className="flex flex-wrap gap-1.5 my-5">
          {TABS.map(([k, label]) => (
            <Button key={k} size="sm" variant={tab === k ? 'primary' : 'outline'} onClick={() => setTab(k)}>{label}</Button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid gap-5">
            <ActiveList list={active} onCancel={cancelBooking} />
            <HistoryList list={past} />
          </div>
        )}
        {tab === 'bookings' && <ActiveList list={active} onCancel={cancelBooking} />}
        {tab === 'history' && <HistoryList list={past} />}
        {tab === 'favorites' && (
          <Card><CardHeader><CardHeading><CardTitle>Избранное ({favCars.length})</CardTitle></CardHeading></CardHeader>
            <CardContent className="p-6">
              {favCars.length === 0 ? <div className="text-sm text-muted-foreground">Список пуст</div> : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {favCars.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border overflow-hidden">
                      <img src={c.image_url} alt="" className="h-28 w-full object-cover" />
                      <div className="p-2"><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-primary">{fmtMoney(c.price_per_day)}/сут</div></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
        )}
        {tab === 'bonuses' && (
          <Card><CardHeader><CardHeading><CardTitle>Бонусы</CardTitle></CardHeading></CardHeader>
            <CardContent className="p-6 flex flex-col gap-4">
              <div><div className={fieldLabel}>Баланс баллов (1 балл = 1 ₽)</div><div className="text-2xl font-semibold text-primary">{(user.points || 0).toLocaleString('ru-RU')} ₽</div></div>
              <div className="text-sm text-secondary-foreground">Кэшбэк 5% с каждой завершённой аренды. Списывает менеджер при оформлении.</div>
              {points.length > 0 && (
                <div className="divide-y divide-border border-t border-border">
                  {points.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2">
                      <div><div className="text-sm">{p.reason}</div><div className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</div></div>
                      <span className={`text-sm font-semibold ${p.amount >= 0 ? 'text-green-500' : 'text-destructive'}`}>{p.amount >= 0 ? '+' : ''}{p.amount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
        )}
        {tab === 'documents' && (
          <Card><CardHeader><CardHeading><CardTitle>Документы</CardTitle></CardHeading></CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCS.map(([f, name]) => (
                <div key={f} className="rounded-lg border border-border p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{name}</div>
                    <div className={`text-xs ${user[f] ? 'text-green-500' : 'text-muted-foreground'}`}>{user[f] ? '✓ Загружено' : 'Требуется загрузить'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user[f] && <Button size="sm" variant="outline" onClick={() => window.open(user[f], '_blank')}><ExternalLink className="size-4" /></Button>}
                    {!user.is_verified && (
                      <label className="inline-flex cursor-pointer">
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => uploadDoc(f, e)} />
                        <span className="inline-flex items-center h-8 px-3 rounded-md border border-input text-sm">{user[f] ? 'Заменить' : 'Загрузить'}</span>
                      </label>
                    )}
                  </div>
                </div>
              ))}
              <div className="md:col-span-2 text-xs text-muted-foreground">
                {user.is_verified ? 'Верификация пройдена — документы заблокированы, изменения через менеджера.' : 'Документы видны только администратору. Макс. 2 МБ.'}
              </div>
            </CardContent></Card>
        )}
        {tab === 'profile' && (
          <Card key={user.id}><CardHeader><CardHeading><CardTitle>Профиль</CardTitle></CardHeading></CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><div className={fieldLabel}>Имя</div><Input defaultValue={user.name || ''} onBlur={(e) => e.target.value !== (user.name || '') && patchMe({ name: e.target.value }, 'Сохранено')} /></div>
              <div><div className={fieldLabel}>Телефон</div><Input defaultValue={user.phone || ''} onBlur={(e) => e.target.value !== (user.phone || '') && patchMe({ phone: e.target.value }, 'Сохранено')} /></div>
              <div><div className={fieldLabel}>Email</div><Input defaultValue={user.email || ''} onBlur={(e) => e.target.value !== (user.email || '') && patchMe({ email: e.target.value }, 'Сохранено')} /></div>
              <div><div className={fieldLabel}>Дата рождения</div><Input type="date" defaultValue={(user.dob || '').slice(0, 10)} onBlur={(e) => patchMe({ dob: e.target.value }, 'Сохранено')} /></div>
              <div className="md:col-span-2 text-sm text-secondary-foreground">
                Верификация СБ: {user.is_verified ? '✓ Пройдена' : 'Не пройдена'}
                {msg && <span className="ms-3 text-green-500">{msg}</span>}
              </div>
            </CardContent></Card>
        )}
        {tab === 'chat' && <LkChat />}
      </Container>
    </Fragment>
  );
}

function ActiveList({ list, onCancel }) {
  return (
    <Card>
      <CardHeader><CardHeading><CardTitle>Активные брони ({list.length})</CardTitle></CardHeading></CardHeader>
      <CardContent className="p-0">
        {list.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Нет активных бронирований</div> : (
          <div className="divide-y divide-border">
            {list.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  {b.car?.image_url && <img src={b.car.image_url} alt="" className="h-10 w-14 rounded object-cover" />}
                  <div>
                    <div className="text-sm font-medium text-mono">{b.car?.name || b.car_id}</div>
                    <div className="text-xs text-secondary-foreground">{fmtDate(b.from_dt)} — {fmtDate(b.to_dt)} · {fmtMoney(b.total)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" variant={b.status === 'active' ? 'success' : 'warning'} appearance="light">{STATUS_RU[b.status]}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => onCancel(b.id)}>Отменить</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryList({ list }) {
  return (
    <Card>
      <CardHeader><CardHeading><CardTitle>История ({list.length})</CardTitle></CardHeading></CardHeader>
      <CardContent className="p-0">
        {list.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Пока нет завершённых аренд</div> : (
          <div className="divide-y divide-border">
            {list.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-6 py-3">
                <div className="text-sm">
                  <div className="font-medium text-mono">{b.car?.name || b.car_id}</div>
                  <div className="text-xs text-secondary-foreground">{fmtDate(b.from_dt)} — {fmtDate(b.to_dt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-mono">{fmtMoney(b.total)}</span>
                  <Badge size="sm" variant={b.status === 'cancelled' ? 'destructive' : 'secondary'} appearance="light">{STATUS_RU[b.status]}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Клиентский чат (мои треды)
function LkChat() {
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  const loadThreads = useCallback(() => {
    api.get('/chat/threads').then((d) => {
      const arr = Array.isArray(d) ? d : d?.items || [];
      setThreads(arr);
      setActiveId((cur) => cur || arr[0]?.id || null);
    }).catch(() => {});
  }, []);
  useEffect(() => { loadThreads(); const t = setInterval(loadThreads, 6000); return () => clearInterval(t); }, [loadThreads]);

  const loadMessages = useCallback(() => {
    if (!activeId) return;
    api.get(`/chat/threads/${activeId}/messages`).then((d) => setMessages(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
  }, [activeId]);
  useEffect(() => { if (!activeId) return; loadMessages(); api.post(`/chat/threads/${activeId}/read`).catch(() => {}); const t = setInterval(loadMessages, 6000); return () => clearInterval(t); }, [activeId, loadMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    let tid = activeId;
    try {
      if (!tid) { const th = await api.post('/chat/threads', {}); tid = th.id; setActiveId(tid); }
      await api.post(`/chat/threads/${tid}/messages`, { body: text.trim() });
      setText(''); loadMessages(); loadThreads();
    } catch (e) { alert(e.message); }
  };

  return (
    <Card className="flex flex-col" style={{ height: 'calc(100vh - 420px)', minHeight: 360 }}>
      <CardHeader><CardHeading><CardTitle>Чат с менеджером</CardTitle></CardHeading></CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && <div className="text-sm text-muted-foreground text-center">Сообщений пока нет. Напишите первым — менеджер ответит.</div>}
          {messages.map((m) => {
            const mine = m.sender_role === 'user';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.body && <div className="text-sm whitespace-pre-wrap">{m.body}</div>}
                  <div className={`text-[11px] mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{fmtTime(m.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-border flex items-center gap-2">
          <Input placeholder="Сообщение…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} className="flex-1" />
          <Button mode="icon" onClick={send}><Send className="size-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
