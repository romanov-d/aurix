'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable,
} from '@tanstack/react-table';
import { MagnifyingGlass, X, Plus, PencilSimple, Trash, UploadSimple } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/aurix-api';
import {
  Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading, ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { Card, CardFooter, CardHeader, CardHeading, CardTable, CardTitle, CardToolbar } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CAR_STATUS = {
  published: { label: 'Опубликована', variant: 'success' },
  hidden: { label: 'Скрыта', variant: 'secondary' },
  pending: { label: 'На модерации', variant: 'warning' },
  rejected: { label: 'Отклонена', variant: 'destructive' },
};

const FIELDS = [
  ['name', 'Название'], ['brand', 'Бренд'], ['year', 'Год', 'number'], ['body', 'Тип кузова'],
  ['fuel', 'Топливо'], ['engine', 'Двигатель'], ['power_hp', 'Мощность л.с.', 'number'], ['drive', 'Коробка/привод'],
  ['color', 'Цвет'], ['price_per_day', 'Цена 1–5 суток', 'number'], ['deposit', 'Залог', 'number'],
  ['price_6_12', 'Цена 6–12 суток', 'number'], ['price_30', 'Цена от 30 суток', 'number'],
  ['mileage_limit', 'Лимит пробега/сут', 'number'], ['overmileage_rate', 'Перекат ₽/км', 'number'],
  ['photo_rate', 'Фотосессия ₽/ч', 'number'], ['badge', 'Плашка'], ['image_url', 'Основное фото (URL)'],
];

const fieldLabel = 'text-xs text-muted-foreground mb-1.5';
const empty = {
  id: '', name: '', brand: '', year: 2024, body: '', fuel: '', engine: '', power_hp: '', drive: '', color: '',
  price_per_day: '', deposit: '', price_6_12: '', price_30: '', mileage_limit: 250, overmileage_rate: 200,
  photo_rate: 0, badge: '', image_url: '', description: '', closed_until: '',
};

const fmtMoney = (n) => (n || n === 0 ? Number(n).toLocaleString('ru-RU') : '—') + ' ₽';

export function CarsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  const load = () => {
    api.get('/admin/cars')
      .then((d) => { setRows(Array.isArray(d) ? d : d?.items || []); setLoading(false); })
      .catch((e) => { setError(e.message || 'Не удалось загрузить машины'); setLoading(false); });
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => [c.id, c.name, c.brand].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, searchQuery]);

  const setStatus = async (car, status) => {
    try {
      const updated = await api.patch(`/admin/cars/${car.id}`, { status });
      setRows((cs) => cs.map((c) => (c.id === car.id ? { ...c, ...updated } : c)));
    } catch (e) { alert(e.message); }
  };

  const del = async (car) => {
    if (!confirm(`Удалить «${car.name}»? Действие необратимо.`)) return;
    try { await api.del(`/admin/cars/${car.id}`); setRows((cs) => cs.filter((c) => c.id !== car.id)); }
    catch (e) { alert(e.message); }
  };

  const openAdd = () => { setForm(empty); setEditing(false); setPhotos([]); setFormError(''); setOpen(true); };
  const openEdit = async (car) => {
    setEditing(true); setFormError('');
    setForm({ ...empty, ...car, closed_until: car.closed_until ? String(car.closed_until).slice(0, 10) : '' });
    setOpen(true);
    try { setPhotos(await api.get(`/admin/cars/${car.id}/photos`)); } catch { setPhotos([]); }
  };

  const save = async () => {
    setFormError(''); setSaving(true);
    try {
      const payload = {};
      for (const [k] of FIELDS) {
        let v = form[k];
        if (['year', 'power_hp', 'price_per_day', 'deposit', 'price_6_12', 'price_30', 'mileage_limit', 'overmileage_rate', 'photo_rate'].includes(k)) {
          v = v === '' || v === null ? null : parseInt(v, 10);
        }
        payload[k] = v === '' ? null : v;
      }
      payload.description = form.description || null;
      payload.closed_until = form.closed_until || null;
      if (editing) {
        const upd = await api.patch(`/admin/cars/${form.id}`, payload);
        setRows((cs) => cs.map((c) => (c.id === form.id ? { ...c, ...upd } : c)));
      } else {
        payload.id = form.id;
        await api.post('/admin/cars', payload);
        load();
      }
      setOpen(false);
    } catch (e) {
      setFormError(e.message || 'Ошибка сохранения');
    } finally { setSaving(false); }
  };

  const addPhotoUrl = async () => {
    if (!newPhotoUrl.trim()) return;
    try { const p = await api.post(`/admin/cars/${form.id}/photos`, { url: newPhotoUrl.trim() }); setPhotos((ps) => [...ps, p]); setNewPhotoUrl(''); }
    catch (e) { alert(e.message); }
  };
  const uploadPhotos = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) { alert(`«${file.name}» больше 2 МБ`); continue; }
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onloadend = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      try { const p = await api.post(`/admin/cars/${form.id}/photos`, { url: dataUrl }); setPhotos((ps) => [...ps, p]); } catch (err) { alert(err.message); }
    }
  };
  const delPhoto = async (pid) => {
    try { await api.del(`/admin/cars/${form.id}/photos/${pid}`); setPhotos((ps) => ps.filter((p) => p.id !== pid)); }
    catch (e) { alert(e.message); }
  };

  const columns = useMemo(() => [
    {
      id: 'car', accessorFn: (r) => r.name,
      header: ({ column }) => <DataGridColumnHeader title="Автомобиль" column={column} />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.image_url
            ? <img src={row.original.image_url} alt="" className="h-10 w-14 rounded object-cover" />
            : <div className="h-10 w-14 rounded bg-muted" />}
          <div className="flex flex-col">
            <Link to={`/fleet/${row.original.id}`} className="font-medium text-mono hover:text-primary">{row.original.name}</Link>
            <span className="text-xs text-muted-foreground">{row.original.id}</span>
          </div>
        </div>
      ), size: 280,
    },
    {
      id: 'badge', accessorFn: (r) => r.badge,
      header: ({ column }) => <DataGridColumnHeader title="Плашка" column={column} />,
      cell: ({ row }) => row.original.badge
        ? <span className="text-primary text-sm">{row.original.badge}</span>
        : <span className="text-muted-foreground">—</span>, size: 150,
    },
    {
      id: 'price', accessorFn: (r) => r.price_per_day,
      header: ({ column }) => <DataGridColumnHeader title="Цена/сут" column={column} />,
      cell: ({ row }) => <span className="text-mono">{fmtMoney(row.original.price_per_day)}</span>, size: 120,
    },
    {
      id: 'status', accessorFn: (r) => r.status,
      header: ({ column }) => <DataGridColumnHeader title="Статус" column={column} />,
      cell: ({ row }) => {
        const s = CAR_STATUS[row.original.status] || { label: row.original.status, variant: 'secondary' };
        return <Badge size="sm" variant={s.variant} appearance="light">{s.label}</Badge>;
      }, size: 140,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Button size="sm" mode="icon" variant="outline" onClick={() => openEdit(c)}><PencilSimple className="size-4" /></Button>
            {c.status === 'published' && <Button size="sm" variant="ghost" onClick={() => setStatus(c, 'hidden')}>Скрыть</Button>}
            {c.status === 'hidden' && <Button size="sm" variant="outline" onClick={() => setStatus(c, 'published')}>Опубл.</Button>}
            <Button size="sm" mode="icon" variant="outline" onClick={() => del(c)}><Trash className="size-4 text-destructive" /></Button>
          </div>
        );
      }, size: 220,
    },
  ], []);

  const table = useReactTable({
    columns, data: filtered, pageCount: Math.ceil((filtered?.length || 0) / pagination.pageSize),
    getRowId: (r) => String(r.id), state: { pagination, sorting },
    onPaginationChange: setPagination, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Автопарк" />
            <ToolbarDescription>Управление автомобилями AURIX</ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions><Button onClick={openAdd}><Plus /> Добавить авто</Button></ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <DataGrid table={table} recordCount={filtered?.length || 0} isLoading={loading}
          tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: false, cellBorder: true }}>
          <Card className="min-w-full">
            <CardHeader className="py-5 flex-wrap gap-2">
              <CardHeading><CardTitle>Автомобили {!loading && `(${rows.length})`}</CardTitle></CardHeading>
              <CardToolbar>
                <div className="relative">
                  <MagnifyingGlass className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                  <Input placeholder="Поиск: название, бренд, id" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9 w-64" />
                  {searchQuery && <Button mode="icon" variant="ghost" className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}><X /></Button>}
                </div>
              </CardToolbar>
            </CardHeader>
            <CardTable>
              <ScrollArea>
                {error ? <div className="p-6 text-destructive text-sm">{error}</div> : <DataGridTable />}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
            <CardFooter><DataGridPagination /></CardFooter>
          </Card>
        </DataGrid>
      </Container>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing ? `Редактировать: ${form.name}` : 'Новый автомобиль'}</DialogTitle></DialogHeader>
          <DialogBody className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            {!editing && (
              <div>
                <div className={fieldLabel}>ID (латиница, цифры, дефис)</div>
                <Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FIELDS.map(([k, label, type]) => (
                <div key={k}>
                  <div className={fieldLabel}>{label}</div>
                  <Input type={type || 'text'} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              <div>
                <div className={fieldLabel}>Занята до даты</div>
                <Input type="date" value={form.closed_until || ''} onChange={(e) => setForm({ ...form, closed_until: e.target.value })} />
              </div>
            </div>
            <div>
              <div className={fieldLabel}>Описание</div>
              <textarea className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {editing && (
              <div>
                <div className={fieldLabel}>Фотографии</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative h-16 w-24 rounded overflow-hidden bg-muted">
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => delPhoto(p.id)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full size-5 flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input placeholder="URL или /cars/..." value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} className="w-64" />
                  <Button size="sm" variant="outline" onClick={addPhotoUrl}>По ссылке</Button>
                  <label className="inline-flex">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} />
                    <span className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-input text-sm cursor-pointer"><UploadSimple className="size-4" /> Загрузить файлы</span>
                  </label>
                </div>
              </div>
            )}
            {formError && <div className="text-sm text-destructive">{formError}</div>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving || !form.name || (!editing && !form.id)}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}
