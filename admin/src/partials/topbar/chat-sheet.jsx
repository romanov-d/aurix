'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatsCircle } from '@phosphor-icons/react';
import { api } from '@/lib/aurix-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export function ChatSheet({ trigger }) {
  const [threads, setThreads] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get('/admin/chat/threads?status=open')
      .then((d) => setThreads((Array.isArray(d) ? d : d?.items || []).slice(0, 15)))
      .catch(() => {});
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="p-0 gap-0 w-full sm:max-w-[420px] flex flex-col" close={false}>
        <SheetHeader className="border-b border-border py-3.5 px-5 flex-row items-center justify-between space-y-0">
          <SheetTitle>Сообщения</SheetTitle>
          <Button variant="ghost" mode="link" onClick={() => setOpen(false)}>Закрыть</Button>
        </SheetHeader>
        <SheetBody className="p-0 grow overflow-hidden">
          <ScrollArea className="h-[calc(100dvh-140px)]">
            {threads.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">Диалогов нет</div>
            ) : (
              <div className="divide-y divide-border">
                {threads.map((t) => (
                  <Link key={t.id} to="/chat" onClick={() => setOpen(false)} className="flex items-start gap-3 px-5 py-3.5 hover:bg-accent/50">
                    <div className="flex items-center justify-center size-9 rounded-full bg-primary text-primary-foreground font-semibold shrink-0">
                      {(t.user_name || 'К').trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 grow">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-mono truncate">{t.user_name || 'Клиент'}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(t.last_message_at)}</span>
                      </div>
                      {t.car_name && <div className="text-xs text-primary truncate">{t.car_name}</div>}
                      <div className="text-xs text-muted-foreground truncate">{t.last_body || '—'}</div>
                    </div>
                    {t.unread > 0 && <Badge size="sm" variant="primary">{t.unread}</Badge>}
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-3">
          <Button variant="outline" className="w-full" asChild>
            <Link to="/chat" onClick={() => setOpen(false)}><ChatsCircle className="size-4" /> Открыть чат</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
