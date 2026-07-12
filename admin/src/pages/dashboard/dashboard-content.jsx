'use client';

import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CarFront, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fmtCompact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс ₽`;
  return `${n.toLocaleString('ru-RU')} ₽`;
};

// KPI-карточка (типографика Metronic)
function Kpi({ label, value }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <span className="text-sm font-medium text-secondary-foreground">{label}</span>
        <span className="text-2xl font-semibold text-mono">{value}</span>
      </CardContent>
    </Card>
  );
}

// Автопарк — по образцу total-asset-value.jsx
function FleetValue({ d }) {
  const total = d.cars_total || 0;
  const published = d.cars_published || 0;
  const hidden = Math.max(0, total - published);
  const pubPct = total ? Math.round((published / total) * 100) : 0;
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-4 justify-center h-full">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-secondary-foreground">Автопарк</span>
          <span className="text-3xl font-semibold text-mono">{total} авто</span>
        </div>
        <div className="w-full space-y-2.5">
          <div className="flex items-center gap-1 pb-1">
            <Badge variant="success" className="h-2 rounded-xs" style={{ width: `${pubPct}%` }}></Badge>
            <Badge variant="secondary" className="h-2 rounded-xs" style={{ width: `${100 - pubPct}%` }}></Badge>
          </div>
          <div className="flex items-center flex-wrap gap-4">
            <div className="flex items-center gap-1.5">
              <Badge variant="success" className="size-1.5"></Badge>
              <span className="text-xs font-normal text-foreground">Опубликовано:</span>
              <span className="text-xs font-semibold text-mono">{published}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="size-1.5"></Badge>
              <span className="text-xs font-normal text-foreground">Скрыто:</span>
              <span className="text-xs font-semibold text-mono">{hidden}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Воронка броней — по образцу sales-activity.jsx
function BookingActivity({ d }) {
  const items = [
    { total: d.bookings_pending || 0, label: 'заявки', description: 'ожидают', icon: Clock, totalColor: 'text-yellow-400' },
    { total: d.bookings_active || 0, label: 'авто', description: 'в аренде', icon: CarFront, totalColor: 'text-green-500' },
    { total: d.bookings_completed || 0, label: 'аренд', description: 'завершено', icon: CheckCircle, totalColor: 'text-primary' },
    { total: d.bookings_cancelled || 0, label: 'аренд', description: 'отменено', icon: XCircle, totalColor: 'text-destructive' },
  ];
  return (
    <Card className="h-full">
      <CardHeader className="bg-accent/50">
        <CardTitle>Активность броней</CardTitle>
        <Button mode="link" asChild><Link to="/bookings">Все брони</Link></Button>
      </CardHeader>
      <CardContent className="flex gap-2 lg:pb-7">
        {items.map((item, index) => (
          <Fragment key={index}>
            <div className="grid grid-cols-1 place-content-center flex-1 gap-1 text-center">
              <div className="flex flex-col gap-1">
                <span className={`text-4xl font-medium ${item.totalColor}`}>{item.total}</span>
                <span className="text-xs font-normal text-secondary-foreground">{item.label}</span>
                <div className="flex items-start justify-center gap-1 mt-4">
                  <item.icon size={16} className="text-sm text-muted-foreground" />
                  <span className="text-xs font-medium text-secondary-foreground uppercase">{item.description}</span>
                </div>
              </div>
            </div>
            <span className="not-last:border-e border-e-input my-1"></span>
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
}

// Топ авто по выручке — по образцу bestsellers.jsx
function TopCars({ cars }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Топ авто по выручке</CardTitle>
        <Button mode="link" asChild><Link to="/bookings">Все брони</Link></Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 lg:gap-5">
          {(!cars || cars.length === 0) && (
            <div className="text-sm text-muted-foreground">Пока нет данных</div>
          )}
          {(cars || []).map((c, index) => (
            <div key={index} className="flex items-center grow gap-2.5">
              <div className="flex items-center justify-center border border-border rounded-md bg-accent/50 h-[50px] w-[60px] overflow-hidden">
                {c.image_url
                  ? <img src={c.image_url} className="size-full object-cover" alt="" />
                  : <CarFront className="size-6 text-muted-foreground" />}
              </div>
              <div className="flex flex-col gap-1 grow">
                <span className="text-sm font-medium text-mono">{c.name}</span>
                <span className="text-xs text-secondary-foreground">
                  Аренд: <span className="text-foreground font-medium">{c.rentals}</span>
                </span>
              </div>
              <span className="text-sm font-semibold text-mono">{fmtCompact(c.revenue)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardContent({ data }) {
  const d = data || {};
  return (
    <div className="flex flex-col gap-5 lg:gap-7.5">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5">
        <Kpi label="Выручка всего" value={fmtCompact(d.revenue)} />
        <Kpi label="Выручка за месяц" value={fmtCompact(d.month_revenue)} />
        <Kpi label="Броней всего" value={d.bookings_total ?? 0} />
        <Kpi label="Клиентов" value={d.clients ?? 0} />
      </div>

      {/* Воронка + Автопарк */}
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5">
        <div className="lg:col-span-2"><BookingActivity d={d} /></div>
        <div className="lg:col-span-1"><FleetValue d={d} /></div>
      </div>

      {/* Топ авто */}
      <div className="grid lg:grid-cols-1">
        <TopCars cars={d.top_cars} />
      </div>
    </div>
  );
}
