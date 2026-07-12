import ApexCharts from 'react-apexcharts';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData, fmtRub } from '../dashboard-data';

export function Orders() {
  const d = useDashboardData();
  const months = d.revenue_by_month || [];
  const categories = months.map((m) => m.month_name || m.month || '');
  const seriesData = months.map((m) => Number(m.revenue) || 0);

  const options = {
    series: [{ name: 'Выручка', data: seriesData }],
    chart: { height: 200, type: 'area', toolbar: { show: false } },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { curve: 'smooth', show: true, width: 3, colors: ['var(--color-primary)'] },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: 0,
        style: { colors: 'var(--color-secondary-foreground)', fontSize: '12px', fontWeight: '400' },
      },
      crosshairs: { position: 'front', stroke: { color: 'var(--color-primary)', width: 1, dashArray: 3 } },
      tooltip: { enabled: false },
    },
    yaxis: { labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
    tooltip: { enabled: true, y: { formatter: (val) => fmtRub(val) } },
    markers: {
      size: 0,
      colors: 'var(--color-primary)',
      strokeColors: 'var(--color-primary)',
      strokeWidth: 4,
      hover: { size: 8, sizeOffset: 0 },
    },
    fill: { gradient: { opacityFrom: 0.25, opacityTo: 0 } },
    grid: {
      borderColor: 'var(--color-border)',
      strokeDashArray: 3,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Выручка</CardTitle>
        <Button mode="link" asChild>
          <Link to="/bookings">Все брони</Link>
        </Button>
      </CardHeader>

      <CardContent className="px-0 pt-5 lg:pt-7.5">
        <div className="flex items-center gap-2.5 px-5 lg:px-7.5 mb-3">
          <span className="text-3xl font-semibold text-mono">{fmtRub(d.revenue)}</span>
        </div>

        {seriesData.length === 0 ? (
          <div className="px-5 lg:px-7.5 pb-8 text-sm text-muted-foreground">
            Пока нет данных по выручке
          </div>
        ) : (
          <ApexCharts options={options} series={options.series} height={200} type="area" className="ml-2" />
        )}
      </CardContent>
    </Card>
  );
}
