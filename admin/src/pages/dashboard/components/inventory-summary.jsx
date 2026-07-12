import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '../dashboard-data';

export function InventorySummary() {
  const d = useDashboardData();
  return (
    <Card className="h-full">
      <CardHeader className="px-3 bg-accent/50">
        <CardTitle>Сводка по парку</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2.5 px-4">
        <div className="flex items-center justify-between gap-5">
          <span className="text-sm font-normal text-secondary-foreground uppercase">
            авто в парке
          </span>
          <span className="text-2xl font-medium text-mono">{d.cars_total ?? 0}</span>
        </div>

        <div className="border-b border-b-border mt-1"></div>

        <div className="text-sm flex items-center justify-between gap-5">
          <span className="font-normal text-secondary-foreground uppercase">
            опубликовано на сайте
          </span>
          <span className="text-2xl font-medium text-mono">{d.cars_published ?? 0}</span>
        </div>
      </CardContent>
    </Card>
  );
}
