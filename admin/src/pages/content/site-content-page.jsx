'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/aurix-api';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { CardListSkeleton } from '@/components/common/aurix-skeletons';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TEXTAREA_CLASS =
  'w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm';

export function SiteContentPage() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [errorKey, setErrorKey] = useState({});

  useEffect(() => {
    api
      .get('/admin/content')
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setItems(list);
        setDraft(Object.fromEntries(list.map((r) => [r.key, r.value ?? ''])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Группировка по секциям с сохранением исходного порядка (бэкенд уже сортирует).
  const sections = useMemo(() => {
    const map = new Map();
    for (const row of items) {
      const key = row.section || 'Прочее';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return Array.from(map.entries());
  }, [items]);

  const save = async (row) => {
    const value = draft[row.key] ?? '';
    setSavingKey(row.key);
    setErrorKey((e) => ({ ...e, [row.key]: '' }));
    try {
      const updated = await api.patch('/admin/content/' + row.key, { value });
      // Обновляем оригинал, чтобы кнопка «Сохранить» скрылась.
      setItems((list) =>
        list.map((r) => (r.key === row.key ? { ...r, ...updated } : r)),
      );
      if (updated && typeof updated.value === 'string') {
        setDraft((d) => ({ ...d, [row.key]: updated.value }));
      }
      setSavedKey(row.key);
      setTimeout(() => setSavedKey((k) => (k === row.key ? null : k)), 2000);
    } catch (err) {
      setErrorKey((e) => ({ ...e, [row.key]: err?.message || 'Ошибка сохранения' }));
    } finally {
      setSavingKey((k) => (k === row.key ? null : k));
    }
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Тексты сайта" />
            <ToolbarDescription>Мини-CMS: редактирование текстов публичного сайта</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>
      <Container>
        {loading ? (
          <div className="flex flex-col gap-5">
            <CardListSkeleton rows={4} />
            <CardListSkeleton rows={4} />
          </div>
        ) : sections.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Записи не найдены.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-5">
            {sections.map(([section, rows]) => (
              <Card key={section}>
                <CardHeader>
                  <CardHeading>
                    <CardTitle>{section}</CardTitle>
                  </CardHeading>
                </CardHeader>
                <CardContent className="p-6 flex flex-col gap-6">
                  {rows.map((row) => {
                    const value = draft[row.key] ?? '';
                    const dirty = value !== (row.value ?? '');
                    const isTextarea = row.type === 'textarea' || row.type === 'html';
                    return (
                      <div key={row.key} className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`content-${row.key}`}
                          className="text-xs text-muted-foreground"
                        >
                          {row.label || row.key}
                        </label>
                        {isTextarea ? (
                          <textarea
                            id={`content-${row.key}`}
                            className={TEXTAREA_CLASS}
                            value={value}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, [row.key]: e.target.value }))
                            }
                          />
                        ) : (
                          <Input
                            id={`content-${row.key}`}
                            value={value}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, [row.key]: e.target.value }))
                            }
                          />
                        )}
                        {row.type === 'html' && (
                          <div className="text-xs text-muted-foreground">
                            Можно использовать {'<br>'} и {'<span class=…>'}
                          </div>
                        )}
                        {(dirty || savedKey === row.key || errorKey[row.key]) && (
                          <div className="flex items-center gap-3 mt-1">
                            {dirty && (
                              <Button
                                size="sm"
                                onClick={() => save(row)}
                                disabled={savingKey === row.key}
                              >
                                {savingKey === row.key ? 'Сохранение…' : 'Сохранить'}
                              </Button>
                            )}
                            {savedKey === row.key && !dirty && (
                              <span className="text-sm text-green-500">✓ Сохранено</span>
                            )}
                            {errorKey[row.key] && (
                              <span className="text-sm text-destructive">
                                {errorKey[row.key]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </Fragment>
  );
}
