import { Link } from 'react-router';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '../dashboard-data';

export function Inventory() {
  const d = useDashboardData();
  const total = d.cars_published ?? 0;
  const inRent = d.bookings_active ?? 0;
  const free = Math.max(0, total - inRent);
  const freePct = total ? Math.round((free / total) * 100) : 0;

  const items = [
    { badgeColor: 'success', label: 'Свободно' },
    { badgeColor: 'warning', label: 'В аренде' },
  ];

  // «Сейчас в аренде» — активные брони из календаря
  const rows = (d.calendar || [])
    .filter((b) => b.status === 'active')
    .slice(0, 3)
    .map((b) => ({ text: b.car_name, who: b.user_name }));

  const renderItem = (item, index) => (
    <div key={index} className="flex items-center">
      <Badge appearance="ghost" variant={item.badgeColor}>
        <BadgeDot className="size-2" />
      </Badge>
      <span className="text-sm font-normal text-foreground">{item.label}</span>
    </div>
  );

  const renderRows = (row, index) => (
    <div
      key={index}
      className="flex items-center justify-between flex-wrap bg-accent/50 p-2.5 rounded-md gap-2"
    >
      <span className="text-sm text-mono">{row.text}</span>
      <span className="text-sm text-secondary-foreground">{row.who}</span>
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Автопарк</CardTitle>
        <Button mode="link" asChild>
          <Link to="/bookings">Все брони</Link>
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-5 lg:p-7.5 lg:pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-normal text-secondary-foreground">
            Авто на сайте
          </span>
          <span className="text-3xl font-semibold text-mono">{total}</span>
        </div>

        <div className="flex items-center gap-1 mb-1.5">
          <Badge variant="success" className="h-2 rounded-xs" style={{ width: `${freePct}%` }}></Badge>
          <Badge variant="warning" className="h-2 rounded-xs" style={{ width: `${100 - freePct}%` }}></Badge>
        </div>

        <div className="flex items-center flex-wrap gap-3 mb-1">
          {items.map((item, index) => renderItem(item, index))}
        </div>

        <div className="grid gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-mono font-medium">Сейчас в аренде</span>
          </div>
          {rows.length === 0
            ? <div className="text-sm text-muted-foreground">Нет активных аренд</div>
            : rows.map((row, index) => renderRows(row, index))}
        </div>
      </CardContent>
    </Card>
  );
}
