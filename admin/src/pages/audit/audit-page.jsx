'use client';

import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/aurix-api';
import {
  Toolbar, ToolbarDescription, ToolbarHeading, ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ENTITY_RU = { booking: 'Бронь', user: 'Клиент', car: 'Авто' };
const ACTION_RU = {
  update: 'изменение', create: 'создание', balance: 'баланс', points: 'баллы', charge_add: 'удержание',
};
const ACTION_VARIANT = { update: 'info', create: 'success', balance: 'primary', points: 'primary', charge_add: 'warning', delete: 'destructive' };

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const FILTERS = [['all', 'Все'], ['booking', 'Брони'], ['user', 'Клиенты'], ['car', 'Авто']];

export function AuditPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const qs = filter === 'all' ? '' : `?entity=${filter}`;
    api.get(`/admin/audit${qs}`).then((d) => { setRows(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, [filter]);

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Журнал действий" />
            <ToolbarDescription>Кто, что и когда менял</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>
      <Container>
        <Card>
          <CardHeader className="flex-wrap gap-2">
            <CardHeading><CardTitle>Аудит {!loading && `(${rows.length})`}</CardTitle></CardHeading>
            <div className="flex gap-1.5">
              {FILTERS.map(([k, v]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`h-8 px-3 rounded-md text-sm ${filter === k ? 'bg-primary text-primary-foreground' : 'border border-input'}`}>{v}</button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Загрузка…</div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Записей нет</div>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-4 px-6 py-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Badge size="sm" variant={ACTION_VARIANT[r.action] || 'secondary'} appearance="light">
                        {ACTION_RU[r.action] || r.action}
                      </Badge>
                      <div className="min-w-0">
                        <div className="text-sm text-mono">
                          {ENTITY_RU[r.entity_type] || r.entity_type} #{r.entity_id}
                          {r.changes && (
                            <span className="text-secondary-foreground">
                              {' — '}
                              {Object.entries(r.changes).slice(0, 4).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.actor_name || 'система'}{r.actor_role ? ` · ${r.actor_role}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{fmt(r.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
}
