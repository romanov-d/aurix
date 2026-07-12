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

  useEffect(() => {
    let active = true;
    api
      .get('/admin/users')
      .then((data) => {
        if (!active) return;
        setRows(Array.isArray(data) ? data : data?.items || []);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message || 'Не удалось загрузить клиентов');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
        cell: () => (
          <Button mode="link" underlined="dashed">Открыть</Button>
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
    </DataGrid>
  );
}
