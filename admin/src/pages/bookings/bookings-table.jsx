'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search, X } from 'lucide-react';
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

export function BookingsTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: 'id', desc: true }]);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!q) return rows;
    return rows.filter((b) =>
      [b.id, b.user?.name, b.user?.email, b.user?.phone, b.car?.name]
        .some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }, [rows, searchQuery]);

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
        cell: () => (
          <Button mode="link" underlined="dashed">
            Открыть
          </Button>
        ),
        enableSorting: false,
        size: 90,
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
    </DataGrid>
  );
}
