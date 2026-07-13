'use client';

import { Fragment, useEffect, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { api } from '@/lib/aurix-api';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { Card, CardHeader, CardHeading, CardTitle, CardTable, CardToolbar } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const textareaCls =
  'w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
const fieldLabel = 'text-xs text-muted-foreground mb-1.5';

const empty = { id: '', question: '', answer: '', sort_order: 10 };

export function FaqPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/faq')
      .then((d) => setItems(Array.isArray(d) ? d : d?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => {
    const next = (items[items.length - 1]?.sort_order || 0) + 10;
    setForm({ ...empty, sort_order: next });
    setOpen(true);
  };
  const openEdit = (f) => { setForm({ id: f.id, question: f.question, answer: f.answer, sort_order: f.sort_order }); setOpen(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { question: form.question, answer: form.answer, sort_order: parseInt(form.sort_order, 10) || 0 };
      if (form.id) await api.put(`/faq/${form.id}`, payload);
      else await api.post('/faq', payload);
      setOpen(false);
      load();
    } catch (e) {
      alert(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm('Удалить вопрос?')) return;
    try { await api.del(`/faq/${id}`); setItems((xs) => xs.filter((x) => x.id !== id)); }
    catch (e) { alert(e.message); }
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="FAQ" />
          </ToolbarHeading>
          <ToolbarActions>
            <Button onClick={openNew}><Plus /> Добавить вопрос</Button>
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <Card>
          <CardHeader><CardHeading><CardTitle>Вопросы {!loading && `(${items.length})`}</CardTitle></CardHeading></CardHeader>
          <CardTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Сорт.</TableHead>
                  <TableHead>Вопрос / ответ</TableHead>
                  <TableHead className="w-[110px] text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="p-0">
                      <div className="flex flex-col gap-3 p-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-md shrink-0" />
                            <div className="flex flex-col gap-2 grow">
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="h-3 w-1/3" />
                            </div>
                            <Skeleton className="h-8 w-16 rounded-md shrink-0" />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : items.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-muted-foreground">{f.sort_order}</TableCell>
                    <TableCell>
                      <div className="font-medium text-mono">{f.question}</div>
                      <div className="text-xs text-secondary-foreground line-clamp-2">{f.answer}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Button size="sm" mode="icon" variant="outline" onClick={() => openEdit(f)}><Pencil className="size-4" /></Button>
                        <Button size="sm" mode="icon" variant="outline" onClick={() => del(f.id)}><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardTable>
        </Card>
      </Container>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? 'Редактировать вопрос' : 'Новый вопрос'}</DialogTitle></DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div>
              <div className={fieldLabel}>Вопрос</div>
              <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </div>
            <div>
              <div className={fieldLabel}>Ответ</div>
              <textarea className={textareaCls} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            </div>
            <div>
              <div className={fieldLabel}>Порядок сортировки</div>
              <Input type="number" className="max-w-32" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving || !form.question || !form.answer}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}
