'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MagnifyingGlass, X, PencilSimple } from '@phosphor-icons/react';
import { api } from '@/lib/aurix-api';
import { fileToCompressedDataUrl, dataUrlBytes } from '@/lib/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Card,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Статус брони → подпись + цвет бейджа (дизайн-система Metronic)
const STATUS_MAP = {
  pending: { label: 'Ожидает', variant: 'warning' },
  booked: { label: 'Оплачена', variant: 'primary' },
  active: { label: 'В аренде', variant: 'success' },
  completed: { label: 'Завершена', variant: 'secondary' },
  cancelled: { label: 'Отменена', variant: 'destructive' },
};

const fmtMoney = (n) =>
  (n || n === 0 ? Number(n).toLocaleString('ru-RU') : '—') + ' ₽';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' });
};

// Дата+время подачи заявки
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Сколько времени прошло с момента (таймер ожидания заявки)
const fmtElapsed = (iso) => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms) || ms < 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч ${min % 60} мин`;
  const d = Math.floor(h / 24);
  return `${d} дн ${h % 24} ч`;
};

// Этапы воронки (как в старой админке)
const STAGES = [
  ['new', 'Новая заявка'], ['docs', 'Проверка документов'],
  ['await_payment', 'Ожидает оплаты бронирования'], ['paid', 'Бронирование оплачено'],
  ['manager', 'Назначен менеджер'], ['issued', 'Выдан / в аренде'], ['completed', 'Завершена'], ['cancelled', 'Отменена'],
];

// ISO(UTC) → значение для datetime-local в ЛОКАЛЬНОМ времени (фикс сдвига −3ч МСК)
const isoToLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const localInputToIso = (v) => (v ? new Date(v).toISOString() : undefined);

const fieldLabel = 'text-xs text-muted-foreground mb-1.5';
const selectCls = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring [color-scheme:dark]';

export function BookingsTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: 'submitted', desc: true }]);
  // Раз в минуту обновляем «таймеры ожидания» в таблице.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [charges, setCharges] = useState([]);
  const [newCharge, setNewCharge] = useState({ type: '', amount: '', note: '', photo_url: '', from_deposit: true });
  const [movements, setMovements] = useState([]);
  const [newMovement, setNewMovement] = useState({ kind: 'return', amount: '', note: '', due_date: '' });

  // Ручное создание брони
  const [cars, setCars] = useState([]);
  const [users, setUsers] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(null);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState('');

  const reload = () => {
    api.get('/admin/bookings').then((d) => setRows(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
  };

  const openAdd = () => {
    setAddError('');
    setAddForm({
      car_id: cars[0]?.id || '', clientMode: 'existing', user_id: users[0]?.id || '',
      client_name: '', client_email: '', client_phone: '',
      from_dt: '', to_dt: '', total: '', pickup_city: '', with_delivery: false, manager: '', notes: '', stage: 'new',
    });
    setAddOpen(true);
  };

  const createBooking = async () => {
    setAddError(''); setSavingAdd(true);
    try {
      const f = addForm;
      const payload = {
        car_id: f.car_id,
        from_dt: localInputToIso(f.from_dt), to_dt: localInputToIso(f.to_dt),
        total: parseInt(f.total, 10) || 0,
        pickup_city: f.pickup_city || null, with_delivery: f.with_delivery,
        manager: f.manager || null, notes: f.notes || null, stage: f.stage,
      };
      if (f.clientMode === 'existing') payload.user_id = f.user_id;
      else { payload.client_name = f.client_name; payload.client_email = f.client_email; payload.client_phone = f.client_phone; }
      await api.post('/admin/bookings', payload);
      setAddOpen(false); reload();
    } catch (e) {
      setAddError(e.message || 'Ошибка создания');
    } finally { setSavingAdd(false); }
  };

  // Смена статуса брони (Выдать/Завершить/Отменить) → PATCH + обновление строки
  const patchBooking = async (id, body) => {
    try {
      const updated = await api.patch(`/admin/bookings/${id}`, body);
      setRows((rs) => rs.map((b) => (String(b.id) === String(id) ? { ...b, ...updated } : b)));
    } catch (e) {
      alert(e.message || 'Не удалось изменить бронь');
    }
  };

  useEffect(() => {
    api.get('/admin/cars').then((d) => setCars(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
    api.get('/admin/users').then((d) => setUsers(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
  }, []);

  const openEdit = (b) => {
    setEditForm({
      id: b.id, total: b.total ?? 0, stage: b.stage || 'new', manager: b.manager || '',
      status: b.status, created_at: b.created_at, stage_changed_at: b.stage_changed_at,
      pickup_city: b.pickup_city || '', notes: b.notes || '',
      from_dt: isoToLocalInput(b.from_dt), to_dt: isoToLocalInput(b.to_dt),
      car: b.car, user: b.user,
      deposit_amount: b.deposit_amount ?? 0, deposit_returned: b.deposit_returned ?? 0, deposit_status: b.deposit_status || '',
    });
    setCharges([]);
    setMovements([]);
    setNewCharge({ type: '', amount: '', note: '', photo_url: '', from_deposit: true });
    setNewMovement({ kind: 'return', amount: '', note: '', due_date: '' });
    setEditOpen(true);
    // подтягиваем удержания + календарь + актуальные поля залога
    api.get(`/admin/bookings/${b.id}`).then((d) => {
      setCharges(d?.charges || []);
      setMovements(d?.movements || []);
      setEditForm((f) => f && String(f.id) === String(b.id) ? {
        ...f,
        deposit_amount: d.booking?.deposit_amount ?? f.deposit_amount,
        deposit_returned: d.booking?.deposit_returned ?? f.deposit_returned,
        deposit_status: d.booking?.deposit_status || f.deposit_status,
      } : f);
    }).catch(() => {});
  };

  const addMovement = async (preset) => {
    const src = preset || newMovement;
    const amt = parseInt(src.amount, 10);
    if (!amt) return;
    try {
      const m = await api.post(`/admin/bookings/${editForm.id}/movements`, {
        kind: src.kind, amount: amt, note: src.note || null, due_date: src.due_date || null,
      });
      setMovements((ms) => [...ms, m]);
      setNewMovement({ kind: 'return', amount: '', note: '', due_date: '' });
    } catch (e) { alert(e.message); }
  };
  const toggleMovement = async (m) => {
    try {
      const upd = await api.patch(`/admin/bookings/${editForm.id}/movements/${m.id}`, {
        status: m.status === 'done' ? 'planned' : 'done',
      });
      setMovements((ms) => ms.map((x) => (x.id === m.id ? upd : x)));
    } catch (e) { alert(e.message); }
  };
  const delMovement = async (mid) => {
    try { await api.del(`/admin/bookings/${editForm.id}/movements/${mid}`); setMovements((ms) => ms.filter((x) => x.id !== mid)); }
    catch (e) { alert(e.message); }
  };

  const addCharge = async () => {
    const amt = parseInt(newCharge.amount, 10);
    if (!amt) return;
    try {
      const c = await api.post(`/admin/bookings/${editForm.id}/charges`, {
        type: newCharge.type || null, amount: amt, note: newCharge.note || null,
        photo_url: newCharge.photo_url || null, from_deposit: newCharge.from_deposit,
      });
      setCharges((cs) => [c, ...cs]);
      setNewCharge({ type: '', amount: '', note: '', photo_url: '', from_deposit: true });
    } catch (e) { alert(e.message); }
  };
  const delCharge = async (cid) => {
    try { await api.del(`/admin/bookings/${editForm.id}/charges/${cid}`); setCharges((cs) => cs.filter((c) => c.id !== cid)); }
    catch (e) { alert(e.message); }
  };
  const uploadChargePhoto = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    // Фото с айфона 4–8 МБ ужимаем на клиенте, чтобы влезало и не раздувало БД.
    const url = await fileToCompressedDataUrl(file, { maxSize: 1600, quality: 0.8 });
    if (dataUrlBytes(url) > 8 * 1024 * 1024) { alert('Файл слишком большой даже после сжатия'); return; }
    setNewCharge((n) => ({ ...n, photo_url: url }));
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await patchBooking(editForm.id, {
        total: parseInt(editForm.total, 10) || 0,
        stage: editForm.stage,
        manager: editForm.manager || null,
        pickup_city: editForm.pickup_city || null,
        notes: editForm.notes || null,
        from_dt: localInputToIso(editForm.from_dt),
        to_dt: localInputToIso(editForm.to_dt),
        deposit_amount: parseInt(editForm.deposit_amount, 10) || 0,
        deposit_returned: parseInt(editForm.deposit_returned, 10) || 0,
        // deposit_status не шлём — бэкенд считает статус автоматически.
      });
      setEditOpen(false);
    } catch (e) {
      alert(e.message);
    } finally { setSavingEdit(false); }
  };

  useEffect(() => {
    let active = true;
    api
      .get('/admin/bookings')
      .then((data) => {
        if (!active) return;
        setRows(Array.isArray(data) ? data : data?.items || []);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message || 'Не удалось загрузить брони');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Клик-переход с дашборда: /bookings?open=<id> → сразу открываем шторку брони.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || !rows.length) return;
    const b = rows.find((r) => String(r.id) === String(openId));
    if (b) {
      openEdit(b);
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchParams]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (!q) return true;
      return [b.id, b.user?.name, b.user?.email, b.user?.phone, b.car?.name]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, searchQuery, statusFilter]);

  const columns = useMemo(
    () => [
      {
        id: 'id',
        accessorFn: (row) => Number(row.id) || 0, // число, а не строка — иначе 1,10,2,3…
        header: ({ column }) => <DataGridColumnHeader title="№" column={column} />,
        cell: ({ row }) => <span className="font-medium text-mono">#{row.original.id}</span>,
        enableSorting: true,
        size: 80,
      },
      {
        id: 'submitted',
        accessorFn: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
        header: ({ column }) => <DataGridColumnHeader title="Подана" column={column} />,
        cell: ({ row }) => (
          <span className="text-secondary-foreground font-normal whitespace-nowrap text-xs">
            {fmtDateTime(row.original.created_at)}
          </span>
        ),
        enableSorting: true,
        size: 140,
      },
      {
        id: 'customer',
        accessorFn: (row) => row.user?.name,
        header: ({ column }) => <DataGridColumnHeader title="Клиент" column={column} />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-mono font-medium">{row.original.user?.name || '—'}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.user?.phone || row.original.user?.email || ''}
            </span>
          </div>
        ),
        enableSorting: true,
        size: 200,
      },
      {
        id: 'car',
        accessorFn: (row) => row.car?.name,
        header: ({ column }) => <DataGridColumnHeader title="Автомобиль" column={column} />,
        cell: ({ row }) => (
          <span className="text-foreground font-normal">{row.original.car?.name || row.original.car_id}</span>
        ),
        enableSorting: true,
        size: 200,
      },
      {
        id: 'period',
        accessorFn: (row) => row.from_dt,
        header: ({ column }) => <DataGridColumnHeader title="Период" column={column} />,
        cell: ({ row }) => (
          <span className="text-secondary-foreground font-normal whitespace-nowrap">
            {fmtDate(row.original.from_dt)} — {fmtDate(row.original.to_dt)}
          </span>
        ),
        enableSorting: true,
        size: 200,
      },
      {
        id: 'total',
        accessorFn: (row) => row.total,
        header: ({ column }) => <DataGridColumnHeader title="Сумма" column={column} />,
        cell: ({ row }) => <span className="font-medium text-mono">{fmtMoney(row.original.total)}</span>,
        enableSorting: true,
        size: 130,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader title="Статус" column={column} />,
        cell: ({ row }) => {
          const b = row.original;
          const s = STATUS_MAP[b.status] || { label: b.status, variant: 'secondary' };
          // Таймер: сколько бронь висит на текущем этапе (для контроля менеджеров).
          const active = b.status !== 'completed' && b.status !== 'cancelled';
          const elapsed = active ? fmtElapsed(b.stage_changed_at || b.created_at) : '';
          const label = b.status === 'pending' ? 'ждёт' : 'на этапе';
          return (
            <div className="flex flex-col items-start gap-0.5">
              <Badge size="sm" variant={s.variant} appearance="light">
                {s.label}
              </Badge>
              {elapsed && (
                <span className={`text-[11px] whitespace-nowrap ${b.status === 'pending' ? 'text-warning' : 'text-muted-foreground'}`}>
                  {label} {elapsed}
                </span>
              )}
            </div>
          );
        },
        enableSorting: true,
        size: 130,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex items-center gap-1.5 justify-end">
              <Button size="sm" mode="icon" variant="outline" onClick={() => openEdit(b)}><PencilSimple className="size-4" /></Button>
              {b.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => patchBooking(b.id, { status: 'active' })}>Выдать</Button>
              )}
              {b.status === 'active' && (
                <Button size="sm" variant="outline" onClick={() => patchBooking(b.id, { status: 'completed' })}>Завершить</Button>
              )}
              {(b.status === 'pending' || b.status === 'active') && (
                <Button size="sm" variant="ghost" onClick={() => { if (confirm('Отменить бронь?')) patchBooking(b.id, { status: 'cancelled' }); }}>Отменить</Button>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 240,
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row) => String(row.id),
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Расчёт залога для шторки. «Из залога» удержания (штрафы) уменьшают остаток
  // к возврату клиенту; «отдельно» — выставляются сверх залога и его не трогают.
  const depAmount = parseInt(editForm?.deposit_amount, 10) || 0;
  const depReturned = parseInt(editForm?.deposit_returned, 10) || 0;
  const heldFromDeposit = charges.reduce((s, c) => s + (c.from_deposit === false ? 0 : (c.amount || 0)), 0);
  const heldSeparate = charges.reduce((s, c) => s + (c.from_deposit === false ? (c.amount || 0) : 0), 0);
  const toReturnClient = Math.max(0, depAmount - depReturned - heldFromDeposit);
  // Авто-статус залога от чисел (менеджеру не нужно выставлять руками).
  const depSettled = depReturned + heldFromDeposit;
  const depStatusAuto = depAmount <= 0 ? null : depSettled >= depAmount ? 'returned' : depSettled > 0 ? 'partial' : 'held';
  const depStatusLabel = { returned: 'Возвращён', partial: 'Возврат частично', held: 'Удерживается' }[depStatusAuto] || '—';
  const depStatusVariant = depStatusAuto === 'returned' ? 'success' : depStatusAuto === 'partial' ? 'warning' : 'outline';

  return (
    <DataGrid
      table={table}
      recordCount={filteredData?.length || 0}
      isLoading={loading}
      tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: false, cellBorder: true }}
    >
      <Card className="min-w-full">
        <CardHeader className="py-5 flex-wrap gap-2">
          <CardHeading>
            <CardTitle>Брони {!loading && `(${rows.length})`}</CardTitle>
          </CardHeading>
          <CardToolbar>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают</option>
              <option value="active">В аренде</option>
              <option value="completed">Завершённые</option>
              <option value="cancelled">Отменённые</option>
            </select>
            <Button onClick={openAdd}>Добавить бронь</Button>
            <div className="relative">
              <MagnifyingGlass className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Поиск: клиент, телефон, авто"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 w-64"
              />
              {searchQuery.length > 0 && (
                <Button
                  mode="icon"
                  variant="ghost"
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X />
                </Button>
              )}
            </div>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <ScrollArea>
            {error ? (
              <div className="p-6 text-destructive text-sm">{error}</div>
            ) : (
              <DataGridTable />
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Бронь #{editForm?.id}</DialogTitle></DialogHeader>
          {editForm && (
            <DialogBody className="flex flex-col gap-4 overflow-y-auto">
              <div className="text-sm text-secondary-foreground">
                {editForm.car?.name} · {editForm.user?.name}
              </div>
              {editForm.created_at && (
                <div className="text-xs text-muted-foreground -mt-2">
                  Заявка подана: {fmtDateTime(editForm.created_at)}
                  {editForm.status !== 'completed' && editForm.status !== 'cancelled'
                    && fmtElapsed(editForm.stage_changed_at || editForm.created_at)
                    ? <span className={editForm.status === 'pending' ? 'text-warning' : ''}>
                        {' · '}{editForm.status === 'pending' ? 'ожидает' : 'на этапе'} {fmtElapsed(editForm.stage_changed_at || editForm.created_at)}
                      </span>
                    : null}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={fieldLabel}>Сумма, ₽</div>
                  <Input type="number" value={editForm.total} onChange={(e) => setEditForm({ ...editForm, total: e.target.value })} />
                </div>
                <div>
                  <div className={fieldLabel}>Этап воронки</div>
                  <select className={selectCls} value={editForm.stage} onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}>
                    {STAGES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <div className="text-xs text-muted-foreground mt-1">
                    Даты занимаются в календаре с этапа «Бронирование оплачено». До оплаты авто остаётся в общем доступе.
                  </div>
                </div>
                <div>
                  <div className={fieldLabel}>Начало аренды</div>
                  <Input type="datetime-local" value={editForm.from_dt} onChange={(e) => setEditForm({ ...editForm, from_dt: e.target.value })} />
                </div>
                <div>
                  <div className={fieldLabel}>Конец аренды</div>
                  <Input type="datetime-local" value={editForm.to_dt} onChange={(e) => setEditForm({ ...editForm, to_dt: e.target.value })} />
                </div>
                <div>
                  <div className={fieldLabel}>Менеджер</div>
                  <Input value={editForm.manager} onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })} />
                </div>
                <div>
                  <div className={fieldLabel}>Адрес подачи</div>
                  <Input value={editForm.pickup_city} onChange={(e) => setEditForm({ ...editForm, pickup_city: e.target.value })} />
                </div>
              </div>
              <div>
                <div className={fieldLabel}>Примечание</div>
                <textarea className={`${selectCls} min-h-[60px] py-2 resize-y`} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>

              {/* Блок 1: Залог и расчёт */}
              <div className="rounded-lg bg-zinc-800/40 p-4 flex flex-col gap-3">
                <div className="text-sm font-medium text-mono">Залог и расчёт</div>
                <div className="grid grid-cols-3 gap-3">
                  <div><div className={fieldLabel}>Залог, ₽</div><Input type="number" value={editForm.deposit_amount} onChange={(e) => setEditForm({ ...editForm, deposit_amount: e.target.value })} /></div>
                  <div><div className={fieldLabel}>Возвращено, ₽</div><Input type="number" value={editForm.deposit_returned} onChange={(e) => setEditForm({ ...editForm, deposit_returned: e.target.value })} /></div>
                  <div>
                    <div className={fieldLabel}>Статус залога</div>
                    <div className="h-9 flex items-center">
                      <Badge size="sm" variant={depStatusVariant} appearance="light">{depStatusLabel}</Badge>
                    </div>
                  </div>
                </div>
                {depAmount > 0 && (
                  <div className="rounded-md bg-zinc-900/40 px-3 py-2 text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">К возврату клиенту</span>
                    <span className="font-semibold text-mono">
                      {toReturnClient.toLocaleString('ru-RU')} ₽
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        = {depAmount.toLocaleString('ru-RU')} − возвращено {depReturned.toLocaleString('ru-RU')}
                        {heldFromDeposit > 0 ? ` − удержано ${heldFromDeposit.toLocaleString('ru-RU')}` : ''}
                      </span>
                    </span>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={!depAmount}
                  onClick={() => setEditForm({
                    ...editForm,
                    deposit_returned: depAmount - heldFromDeposit,
                  })}
                >
                  Вернуть остаток ({toReturnClient.toLocaleString('ru-RU')} ₽)
                </Button>

                {/* Удержания */}
                <div className="text-xs text-muted-foreground uppercase mt-1">Удержания / штрафы</div>
                {charges.length > 0 && (
                  <div className="divide-y divide-border border-y border-border">
                    {charges.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {c.photo_url && <img src={c.photo_url} alt="" className="h-8 w-10 rounded object-cover" />}
                          <div className="min-w-0">
                            <div className="text-sm truncate">{c.type || 'Удержание'}{c.note ? ` — ${c.note}` : ''}</div>
                            <Badge size="sm" variant={c.from_deposit === false ? 'secondary' : 'primary'} appearance="light">
                              {c.from_deposit === false ? 'отдельно' : 'из залога'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-destructive">−{Number(c.amount).toLocaleString('ru-RU')} ₽</span>
                          <Button size="sm" mode="icon" variant="ghost" onClick={() => delCharge(c.id)}><X className="size-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col gap-1 py-2 text-sm">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Удержано из залога</span>
                        <span className="text-destructive">−{heldFromDeposit.toLocaleString('ru-RU')} ₽</span>
                      </div>
                      {heldSeparate > 0 && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Выставлено отдельно (не из залога)</span>
                          <span>−{heldSeparate.toLocaleString('ru-RU')} ₽</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Тип (мойка, царапина…)" value={newCharge.type} onChange={(e) => setNewCharge({ ...newCharge, type: e.target.value })} />
                  <Input type="number" placeholder="Сумма, ₽" value={newCharge.amount} onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })} />
                  <Input placeholder="Пояснение" value={newCharge.note} onChange={(e) => setNewCharge({ ...newCharge, note: e.target.value })} className="col-span-2" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newCharge.from_deposit}
                    onChange={(e) => setNewCharge({ ...newCharge, from_deposit: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  Удержать из залога (уменьшит сумму к возврату клиенту)
                </label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={uploadChargePhoto} />
                    <span className="inline-flex items-center h-9 px-3 rounded-md border border-input text-sm">Фото</span>
                  </label>
                  {newCharge.photo_url && <img src={newCharge.photo_url} alt="" className="h-9 w-12 rounded object-cover" />}
                  <Button size="sm" onClick={addCharge} disabled={!newCharge.amount}>Добавить удержание</Button>
                </div>
              </div>

              {/* Блок 1: Внутренний календарь возвратов/удержаний залога */}
              <div className="rounded-lg bg-zinc-800/40 p-4 flex flex-col gap-3">
                <div className="text-sm font-medium text-mono">Календарь возвратов залога</div>
                {movements.length > 0 ? (
                  <div className="divide-y divide-border border-y border-border">
                    {movements.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input type="checkbox" checked={m.status === 'done'} onChange={() => toggleMovement(m)} className="size-4 accent-primary" />
                          <div className="min-w-0">
                            <div className={`text-sm truncate ${m.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                              {m.kind === 'return' ? 'Возврат клиенту' : 'Удержание'}{m.note ? ` — ${m.note}` : ''}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {m.due_date ? `к ${new Date(m.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })}` : 'без срока'}
                              {m.status === 'done' ? ' · выполнено' : ' · запланировано'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${m.kind === 'return' ? 'text-green-500' : 'text-destructive'}`}>
                            {m.kind === 'return' ? '+' : '−'}{Number(m.amount).toLocaleString('ru-RU')} ₽
                          </span>
                          <Button size="sm" mode="icon" variant="ghost" onClick={() => delMovement(m.id)}><X className="size-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Плановых движений нет.</div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <select className={selectCls} value={newMovement.kind} onChange={(e) => setNewMovement({ ...newMovement, kind: e.target.value })}>
                    <option value="return">Возврат клиенту</option>
                    <option value="hold">Удержание</option>
                  </select>
                  <Input type="number" placeholder="Сумма, ₽" value={newMovement.amount} onChange={(e) => setNewMovement({ ...newMovement, amount: e.target.value })} />
                  <Input type="date" value={newMovement.due_date} onChange={(e) => setNewMovement({ ...newMovement, due_date: e.target.value })} />
                  <Input placeholder="Пояснение" value={newMovement.note} onChange={(e) => setNewMovement({ ...newMovement, note: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" onClick={() => addMovement()} disabled={!newMovement.amount}>Добавить в календарь</Button>
                  <Button size="sm" variant="outline" onClick={() => addMovement({ kind: 'return', amount: toReturnClient, note: 'Возврат остатка залога клиенту', due_date: '' })} disabled={!toReturnClient}>
                    + возврат остатка ({toReturnClient.toLocaleString('ru-RU')} ₽)
                  </Button>
                </div>
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'Сохранение…' : 'Сохранить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Новая бронь (вручную)</DialogTitle></DialogHeader>
          {addForm && (
            <DialogBody className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div>
                <div className={fieldLabel}>Автомобиль</div>
                <select className={selectCls} value={addForm.car_id} onChange={(e) => setAddForm({ ...addForm, car_id: e.target.value })}>
                  {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className={fieldLabel}>Клиент</div>
                <div className="flex gap-2 mb-2">
                  <Button size="sm" variant={addForm.clientMode === 'existing' ? 'primary' : 'outline'} onClick={() => setAddForm({ ...addForm, clientMode: 'existing' })}>Существующий</Button>
                  <Button size="sm" variant={addForm.clientMode === 'new' ? 'primary' : 'outline'} onClick={() => setAddForm({ ...addForm, clientMode: 'new' })}>Новый</Button>
                </div>
                {addForm.clientMode === 'existing' ? (
                  <select className={selectCls} value={addForm.user_id} onChange={(e) => setAddForm({ ...addForm, user_id: e.target.value })}>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.phone || u.email}</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    <Input placeholder="ФИО" value={addForm.client_name} onChange={(e) => setAddForm({ ...addForm, client_name: e.target.value })} />
                    <Input placeholder="Email" value={addForm.client_email} onChange={(e) => setAddForm({ ...addForm, client_email: e.target.value })} />
                    <Input placeholder="Телефон" value={addForm.client_phone} onChange={(e) => setAddForm({ ...addForm, client_phone: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><div className={fieldLabel}>Начало</div><Input type="datetime-local" value={addForm.from_dt} onChange={(e) => setAddForm({ ...addForm, from_dt: e.target.value })} /></div>
                <div><div className={fieldLabel}>Конец</div><Input type="datetime-local" value={addForm.to_dt} onChange={(e) => setAddForm({ ...addForm, to_dt: e.target.value })} /></div>
                <div><div className={fieldLabel}>Сумма, ₽</div><Input type="number" value={addForm.total} onChange={(e) => setAddForm({ ...addForm, total: e.target.value })} /></div>
                <div>
                  <div className={fieldLabel}>Этап</div>
                  <select className={selectCls} value={addForm.stage} onChange={(e) => setAddForm({ ...addForm, stage: e.target.value })}>
                    {STAGES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><div className={fieldLabel}>Менеджер</div><Input value={addForm.manager} onChange={(e) => setAddForm({ ...addForm, manager: e.target.value })} /></div>
                <div><div className={fieldLabel}>Адрес подачи</div><Input value={addForm.pickup_city} onChange={(e) => setAddForm({ ...addForm, pickup_city: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={addForm.with_delivery} onChange={(e) => setAddForm({ ...addForm, with_delivery: e.target.checked })} />
                Нужна доставка
              </label>
              <div><div className={fieldLabel}>Примечание</div><textarea className={`${selectCls} min-h-[60px] py-2 resize-y`} value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} /></div>
              {addError && <div className="text-sm text-destructive">{addError}</div>}
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={createBooking} disabled={savingAdd}>{savingAdd ? 'Создание…' : 'Создать бронь'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataGrid>
  );
}
