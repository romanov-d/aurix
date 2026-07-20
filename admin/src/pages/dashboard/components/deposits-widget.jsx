'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardData } from '../dashboard-data';

const fmtFull = (v) => (Number(v) || 0).toLocaleString('ru-RU') + ' ₽';

const fmtDate = (iso) => {
  if (!iso) return 'Без даты';
  const d = new Date(iso);
  if (isNaN(d)) return 'Без даты';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Плашка «Залог на руках» + календарь запланированных возвратов залога клиентам.
// Клик по дате раскрывает список: кому, сколько, по какой машине.
export function DepositsWidget() {
  const d = useDashboardData();
  const onHand = Number(d.deposits_on_hand || 0);
  const returns = d.deposit_returns || [];
  const [openDate, setOpenDate] = useState(null);

  // Группируем возвраты по дате
  const groups = [];
  const byDate = new Map();
  for (const r of returns) {
    const key = r.due_date ? String(r.due_date).slice(0, 10) : '';
    if (!byDate.has(key)) {
      const g = { key, items: [], total: 0, overdue: false };
      byDate.set(key, g);
      groups.push(g);
    }
    const g = byDate.get(key);
    g.items.push(r);
    g.total += Number(r.amount || 0);
    if (r.overdue) g.overdue = true;
  }

  const plannedTotal = returns.reduce((s, r) => s + Number(r.amount || 0), 0);

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
            <div className="text-sm font-medium text-mono">Календарь возвратов залога</div>
            {plannedTotal > 0 && (
              <span className="text-sm text-muted-foreground">к возврату {fmtFull(plannedTotal)}</span>
            )}
          </div>

          {groups.length === 0 ? (
            <div className="text-sm text-muted-foreground">Запланированных возвратов нет</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {groups.map((g) => {
                const open = openDate === g.key;
                return (
                  <div key={g.key || 'none'} className="rounded-md border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenDate(open ? null : g.key)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm text-mono">{fmtDate(g.key)}</span>
                        {g.overdue && <Badge size="sm" variant="destructive" appearance="light">просрочено</Badge>}
                        <span className="text-xs text-muted-foreground">· {g.items.length}</span>
                      </span>
                      <span className="text-sm font-medium text-primary whitespace-nowrap">{fmtFull(g.total)}</span>
                    </button>
                    {open && (
                      <div className="border-t border-border divide-y divide-border">
                        {g.items.map((r) => (
                          <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <div className="text-mono truncate">{r.client_name || 'Клиент'}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {[r.brand, r.car_name].filter(Boolean).join(' ')}
                                {r.client_phone ? ` · ${r.client_phone}` : ''}
                                {r.note ? ` · ${r.note}` : ''}
                              </div>
                            </div>
                            <div className="text-mono whitespace-nowrap">{fmtFull(r.amount)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
