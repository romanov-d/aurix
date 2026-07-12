'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CalendarCheck, Wallet, ShieldCheck, Coins, AlertTriangle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/aurix-api';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ROLES = [['user', 'Клиент'], ['partner', 'Партнёр'], ['admin', 'Админ']];
const DOCS = [
  ['passport_url', 'Паспорт'],
  ['passport_page_url', 'Паспорт (1-я стр.)'],
  ['registration_url', 'Прописка'],
  ['license_url', 'Вод. удостоверение'],
];

const fmtMoney = (n) => (n || n === 0 ? Number(n).toLocaleString('ru-RU') : '0') + ' ₽';
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' });
};

// Просмотр документа: data-URL → Blob → новая вкладка (перенос из старой админки)
function viewDoc(url) {
  if (!url) return;
  try {
    if (url.startsWith('data:')) {
      const [meta, b64] = url.split(',');
      const mime = (meta.match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      window.open(URL.createObjectURL(new Blob([arr], { type: mime })), '_blank');
    } else {
      window.open(url, '_blank');
    }
  } catch {
    window.open(url, '_blank');
  }
}

const fieldLabel = 'text-xs text-muted-foreground mb-1.5';
const selectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

function Metric({ icon: Icon, value, label, accent }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className={`flex items-center justify-center size-10 rounded-lg ${accent || 'bg-muted'}`}>
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-mono leading-tight">{value}</span>
        <span className="text-xs text-secondary-foreground">{label}</span>
      </div>
    </div>
  );
}

