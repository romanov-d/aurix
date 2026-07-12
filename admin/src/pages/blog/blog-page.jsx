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
import { Card, CardHeader, CardHeading, CardTitle, CardTable } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const textareaCls =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
const fieldLabel = 'text-xs text-muted-foreground mb-1.5';
const empty = { id: '', title: '', category: '', read_time: '', excerpt: '', content: '', image_url: '', published: true };

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' }) : '');

export function BlogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/blog?all=1')
      .then((d) => setItems(Array.isArray(d) ? d : d?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (p) => {
    setForm({
      id: p.id, title: p.title || '', category: p.category || '', read_time: p.read_time || '',
      excerpt: p.excerpt || '', content: p.content || '', image_url: p.image_url || '', published: p.published ?? true,
    });
    setOpen(true);
  };

  const onImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Файл слишком большой (макс 2 МБ)'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, image_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title, category: form.category || null, excerpt: form.excerpt || null,
        content: form.content || null, image_url: form.image_url || null,
        read_time: form.read_time || null, published: form.published,
      };
      if (form.id) await api.put(`/blog/${form.id}`, payload);
      else await api.post('/blog', payload);
      setOpen(false); load();
    } catch (e) {
      alert(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm('Удалить статью?')) return;
    try { await api.del(`/blog/${id}`); setItems((xs) => xs.filter((x) => x.id !== id)); }
    catch (e) { alert(e.message); }
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading><ToolbarPageTitle text="Блог" /></ToolbarHeading>
          <ToolbarActions><Button onClick={openNew}><Plus /> Добавить статью</Button></ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <Card>
          <CardHeader><CardHeading><CardTitle>Статьи {!loading && `(${items.length})`}</CardTitle></CardHeading></CardHeader>
          <CardTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Фото</TableHead>
                  <TableHead>Заголовок</TableHead>
                  <TableHead className="w-[130px]">Категория</TableHead>
                  <TableHead className="w-[110px]">Статус</TableHead>
                  <TableHead className="w-[110px] text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="h-10 w-14 rounded object-cover" />
                        : <div className="h-10 w-14 rounded bg-muted" />}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-mono">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</div>
                    </TableCell>
                    <TableCell className="text-secondary-foreground">{p.category || '—'}</TableCell>
                    <TableCell>
                      <Badge size="sm" variant={p.published ? 'success' : 'secondary'} appearance="light">
                        {p.published ? 'Опубл.' : 'Черновик'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Button size="sm" mode="icon" variant="outline" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                        <Button size="sm" mode="icon" variant="outline" onClick={() => del(p.id)}><Trash2 className="size-4 text-destructive" /></Button>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? 'Редактировать статью' : 'Новая статья'}</DialogTitle></DialogHeader>
          <DialogBody className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><div className={fieldLabel}>Заголовок</div><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><div className={fieldLabel}>Категория</div><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><div className={fieldLabel}>Время чтения</div><Input placeholder="5 мин" value={form.read_time} onChange={(e) => setForm({ ...form, read_time: e.target.value })} /></div>
            </div>
            <div><div className={fieldLabel}>Краткое описание</div><textarea className={`${textareaCls} min-h-[60px]`} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
            <div><div className={fieldLabel}>Текст статьи</div><textarea className={`${textareaCls} min-h-[140px]`} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <div>
              <div className={fieldLabel}>Обложка</div>
              <div className="flex items-center gap-3">
                <label className="inline-flex">
                  <input type="file" accept="image/*" className="hidden" onChange={onImage} />
                  <span className="inline-flex items-center h-9 px-3 rounded-md border border-input text-sm cursor-pointer">Загрузить файл</span>
                </label>
                {form.image_url && <img src={form.image_url} alt="" className="h-12 w-16 rounded object-cover" />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              <span className="text-sm">Опубликовать</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving || !form.title}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}
