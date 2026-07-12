'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search, X, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/aurix-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const emptyClient = { name: '', phone: '', email: '', password: '', role: 'user', is_verified: false, manager: '', admin_note: '' };
const fieldLabel = 'text-xs text-muted-foreground mb-1.5';
const selectCls = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

const ROLE_MAP = {
  admin: { label: 'Админ', variant: 'primary' },
  partner: { label: 'Партнёр', variant: 'info' },
  user: { label: 'Клиент', variant: 'secondary' },
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' });
};

export function ClientsTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: 'created', desc: true }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyClient);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    api
      .get('/admin/users')
      .then((data) => { setRows(Array.isArray(data) ? data : data?.items || []); setLoading(false); })
      .catch((e) => { setError(e.message || 'Не удалось загрузить клиентов'); setLoading(false); });
  };
  useEffect(load, []);

  // Верификация клиента прямо в списке
  const verifyUser = async (id, is_verified) => {
    try {
      const updated = await api.patch(`/admin/users/${id}`, { is_verified });
      setRows((rs) => rs.map((u) => (String(u.id) === String(id) ? { ...u, is_verified: updated.is_verified ?? is_verified } : u)));
    } catch (e) { alert(e.message || 'Ошибка'); }
  };

  const createClient = async () => {
    setFormError(''); setSaving(true);
    try {
      const payload = {
        name: form.name, phone: form.phone, email: form.email,
        role: form.role, is_verified: form.is_verified,
        manager: form.manager || null, admin_note: form.admin_note || null,
      };
      if (form.password) payload.password = form.password;
      await api.post('/admin/users', payload);
      setAddOpen(false); setForm(emptyClient); load();
    } catch (e) {
      setFormError(e.message || 'Ошибка создания');
    } finally { setSaving(false); }
  };

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) =>
      [u.name, u.email, u.phone].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }, [rows, searchQuery]);

  const columns = useMemo(
    () => [
      {
        id: 'client',
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader title="Клиент" column={column} />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-mono font-medium">{row.original.name || '—'}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        ),
        enableSorting: true,
        size: 240,
      },
      {
        id: 'phone',
        accessorFn: (row) => row.phone,
        header: ({ column }) => <DataGridColumnHeader title="Телефон" column={column} />,
        cell: ({ row }) => (
          <span className="text-secondary-foreground font-normal">{row.original.phone || '—'}</span>
        ),
        enableSorting: true,
        size: 160,
      },
      {
        id: 'status',
        accessorFn: (row) => row.is_verified,
        header: ({ column }) => <DataGridColumnHeader title="Верификация" column={column} />,
        cell: ({ row }) =>
          row.original.is_verified ? (
            <Badge size="sm" variant="success" appearance="light">Проверен</Badge>
          ) : (
            <Badge size="sm" variant="secondary" appearance="light">Не проверен</Badge>
          ),
        enableSorting: true,
        size: 140,
      },
      {
        id: 'role',
        accessorFn: (row) => row.role,
        header: ({ column }) => <DataGridColumnHeader title="Роль" column={column} />,
        cell: ({ row }) => {
          const r = ROLE_MAP[row.original.role] || { label: row.original.role, variant: 'secondary' };
          return <Badge size="sm" variant={r.variant} appearance="light">{r.label}</Badge>;
        },
        enableSorting: true,
        size: 110,
      },
      {
        id: 'manager',
        accessorFn: (row) => row.manager,
        header: ({ column }) => <DataGridColumnHeader title="Менеджер" column={column} />,
        cell: ({ row }) => (
          <span className="text-secondary-foreground font-normal">{row.original.manager || '—'}</span>
        ),
        enableSorting: true,
        size: 140,
      },
      {
        id: 'created',
        accessorFn: (row) => row.created_at,
        header: ({ column }) => <DataGridColumnHeader title="Регистрация" column={column} />,
        cell: ({ row }) => (
          <span className="text-secondary-foreground font-normal whitespace-nowrap">
            {fmtDate(row.original.created_at)}
          </span>
        ),
        enableSorting: true,
        size: 130,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-1.5 justify-end">
              {u.is_verified
                ? <Button size="sm" variant="ghost" onClick={() => verifyUser(u.id, false)}>Снять</Button>
                : <Button size="sm" variant="outline" onClick={() => verifyUser(u.id, true)}>Верифицировать</Button>}
              <Button size="sm" variant="outline" asChild>
                <Link to={`/clients/${u.id}`}>Карточка</Link>
              </Button>
            </div>
          );
        },
        enableSorting: false,
        size: 220,
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
            <CardTitle>Клиенты {!loading && `(${rows.length})`}</CardTitle>
          </CardHeading>
          <CardToolbar>
            <div className="relative">
              <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Поиск: ФИО, телефон, почта"
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
            <Button onClick={() => { setForm(emptyClient); setFormError(''); setAddOpen(true); }}>
              <Plus /> Новый клиент
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <ScrollArea>
            {error ? <div className="p-6 text-destructive text-sm">{error}</div> : <DataGridTable />}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Новый клиент</DialogTitle></DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><div className={fieldLabel}>ФИО</div><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><div className={fieldLabel}>Телефон</div><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><div className={fieldLabel}>Email</div><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><div className={fieldLabel}>Пароль (необязательно)</div><Input placeholder="сгенерируется" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div>
                <div className={fieldLabel}>Роль</div>
                <select className={selectCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="user">Клиент</option>
                  <option value="partner">Партнёр</option>
                  <option value="admin">Админ</option>
                </select>
              </div>
              <div><div className={fieldLabel}>Менеджер</div><Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></div>
            </div>
            <div><div className={fieldLabel}>Примечание</div><Input value={form.admin_note} onChange={(e) => setForm({ ...form, admin_note: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_verified} onCheckedChange={(v) => setForm({ ...form, is_verified: v })} />
              <span className="text-sm">Сразу верифицирован</span>
            </div>
            {formError && <div className="text-sm text-destructive">{formError}</div>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={createClient} disabled={saving || !form.name || !form.email || !form.phone}>
              {saving ? 'Создание…' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataGrid>
  );
}
