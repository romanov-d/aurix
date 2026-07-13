'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Send, Paperclip } from 'lucide-react';
import { api } from '@/lib/aurix-api';
import {
  Toolbar, ToolbarDescription, ToolbarHeading, ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export function ChatPage() {
  const [threads, setThreads] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open'); // open | closed | all
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadThreads = useCallback(() => {
    const qs = new URLSearchParams();
    if (statusFilter !== 'all') qs.set('status', statusFilter);
    if (search.trim()) qs.set('q', search.trim());
    api.get(`/admin/chat/threads?${qs}`).then((d) => setThreads(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
  }, [statusFilter, search]);

  useEffect(() => {
    loadThreads();
    const t = setInterval(loadThreads, 5000);
    return () => clearInterval(t);
  }, [loadThreads]);

  const active = useMemo(() => threads.find((t) => String(t.id) === String(activeId)), [threads, activeId]);

  const loadMessages = useCallback(() => {
    if (!activeId) return;
    // Ответ: { thread, messages } — берём messages
    api.get(`/admin/chat/threads/${activeId}/messages`).then((d) => setMessages(d?.messages || (Array.isArray(d) ? d : []))).catch(() => {});
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages();
    api.post(`/admin/chat/threads/${activeId}/read`).catch(() => {});
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [activeId, loadMessages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openThread = (id) => { setActiveId(id); setMessages([]); };

  const onFile = (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Файл больше 2 МБ'); return; }
    const r = new FileReader();
    r.onloadend = () => setAttachment({ url: r.result, name: file.name, type: file.type, size: file.size });
    r.readAsDataURL(file);
  };

  const send = async () => {
    if (!activeId || (!text.trim() && !attachment)) return;
    setSending(true);
    try {
      await api.post(`/admin/chat/threads/${activeId}/messages`, { body: text.trim() || null, attachment });
      setText(''); setAttachment(null);
      loadMessages(); loadThreads();
    } catch (e) { alert(e.message); }
    finally { setSending(false); }
  };

  const toggleStatus = async () => {
    if (!active) return;
    const next = active.status === 'closed' ? 'open' : 'closed';
    try { await api.patch(`/admin/chat/threads/${activeId}`, { status: next }); loadThreads(); }
    catch (e) { alert(e.message); }
  };

  const isClosed = active?.status === 'closed';

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Чат" />
            <ToolbarDescription>Переписка с клиентами</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>
      <Container>
        <Card className="grid grid-cols-1 lg:grid-cols-[320px_1fr] overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
          {/* Список диалогов */}
          <div className="border-e border-border flex flex-col min-h-0">
            <div className="p-3 border-b border-border flex flex-col gap-2">
              <div className="flex gap-1">
                {[['open', 'Открытые'], ['closed', 'Закрытые'], ['all', 'Все']].map(([k, v]) => (
                  <Button key={k} size="sm" variant={statusFilter === k ? 'primary' : 'outline'} onClick={() => setStatusFilter(k)}>{v}</Button>
                ))}
              </div>
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                <Input placeholder="Поиск" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {threads.length === 0 && <div className="p-4 text-sm text-muted-foreground">Диалогов нет</div>}
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openThread(t.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-accent/50 ${String(t.id) === String(activeId) ? 'bg-accent/50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-mono truncate">{t.user_name || 'Клиент'}</span>
                    {t.unread > 0 && <Badge size="sm" variant="primary">{t.unread}</Badge>}
                  </div>
                  {t.car_name && <div className="text-xs text-primary">{t.car_name}</div>}
                  <div className="text-xs text-muted-foreground truncate">{t.last_body || '—'}</div>
                  <div className="text-[11px] text-muted-foreground/70">{fmtTime(t.last_message_at)}{t.status === 'closed' ? ' · закрыт' : ''}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Переписка */}
          <div className="flex flex-col min-h-0">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Выберите диалог</div>
            ) : (
              <Fragment>
                <div className="p-3 border-b border-border flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <Link to={`/clients/${active.user_id}`} className="text-sm font-medium text-mono hover:text-primary">{active.user_name}</Link>
                    <span className="text-xs text-muted-foreground">{active.user_phone || active.user_email}{active.car_name ? ` · ${active.car_name}` : ''}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={toggleStatus}>{isClosed ? 'Переоткрыть' : 'Закрыть'}</Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-3">
                  {messages.map((m) => {
                    const mine = m.sender_role === 'admin' || m.sender_role === 'manager';
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-lg px-3 py-2 ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {m.attachment_url && (
                            m.attachment_type?.startsWith('image/')
                              ? <img src={m.attachment_url} alt="" className="rounded mb-1 max-h-48" />
                              : <a href={m.attachment_url} target="_blank" rel="noreferrer" className="underline text-sm">{m.attachment_name || 'файл'}</a>
                          )}
                          {m.body && <div className="text-sm whitespace-pre-wrap">{m.body}</div>}
                          <div className={`text-[11px] mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{fmtTime(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                <div className="p-3 border-t border-border flex items-center gap-2">
                  {isClosed ? (
                    <div className="text-sm text-muted-foreground flex-1 text-center py-2">Диалог закрыт</div>
                  ) : (
                    <Fragment>
                      <label className="inline-flex cursor-pointer">
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={onFile} />
                        <span className="inline-flex items-center justify-center size-9 rounded-md border border-input"><Paperclip className="size-4" /></span>
                      </label>
                      {attachment && <span className="text-xs text-muted-foreground truncate max-w-32">{attachment.name}</span>}
                      <Input
                        placeholder="Сообщение…"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                        className="flex-1"
                      />
                      <Button mode="icon" onClick={send} disabled={sending}><Send className="size-4" /></Button>
                    </Fragment>
                  )}
                </div>
              </Fragment>
            )}
          </div>
        </Card>
      </Container>
    </Fragment>
  );
}
