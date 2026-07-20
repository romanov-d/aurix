'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/aurix-api';
import { useDashboardData } from '../dashboard-data';

const fmtFull = (v) => (Number(v) || 0).toLocaleString('ru-RU') + ' ₽';

// «Залог на руках» = собрано − возвращено − удержано(из залога), по всем машинам.
// Ниже — список броней с реальным остатком к возврату (авто, без ручных «плановых
// возвратов»). Клик по строке открывает бронь; «Выдал» отдаёт остаток одним кликом.
export function DepositsWidget() {
  const d = useDashboardData();
  const nav = useNavigate();
  const pending = d.deposit_pending || [];
  const [returnedIds, setReturnedIds] = useState(() => new Set()); // выдано в этой сессии
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  // Выданное в этой сессии убираем из списка и вычитаем из «на руках».
  const rows = pending.filter((r) => !returnedIds.has(r.booking_id));
  const returnedSum = pending
    .filter((r) => returnedIds.has(r.booking_id))
    .reduce((s, r) => s + Number(r.remaining || 0), 0);
  const onHand = Math.max(0, Number(d.deposits_on_hand || 0) - returnedSum);
  const pendingTotal = rows.reduce((s, r) => s + Number(r.remaining || 0), 0);

  const openBooking = (id) => nav(`/bookings?open=${id}`);

  async function issue(r, e) {
    e.stopPropagation();
    if (busyId) return;
    setBusyId(r.booking_id);
    setError('');
    try {
      await api.post(`/admin/bookings/${r.booking_id}/return-remaining`);
      setReturnedIds((prev) => new Set(prev).add(r.booking_id));
    } catch (e) {
      setError(e?.message || 'Не удалось отметить выдачу');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading><CardTitle>Залог на руках</CardTitle></CardHeading>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div>
          <div className="text-3xl font-semibold text-mono">{fmtFull(onHand)}</div>
          <div className="text-sm text-muted-foreground mt-1">
            Собрано и ещё не возвращено по всем машинам
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-mono">К возврату клиентам</div>
            {pendingTotal > 0 && (
              <span className="text-sm text-muted-foreground">{fmtFull(pendingTotal)}</span>
            )}
          </div>

          {error && <div className="text-sm text-destructive mb-2">{error}</div>}

          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Нет залогов к возврату</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rows.map((r) => (
                <div
                  key={r.booking_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openBooking(r.booking_id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') openBooking(r.booking_id); }}
                  className="rounded-md border border-border px-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-mono truncate">{r.client_name || 'Клиент'}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[r.brand, r.car_name].filter(Boolean).join(' ')}
                      {r.client_phone ? ` · ${r.client_phone}` : ''}
                      {Number(r.held) > 0 ? ` · удержано ${fmtFull(r.held)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-primary whitespace-nowrap">{fmtFull(r.remaining)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.booking_id}
                      onClick={(e) => issue(r, e)}
                    >
                      {busyId === r.booking_id ? 'Выдаю…' : 'Выдал'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
