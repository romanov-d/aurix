'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Trash, Phone } from '@phosphor-icons/react';
import { api } from '@/lib/aurix-api';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { Card, CardHeader, CardHeading, CardTitle, CardTable } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// Воронка обращения. Заявка приходит с сайта как 'new' — менеджер ведёт её
// до 'done' (договорились) или 'rejected' (не целевая/отказ).
const STATUSES = [
  { key: 'new', label: 'Новая', variant: 'primary' },
  { key: 'in_progress', label: 'В работе', variant: 'warning' },
  { key: 'done', label: 'Обработана', variant: 'success' },
  { key: 'rejected', label: 'Отказ', variant: 'secondary' },
];
const statusOf = (k) => STATUSES.find((s) => s.key === k) || { label: k, variant: 'secondary' };

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

// Телефон как ввёл клиент — для ссылки tel: оставляем только цифры и плюс.
const telHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;

export function LeadsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = () => {
    api.get('/admin/contact-requests')
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const counts = useMemo(() => {
    const acc = { all: items.length };
    for (const s of STATUSES) acc[s.key] = items.filter((i) => i.status === s.key).length;
    return acc;
  }, [items]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== 'all' && i.status !== filter) return false;
      if (!needle) return true;
      return [i.name, i.phone, i.car, i.message].some(
        (v) => v && String(v).toLowerCase().includes(needle),
      );
    });
  }, [items, filter, search]);

  const patch = async (id, body) => {
    setSavingId(id);
    try {
      const updated = await api.patch(`/admin/contact-requests/${id}`, body);
      setItems((xs) => xs.map((x) => (x.id === id ? updated : x)));
    } catch (e) {
      alert(e.message || 'Не удалось сохранить');
    } finally {
      setSavingId(null);
    }
  };

  const del = async (id) => {
    if (!confirm('Удалить заявку? Восстановить будет нельзя.')) return;
    try {
      await api.del(`/admin/contact-requests/${id}`);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (e) {
      alert(e.message || 'Не удалось удалить');
    }
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Заявки с сайта" />
          </ToolbarHeading>
          <ToolbarActions>
            <Input
              placeholder="Поиск по имени, телефону, авто"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[260px]"
            />
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            size="sm"
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Все ({counts.all})
          </Button>
          {STATUSES.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={filter === s.key ? 'primary' : 'outline'}
              onClick={() => setFilter(s.key)}
            >
              {s.label} ({counts[s.key] || 0})
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardHeading>
              <CardTitle>Обращения {!loading && `(${visible.length})`}</CardTitle>
            </CardHeading>
          </CardHeader>
          <CardTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Когда</TableHead>
                  <TableHead className="w-[200px]">Клиент</TableHead>
                  <TableHead>Запрос</TableHead>
                  <TableHead className="w-[150px]">Статус</TableHead>
                  <TableHead className="w-[220px]">Комментарий</TableHead>
                  <TableHead className="w-[60px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <div className="flex flex-col gap-3 p-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-4 w-24 shrink-0" />
                            <Skeleton className="h-4 w-40 shrink-0" />
                            <Skeleton className="h-4 grow" />
                            <Skeleton className="h-8 w-28 rounded-md shrink-0" />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      {items.length === 0
                        ? 'Заявок пока нет. Сюда попадают обращения с формы «Оставьте заявку».'
                        : 'Ничего не найдено — измените фильтр или поиск.'}
                    </TableCell>
                  </TableRow>
                ) : visible.map((r) => {
                  const s = statusOf(r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-secondary-foreground whitespace-nowrap">
                        {fmtDateTime(r.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-mono">{r.name}</div>
                        <a
                          href={telHref(r.phone)}
                          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          <Phone className="size-3" /> {r.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        {r.car && <div className="text-sm text-foreground">{r.car}</div>}
                        {r.message && (
                          <div className="text-xs text-secondary-foreground whitespace-pre-wrap">
                            {r.message}
                          </div>
                        )}
                        {!r.car && !r.message && <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge size="sm" variant={s.variant} appearance="light">{s.label}</Badge>
                          <select
                            className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={r.status}
                            disabled={savingId === r.id}
                            onChange={(e) => patch(r.id, { status: e.target.value })}
                          >
                            {STATUSES.map((x) => (
                              <option key={x.key} value={x.key}>{x.label}</option>
                            ))}
                          </select>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Комментарий сохраняем по уходу с поля, чтобы не слать
                            запрос на каждую букву */}
                        <Input
                          defaultValue={r.notes || ''}
                          placeholder="Заметка менеджера"
                          disabled={savingId === r.id}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val !== (r.notes || '')) patch(r.id, { notes: val });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" mode="icon" variant="outline" onClick={() => del(r.id)}>
                          <Trash className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardTable>
        </Card>
      </Container>
    </Fragment>
  );
}
