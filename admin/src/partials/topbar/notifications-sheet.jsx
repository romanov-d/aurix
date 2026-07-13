'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Car, CheckCircle, XCircle, Clock } from '@phosphor-icons/react';
import { api } from '@/lib/aurix-api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';

const EVENT = {
  pending: { text: 'оставил заявку на', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/15' },
  active: { text: 'арендовал', icon: Car, color: 'text-green-500', bg: 'bg-green-500/15' },
  completed: { text: 'завершил аренду', icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/15' },
  cancelled: { text: 'отменил бронь', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/15' },
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export function NotificationsSheet({ trigger }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get('/admin/bookings')
      .then((d) => {
        const arr = Array.isArray(d) ? d : d?.items || [];
        arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setItems(arr.slice(0, 15));
      })
      .catch(() => {});
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="p-0 gap-0 w-full sm:max-w-[420px] flex flex-col" close={false}>
        <SheetHeader className="border-b border-border py-3.5 px-5 flex-row items-center justify-between space-y-0">
          <SheetTitle>Уведомления</SheetTitle>
          <Button variant="ghost" mode="link" onClick={() => setOpen(false)}>Закрыть</Button>
        </SheetHeader>
        <SheetBody className="p-0 grow overflow-hidden">
          <ScrollArea className="h-[calc(100dvh-140px)]">
            {items.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">Событий пока нет</div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((b) => {
                  const e = EVENT[b.status] || EVENT.pending;
                  const Icon = e.icon;
                  return (
                    <Link key={b.id} to="/bookings" onClick={() => setOpen(false)} className="flex items-start gap-3 px-5 py-3.5 hover:bg-accent/50">
                      <div className={`flex items-center justify-center size-9 rounded-full ${e.bg} ${e.color} shrink-0`}>
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-mono">
                          <span className="font-medium">{b.user?.name || 'Клиент'}</span>{' '}
                          <span className="text-secondary-foreground">{e.text}</span>{' '}
                          <span className="font-medium">{b.car?.name || b.car_id}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {timeAgo(b.created_at)}{b.total ? ` · ${Number(b.total).toLocaleString('ru-RU')} ₽` : ''}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-3">
          <Button variant="outline" className="w-full" asChild>
            <Link to="/bookings" onClick={() => setOpen(false)}><CalendarCheck className="size-4" /> Все брони</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
