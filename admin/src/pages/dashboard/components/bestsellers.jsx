import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData, fmtRub } from '../dashboard-data';

export function Bestsellers() {
  const d = useDashboardData();
  const items = (d.top_cars || []).slice(0, 5);

  const renderItem = (item, index) => (
    <div key={index} className="flex items-center grow gap-2.5">
      <div className="flex items-center justify-center border border-border rounded-md bg-accent/50 h-[50px] w-[60px] overflow-hidden">
        <img
          src={item.image_url}
          className="size-full object-cover shrink-0"
          alt="image"
        />
      </div>

      <div className="flex flex-col gap-1 mb-0.5 grow">
        <Link
          to={`/car/${item.id}`}
          className="text-sm font-medium text-mono hover:text-primary"
        >
          {item.name}
        </Link>
        <div className="text-xs text-secondary-foreground">
          Аренд: <span className="text-foreground font-medium">{item.rentals}</span>
        </div>
      </div>

      <span className="text-sm font-semibold text-mono">{fmtRub(item.revenue)}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Топ авто по выручке</CardTitle>
        <Button mode="link" asChild>
          <Link to="/bookings">Все брони</Link>
        </Button>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-2 lg:gap-5">
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">Пока нет данных</div>
          )}
          {items.map((item, index) => renderItem(item, index))}
        </div>
      </CardContent>
    </Card>
  );
}
