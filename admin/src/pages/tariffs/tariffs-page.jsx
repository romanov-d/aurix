'use client';

import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/aurix-api';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardTable } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Поля тарифа (nullable — price_6_12/price_30 можно очистить)
const FIELDS = [
  { key: 'price_per_day', label: '1–5 дн' },
  { key: 'price_6_12', label: '6–12 дн', nullable: true },
  { key: 'price_30', label: 'от 30 дн', nullable: true },
  { key: 'deposit', label: 'Залог' },
  { key: 'mileage_limit', label: 'Пробег/сут' },
  { key: 'overmileage_rate', label: 'Перекат ₽/км' },
  { key: 'photo_rate', label: 'Фото ₽/ч' },
];

const cellInput =
  'h-8 w-24 rounded-md border border-input bg-transparent px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

export function TariffsPage() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/cars')
      .then((data) => setCars(Array.isArray(data) ? data : data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Сохранить одно поле цены по машине (не шлём, если не изменилось)
  const saveField = async (car, key, raw, nullable) => {
    const val = raw === '' ? (nullable ? null : 0) : parseInt(raw, 10);
    if ((car[key] ?? null) === (val ?? null)) return;
    try {
      const updated = await api.patch(`/admin/cars/${car.id}`, { [key]: val });
      setCars((cs) => cs.map((c) => (c.id === car.id ? { ...c, ...updated } : c)));
    } catch (e) {
      alert(e.message || 'Ошибка сохранения');
    }
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Тарифы" />
            <ToolbarDescription>Цены по автомобилям — правьте прямо в таблице (сохраняется по уходу с поля)</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>
      <Container>
        <Card>
          <CardHeader><CardHeading><CardTitle>Единый тариф {!loading && `(${cars.length})`}</CardTitle></CardHeading></CardHeader>
          <CardTable>
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Автомобиль</TableHead>
                    {FIELDS.map((f) => <TableHead key={f.key} className="text-right">{f.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={FIELDS.length + 1} className="p-0">
                        <div className="flex flex-col gap-3 p-4">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="size-9 rounded-md shrink-0" />
                              <div className="flex flex-col gap-2 grow">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3 w-1/3" />
                              </div>
                              <Skeleton className="h-8 w-16 rounded-md shrink-0" />
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : cars.map((car) => (
                    <TableRow key={car.id}>
                      <TableCell className="font-medium text-mono">{car.name}</TableCell>
                      {FIELDS.map((f) => (
                        <TableCell key={f.key} className="text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            className={cellInput}
                            defaultValue={car[f.key] ?? ''}
                            onBlur={(e) => saveField(car, f.key, e.target.value.replace(/\D/g, ''), f.nullable)}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
        </Card>
      </Container>
    </Fragment>
  );
}
