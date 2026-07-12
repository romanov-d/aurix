'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CalendarCheck, Wallet, ShieldCheck, Coins, AlertTriangle } from 'lucide-react';
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

const fmtMoney = (n) => (n || n === 0 ? Number(n).toLocaleString('ru-RU') : '0') + ' ₽';
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' });
};

// Плитка метрики в стиле профиля Gamer (иконка + число + подпись)
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

  // форма движения баланса
  const [target, setTarget] = useState('money'); // money | deposit
  const [kind, setKind] = useState('topup'); // topup | charge
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/users/${id}`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message || 'Не удалось загрузить клиента'); setLoading(false); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => {
    const bookings = data?.bookings || [];
    const naliot = bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((s, b) => s + (b.total || 0), 0);
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

  if (loading) {
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
          {/* Профиль + метрики */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center size-16 rounded-full bg-primary text-primary-foreground text-2xl font-semibold">
                    {initials}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-semibold text-mono">{u.name || '—'}</span>
                      {u.is_verified ? (
                        <Badge size="sm" variant="success" appearance="light">Проверен</Badge>
                      ) : (
                        <Badge size="sm" variant="secondary" appearance="light">Не проверен</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary-foreground">
                      <span>{u.email}</span>
                      <span>{u.phone || 'телефон не указан'}</span>
                      <span>Менеджер: {u.manager || '—'}</span>
                      <span>С нами с {fmtDate(u.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Ряд метрик */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-border border border-border rounded-lg">
                  <Metric icon={CalendarCheck} value={metrics.rentals} label="Аренд" />
                  <Metric icon={Coins} value={fmtMoney(metrics.naliot)} label="Налёт" />
                  <Metric icon={Wallet} value={fmtMoney(metrics.money)} label="Денежный баланс" accent="bg-primary/15 text-primary" />
                  <Metric icon={ShieldCheck} value={fmtMoney(metrics.deposit)} label="Депозит" accent="bg-primary/15 text-primary" />
                </div>
              </CardContent>
            </Card>

            {/* Брони клиента */}
            <Card>
              <CardHeader>
                <CardHeading><CardTitle>Аренды ({data.bookings.length})</CardTitle></CardHeading>
              </CardHeader>
              <CardContent className="p-0">
                {data.bookings.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">Аренд пока нет</div>
                ) : (
                  <div className="divide-y divide-border">
                    {data.bookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between px-6 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-mono">{b.car?.name || b.car_id}</span>
                          <span className="text-xs text-secondary-foreground">
                            {fmtDate(b.from_dt)} — {fmtDate(b.to_dt)}
                          </span>
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

          {/* Балансы: форма + история */}
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader>
                <CardHeading><CardTitle>Движение баланса</CardTitle></CardHeading>
              </CardHeader>
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
                  <Input
                    inputMode="numeric"
                    placeholder="Сумма, ₽"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  />
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
              <CardHeader>
                <CardHeading><CardTitle>История ({data.transactions?.length || 0})</CardTitle></CardHeading>
              </CardHeader>
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
