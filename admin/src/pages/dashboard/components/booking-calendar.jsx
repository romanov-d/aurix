'use client';

import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useDashboardData } from '../dashboard-data';

const STATUS_COLOR = {
  active: 'bg-green-500',
  pending: 'bg-yellow-400',
  completed: 'bg-secondary-foreground/40',
};

// Календарь занятости на 14 дней (строки-авто × дни), как в старой админке
export function BookingCalendar() {
  const d = useDashboardData();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => { const dt = new Date(today); dt.setDate(dt.getDate() + i); return dt; });

  // группируем брони по машине
  const byCar = {};
  (d.calendar || []).forEach((b) => {
    if (!byCar[b.car_id]) byCar[b.car_id] = { name: b.car_name, bookings: [] };
    byCar[b.car_id].bookings.push(b);
  });
  const carIds = Object.keys(byCar);

  const bookedOn = (carId, day) => {
    const s = new Date(day); s.setHours(0, 0, 0, 0);
    const e = new Date(day); e.setHours(23, 59, 59, 999);
    return byCar[carId]?.bookings.find((b) => new Date(b.from_dt) <= e && new Date(b.to_dt) >= s);
  };

  const dd = (dt) => dt.toLocaleDateString('ru-RU', { day: 'numeric' });
  const wd = (dt) => dt.toLocaleDateString('ru-RU', { weekday: 'short' });
  const isWeekend = (dt) => dt.getDay() === 0 || dt.getDay() === 6;

  return (
    <Card>
      <CardHeader><CardHeading><CardTitle>Занятость автопарка · 14 дней</CardTitle></CardHeading></CardHeader>
      <CardContent className="p-0">
        {carIds.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Нет активных броней в ближайшие 14 дней</div>
        ) : (
          <ScrollArea>
            <table className="w-full text-sm border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-secondary-foreground min-w-[160px] sticky left-0 bg-card">Авто</th>
                  {days.map((dt, i) => (
                    <th key={i} className={`px-1 py-2 text-center font-normal text-xs ${isWeekend(dt) ? 'text-primary' : 'text-muted-foreground'}`}>
                      <div>{dd(dt)}</div>
                      <div className="text-[10px] uppercase">{wd(dt)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carIds.map((cid) => (
                  <tr key={cid} className="border-b border-border">
                    <td className="px-4 py-2 text-mono whitespace-nowrap sticky left-0 bg-card">{byCar[cid].name}</td>
                    {days.map((dt, i) => {
                      const b = bookedOn(cid, dt);
                      return (
                        <td key={i} className="px-1 py-2 text-center" title={b ? `${b.user_name || ''} · ${b.status}` : ''}>
                          {b ? <span className={`inline-block size-2.5 rounded-full ${STATUS_COLOR[b.status] || 'bg-muted-foreground'}`} /> : <span className="text-muted-foreground/30">·</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