export function ClientCardPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ver, setVer] = useState(0); // для перемонтирования uncontrolled-полей после сохранения

  // форма движения баланса (Блок 2)
  const [target, setTarget] = useState('money');
  const [kind, setKind] = useState('topup');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/users/${id}`)
      .then((d) => { setData(d); setVer((v) => v + 1); setLoading(false); })
      .catch((e) => { setError(e.message || 'Не удалось загрузить клиента'); setLoading(false); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Сохранение поля профиля (on-blur) → PATCH /admin/users/:id
  const save = useCallback(async (patch) => {
    try {
      await api.patch(`/admin/users/${id}`, patch);
      load();
    } catch (e) {
      alert(e.message || 'Ошибка сохранения');
    }
  }, [id, load]);

  // Начисление/списание баллов (перенос prompt-механики)
  const adjustPoints = useCallback(async (delta, reasonText) => {
    try {
      await api.post(`/admin/users/${id}/points`, { amount: delta, reason: reasonText });
      load();
    } catch (e) {
      alert(e.message || 'Ошибка операции с баллами');
    }
  }, [id, load]);

  const metrics = useMemo(() => {
    const bookings = data?.bookings || [];
    const naliot = bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + (b.total || 0), 0);
    return {
      rentals: bookings.length,
      naliot,
      money: data?.user?.money_balance || 0,
      deposit: data?.user?.deposit_balance || 0,
    };
  }, [data]);

  const submitBalance = async (e) => {
    e.preventDefault();
    setFormError('');
    const amt = parseInt(String(amount).replace(/\D/g, ''), 10);
    if (!amt || amt <= 0) { setFormError('Введите сумму'); return; }
    setSaving(true);
    try {
      await api.post(`/admin/users/${id}/balance`, { kind, target, amount: amt, reason: reason || null });
      setAmount(''); setReason('');
      load();
    } catch (err) {
      setFormError(err.message || 'Ошибка операции');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return <Container><div className="py-16 text-center text-muted-foreground">Загрузка…</div></Container>;
  }
  if (error || !data) {
    return <Container><div className="py-16 text-center text-destructive">{error || 'Клиент не найден'}</div></Container>;
  }

  const u = data.user;
  const initials = (u.name || u.email || 'A').trim().charAt(0).toUpperCase();

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text={u.name || 'Клиент'} />
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" asChild>
              <Link to="/clients">← К списку</Link>
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Шапка + метрики */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center size-16 rounded-full bg-primary text-primary-foreground text-2xl font-semibold">
                    {initials}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-semibold text-mono">{u.name || '—'}</span>
                      {u.is_verified
                        ? <Badge size="sm" variant="success" appearance="light">Проверен</Badge>
                        : <Badge size="sm" variant="secondary" appearance="light">Не проверен</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary-foreground">
                      <span>{u.email}</span>
                      <span>{u.phone || 'телефон не указан'}</span>
                      <span>Менеджер: {u.manager || '—'}</span>
                      <span>С нами с {fmtDate(u.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-border border border-border rounded-lg">
                  <Metric icon={CalendarCheck} value={metrics.rentals} label="Аренд" />
                  <Metric icon={Coins} value={fmtMoney(metrics.naliot)} label="Налёт" />
                  <Metric icon={Wallet} value={fmtMoney(metrics.money)} label="Денежный баланс" accent="bg-primary/15 text-primary" />
                  <Metric icon={ShieldCheck} value={fmtMoney(metrics.deposit)} label="Депозит" accent="bg-primary/15 text-primary" />
                </div>
              </CardContent>
            </Card>

            {/* Профиль (редактирование on-blur) */}
            <Card key={`profile-${u.id}-${ver}`}>
              <CardHeader><CardHeading><CardTitle>Данные клиента</CardTitle></CardHeading></CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className={fieldLabel}>ФИО</div>
                    <Input defaultValue={u.name || ''} onBlur={(e) => e.target.value !== (u.name || '') && save({ name: e.target.value })} />
                  </div>
                  <div>
                    <div className={fieldLabel}>Телефон</div>
                    <Input defaultValue={u.phone || ''} onBlur={(e) => e.target.value !== (u.phone || '') && save({ phone: e.target.value })} />
                  </div>
                  <div>
                    <div className={fieldLabel}>Email</div>
                    <Input defaultValue={u.email || ''} onBlur={(e) => e.target.value !== (u.email || '') && save({ email: e.target.value })} />
                  </div>
                  <div>
                    <div className={fieldLabel}>Дата рождения</div>
                    <Input type="date" defaultValue={(u.dob || '').slice(0, 10)} onBlur={(e) => e.target.value !== (u.dob || '').slice(0, 10) && save({ dob: e.target.value })} />
                  </div>
                  <div>
                    <div className={fieldLabel}>Роль</div>
                    <select className={selectClass} defaultValue={u.role} onChange={(e) => save({ role: e.target.value })}>
                      {ROLES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className={fieldLabel}>Ответственный менеджер</div>
                    <Input defaultValue={u.manager || ''} placeholder="Имя менеджера" onBlur={(e) => e.target.value !== (u.manager || '') && save({ manager: e.target.value })} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className={fieldLabel}>Примечание для админов (видно только админам)</div>
                  <textarea
                    className={`${selectClass} min-h-[60px] py-2 resize-y`}
                    defaultValue={u.admin_note || ''}
                    placeholder="Заметки по клиенту"
                    onBlur={(e) => e.target.value !== (u.admin_note || '') && save({ admin_note: e.target.value })}
                  />
                </div>

                {/* Баллы + верификация */}
                <div className="mt-4 flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/40">
                  <div>
                    <div className={fieldLabel}>Баланс баллов (1 балл = 1 ₽)</div>
                    <div className="text-lg font-semibold text-primary">{(u.points || 0).toLocaleString('ru-RU')} ₽</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    const a = parseInt(prompt('Сколько баллов начислить?'), 10);
                    if (a > 0) adjustPoints(a, prompt('Причина начисления:') || 'Начисление администратором');
                  }}>+ Начислить</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const a = parseInt(prompt('Сколько баллов списать?'), 10);
                    if (a > 0) adjustPoints(-a, prompt('Причина списания:') || 'Списание администратором');
                  }}>− Списать</Button>
                  <div className="ms-auto flex items-center gap-2">
                    <span className={`text-sm ${u.is_verified ? 'text-green-500' : 'text-destructive'}`}>
                      {u.is_verified ? '✓ Верифицирован' : 'Не верифицирован'}
                    </span>
                    <Button size="sm" variant={u.is_verified ? 'outline' : 'primary'} onClick={() => save({ is_verified: !u.is_verified })}>
                      {u.is_verified ? 'Снять' : 'Верифицировать'}
                    </Button>
                  </div>
                </div>

                {/* Документы */}
                <div className="mt-4">
                  <div className={fieldLabel}>Документы</div>
                  <div className="flex flex-wrap gap-2">
                    {DOCS.map(([f, name]) =>
                      u[f] ? (
                        <Button key={f} size="sm" variant="outline" onClick={() => viewDoc(u[f])}>
                          {name} <ExternalLink className="size-3.5 ms-1" />
                        </Button>
                      ) : (
                        <Badge key={f} size="sm" variant="secondary" appearance="light">{name}: нет</Badge>
                      ),
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Аренды клиента */}
            <Card>
              <CardHeader><CardHeading><CardTitle>Аренды ({data.bookings.length})</CardTitle></CardHeading></CardHeader>
              <CardContent className="p-0">
                {data.bookings.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">Аренд пока нет</div>
                ) : (
                  <div className="divide-y divide-border">
                    {data.bookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between px-6 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-mono">
                            {b.car?.name || b.car_id}
                            {b.with_delivery && <Badge size="sm" variant="info" appearance="light" className="ms-2">доставка</Badge>}
                          </span>
                          <span className="text-xs text-secondary-foreground">{fmtDate(b.from_dt)} — {fmtDate(b.to_dt)}</span>
                          {b.notes && <span className="text-xs text-muted-foreground">{b.notes}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-mono">{fmtMoney(b.total)}</span>
                          <Badge size="sm" variant={b.status === 'cancelled' ? 'destructive' : b.status === 'active' ? 'success' : 'secondary'} appearance="light">
                            {b.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Балансы: форма + история (Блок 2) */}
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader><CardHeading><CardTitle>Движение баланса</CardTitle></CardHeading></CardHeader>
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex gap-2">
                  <Button size="sm" variant={target === 'money' ? 'primary' : 'outline'} onClick={() => setTarget('money')}>Денежный</Button>
                  <Button size="sm" variant={target === 'deposit' ? 'primary' : 'outline'} onClick={() => setTarget('deposit')}>Депозит</Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={kind === 'topup' ? 'success' : 'outline'} onClick={() => setKind('topup')}>Пополнить</Button>
                  <Button size="sm" variant={kind === 'charge' ? 'destructive' : 'outline'} onClick={() => setKind('charge')}>Списать</Button>
                </div>
                <form onSubmit={submitBalance} className="flex flex-col gap-3">
                  <Input inputMode="numeric" placeholder="Сумма, ₽" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
                  <Input placeholder="Пояснение (за что)" value={reason} onChange={(e) => setReason(e.target.value)} />
                  {formError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="size-4" /> {formError}
                    </div>
                  )}
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Сохранение…' : kind === 'topup' ? 'Пополнить баланс' : 'Списать с баланса'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardHeading><CardTitle>История ({data.transactions?.length || 0})</CardTitle></CardHeading></CardHeader>
              <CardContent className="p-0">
                {!data.transactions?.length ? (
                  <div className="p-5 text-sm text-muted-foreground">Операций пока нет</div>
                ) : (
                  <div className="divide-y divide-border">
                    {data.transactions.map((t) => {
                      const pos = t.kind === 'topup';
                      return (
                        <div key={t.id} className="flex items-center justify-between px-5 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-mono">{t.reason || (pos ? 'Пополнение' : 'Списание')}</span>
                            <span className="text-xs text-secondary-foreground">
                              {t.target === 'money' ? 'Денежный' : 'Депозит'} · {fmtDate(t.created_at)}
                            </span>
                          </div>
                          <span className={`text-sm font-semibold ${pos ? 'text-green-500' : 'text-destructive'}`}>
                            {pos ? '+' : '−'}{fmtMoney(t.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </Fragment>
  );
}
