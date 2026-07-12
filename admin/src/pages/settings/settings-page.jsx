'use client';

import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/aurix-api';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SettingsPage() {
  const [cashback, setCashback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/admin/settings')
      .then((s) => setCashback(String(s?.cashback_percent ?? '5')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const s = await api.patch('/admin/settings', { cashback_percent: parseFloat(cashback) || 0 });
      setCashback(String(s.cashback_percent));
      setMsg('Сохранено');
    } catch (e) {
      setMsg(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Настройки" />
            <ToolbarDescription>Параметры проката AURIX</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>
      <Container>
        <Card className="max-w-xl">
          <CardHeader><CardHeading><CardTitle>Бонусная программа</CardTitle></CardHeading></CardHeader>
          <CardContent className="p-6 flex flex-col gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Кэшбэк с завершённой аренды, %</div>
              <Input
                type="number" min="0" max="100" step="0.5"
                value={loading ? '' : cashback}
                onChange={(e) => setCashback(e.target.value)}
                className="max-w-40"
              />
              <div className="text-xs text-muted-foreground mt-2">
                Начисляется бонусными баллами после завершения брони (1 балл = 1 ₽). Списание — вручную в карточке клиента.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={saving || loading}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
              {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
            </div>
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
}
