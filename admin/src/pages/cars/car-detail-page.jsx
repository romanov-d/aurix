'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/aurix-api';
import { Statistics } from '@/pages/public-profile/profiles/company/components/statistics';
import {
  Toolbar, ToolbarActions, ToolbarHeading, ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { HeroDetailSkeleton } from '@/components/common/aurix-skeletons';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const CAR_STATUS = {
  published: { label: 'Опубликована', variant: 'success' },
  hidden: { label: 'Скрыта', variant: 'secondary' },
  pending: { label: 'На модерации', variant: 'warning' },
  rejected: { label: 'Отклонена', variant: 'destructive' },
};
const STATUS_RU = { pending: 'Ожидает', active: 'В аренде', completed: 'Завершена', cancelled: 'Отменена' };
const fmtMoney = (n) => (n || n === 0 ? Number(n).toLocaleString('ru-RU') : '—') + ' ₽';
const fmtCompact = (n) => { const v = Number(n) || 0; return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace('.0', '')} млн ₽` : v >= 1_000 ? `${Math.round(v / 1_000)} тыс ₽` : `${v.toLocaleString('ru-RU')} ₽`; };
const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' }); };

const SPECS = [
  ['year', 'Год'], ['body', 'Кузов'], ['fuel', 'Топливо'], ['engine', 'Двигатель'],
  ['power_hp', 'Мощность, л.с.'], ['drive', 'Коробка/привод'], ['color', 'Цвет'],
];
const TARIFF = [
  ['price_per_day', '1–5 суток', true], ['price_6_12', '6–12 суток', true], ['price_30', 'от 30 суток', true],
  ['deposit', 'Залог', true], ['mileage_limit', 'Пробег/сут', false], ['overmileage_rate', 'Перекат, ₽/км', false], ['photo_rate', 'Фото, ₽/ч', true],
];

export function CarDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/admin/cars/${id}/detail`).then(setData).catch((e) => setError(e.message || 'Ошибка'));
  }, [id]);

  if (error) return <Container><div className="py-16 text-center text-destructive">{error}</div></Container>;
  if (!data) return <Container><HeroDetailSkeleton /></Container>;

  const c = data.car;
  const st = CAR_STATUS[c.status] || { label: c.status, variant: 'secondary' };
  const rentals = data.bookings.length;
  const statItems = [
    { number: String(rentals), label: 'Броней' },
    { number: fmtCompact(data.revenue), label: 'Выручка' },
    { number: String(data.bookings.filter((b) => b.status === 'active').length), label: 'Сейчас в аренде' },
  ];

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading><ToolbarPageTitle text={c.name} /></ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" asChild><Link to={`/car/${c.id}`} target="_blank">На сайте ↗</Link></Button>
            <Button variant="outline" asChild><Link to="/fleet">← К автопарку</Link></Button>
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <Card>
            <CardContent className="p-6 flex items-center gap-5">
              {c.image_url && <img src={c.image_url} alt="" className="h-24 w-36 rounded-lg object-cover" />}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-mono">{c.name}</span>
                  <Badge size="sm" variant={st.variant} appearance="light">{st.label}</Badge>
                  {c.badge && <Badge size="sm" variant="primary" appearance="light">{c.badge}</Badge>}
                </div>
                <div className="text-sm text-secondary-foreground">{c.id}{c.closed_until && new Date(c.closed_until) > new Date() ? ` · закрыта до ${fmtDate(c.closed_until)}` : ''}</div>
              </div>
            </CardContent>
          </Card>

          <Statistics items={statItems} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7.5">
            <Card>
              <CardHeader><CardHeading><CardTitle>Характеристики</CardTitle></CardHeading></CardHeader>
              <CardContent className="p-6 grid grid-cols-2 gap-y-2 gap-x-4">
                {SPECS.map(([k, l]) => (
                  <Fragment key={k}>
                    <span className="text-sm text-secondary-foreground">{l}</span>
                    <span className="text-sm text-mono">{c[k] ?? '—'}</span>
                  </Fragment>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardHeading><CardTitle>Тарифы</CardTitle></CardHeading></CardHeader>
              <CardContent className="p-6 grid grid-cols-2 gap-y-2 gap-x-4">
                {TARIFF.map(([k, l, money]) => (
                  <Fragment key={k}>
                    <span className="text-sm text-secondary-foreground">{l}</span>
                    <span className="text-sm text-mono">{money ? fmtMoney(c[k]) : (c[k] != null ? `${c[k]}${k === 'overmileage_rate' ? ' ₽/км' : ' км'}` : '—')}</span>
                  </Fragment>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardHeading><CardTitle>История броней ({rentals})</CardTitle></CardHeading></CardHeader>
            <CardContent className="p-0">
              {rentals === 0 ? <div className="p-6 text-sm text-muted-foreground">Броней пока нет</div> : (
                <div className="divide-y divide-border">
                  {data.bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <Link to={`/clients/${b.user?.id}`} className="text-sm font-medium text-mono hover:text-primary">{b.user?.name}</Link>
                        <div className="text-xs text-secondary-foreground">{fmtDate(b.from_dt)} — {fmtDate(b.to_dt)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-mono">{fmtMoney(b.total)}</span>
                        <Badge size="sm" variant={b.status === 'cancelled' ? 'destructive' : b.status === 'active' ? 'success' : 'secondary'} appearance="light">{STATUS_RU[b.status] || b.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
    </Fragment>
  );
}
