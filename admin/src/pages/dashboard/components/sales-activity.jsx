import { Fragment } from 'react';
import { Clock, Car, CheckCircle, XCircle } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '../dashboard-data';

export function SalesActivity() {
  const d = useDashboardData();
  const items = [
    { totalColor: 'text-yellow-400', total: String(d.bookings_pending ?? 0), label: 'заявки', description: 'ожидают', icon: Clock },
    { totalColor: 'text-green-500', total: String(d.bookings_active ?? 0), label: 'авто', description: 'в аренде', icon: Car },
    { totalColor: 'text-primary', total: String(d.bookings_completed ?? 0), label: 'аренд', description: 'завершено', icon: CheckCircle },
    { totalColor: 'text-destructive', total: String(d.bookings_cancelled ?? 0), label: 'аренд', description: 'отменено', icon: XCircle },
  ];

  const renderItem = (item, index) => (
    <Fragment key={index}>
      <div className="grid grid-cols-1 place-content-center flex-1 gap-1 text-center">
        <div className="flex flex-col gap-1">
          <span className={`text-4xl font-medium ${item.totalColor}`}>
            {item.total}
          </span>
          <span className="text-xs font-normal text-secondary-foreground">
            {item.label}
          </span>

          <div className="flex items-start justify-center gap-1 mt-4">
            <item.icon size={16} className="text-sm text-muted-foreground" />
            <span className="text-xs font-medium text-secondary-foreground uppercase">
              {item.description}
            </span>
          </div>
        </div>
      </div>

      <span className="not-last:border-e border-e-input my-1"></span>
    </Fragment>
  );

  return (
    <Card>
      <CardHeader className="px- bg-accent/50">
        <CardTitle>Активность броней</CardTitle>
        <Button mode="link" asChild>
          <Link to="/bookings">Все брони</Link>
        </Button>
      </CardHeader>

      <CardContent className="flex gap-2 lg:pb-7">
        {items.map((item, index) => {
          return renderItem(item, index);
        })}
      </CardContent>
    </Card>
  );
}
