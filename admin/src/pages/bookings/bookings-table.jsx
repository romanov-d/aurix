'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search, X, Pencil } from 'lucide-react';
import { api } from '@/lib/aurix-api';
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

// Этапы воронки (как в старой админке)
const STAGES = [
  ['new', 'Новая заявка'], ['docs', 'Проверка документов'], ['prepay', 'Оплата бронирования'],
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
const selectCls = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

export function BookingsTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: 'id', desc: true }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

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
      pickup_city: b.pickup_city || '', notes: b.notes || '',
      from_dt: isoToLocalInput(b.from_dt), to_dt: isoToLocalInput(b.to_dt),
      car: b.car, user: b.user,
    });
    setEditOpen(true);
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
        accessorFn: (row) => row.id,
        header: ({ column }) => <DataGridColumnHeader title="№" column={column} />,
        cell: ({ row }) => <span className="font-medium text-mono">#{row.original.id}</span>,
        enableSorting: true,
        size: 80,
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
          const s = STATUS_MAP[row.original.status] || { label: row.original.status, variant: 'secondary' };
          return (
            <Badge size="sm" variant={s.variant} appearance="light">
              {s.label}
            </Badge>
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
              <Button size="sm" mode="icon" variant="outline" onClick={() => openEdit(b)}><Pencil className="size-4" /></Button>
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
              <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Бронь #{editForm?.id}</DialogTitle></DialogHeader>
          {editForm && (
            <DialogBody className="flex flex-col gap-4">
              <div className="text-sm text-secondary-foreground">
                {editForm.car?.name} · {editForm.user?.name}
              </div>
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
