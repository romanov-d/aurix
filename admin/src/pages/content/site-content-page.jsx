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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TEXTAREA_CLASS =
  'w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed';

// Дружелюбный формат вместо сырого HTML:
//   перенос строки  ↔  <br>
//   [[золотой текст]]  ↔  <span class="gold">…</span>
const htmlToEdit = (html) =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    // Любой акцент (span/em, с любым классом) → [[…]]
    .replace(/<(?:span|em)[^>]*>/gi, '[[')
    .replace(/<\/(?:span|em)>/gi, ']]');
const editToHtml = (text) =>
  (text || '')
    .replace(/\r?\n/g, '<br>')
    // Сохраняем единообразно через глобальный класс .gold (золото везде)
    .replace(/\[\[([\s\S]+?)\]\]/g, '<span class="gold">$1</span>');

export function SiteContentPage() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [errorKey, setErrorKey] = useState({});
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    api
      .get('/admin/content')
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setItems(list);
        setDraft(
          Object.fromEntries(
            list.map((r) => [
              r.key,
              r.type === 'html' ? htmlToEdit(r.value) : r.value ?? '',
            ]),
          ),
        );
        setActiveSection(list[0]?.section || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo(() => {
    const map = new Map();
    for (const row of items) {
      const key = row.section || 'Прочее';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return Array.from(map.entries());
  }, [items]);

  const activeRows = useMemo(
    () => sections.find(([name]) => name === activeSection)?.[1] || [],
    [sections, activeSection],
  );

  // Значение для отправки: html-поля собираем обратно в HTML.
  const toStored = (row) =>
    row.type === 'html' ? editToHtml(draft[row.key]) : draft[row.key] ?? '';

  // Обернуть выделенный в поле текст в золотой акцент [[…]].
  const wrapGold = (key) => {
    const el = document.getElementById(`content-${key}`);
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const v = draft[key] || '';
    if (s === e) return; // ничего не выделено
    const next = `${v.slice(0, s)}[[${v.slice(s, e)}]]${v.slice(e)}`;
    setDraft((d) => ({ ...d, [key]: next }));
  };

  const save = async (row) => {
    const value = toStored(row);
    setSavingKey(row.key);
    setErrorKey((er) => ({ ...er, [row.key]: '' }));
    try {
      const updated = await api.patch('/admin/content/' + row.key, { value });
      setItems((list) =>
        list.map((r) => (r.key === row.key ? { ...r, ...updated } : r)),
      );
      if (updated && typeof updated.value === 'string') {
        setDraft((d) => ({
          ...d,
          [row.key]:
            row.type === 'html' ? htmlToEdit(updated.value) : updated.value,
        }));
      }
      setSavedKey(row.key);
      setTimeout(() => setSavedKey((k) => (k === row.key ? null : k)), 2000);
    } catch (err) {
      setErrorKey((er) => ({
        ...er,
        [row.key]: err?.message || 'Ошибка сохранения',
      }));
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
            <ToolbarDescription>
              Редактирование текстов публичного сайта — по страницам
            </ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>
      <Container>
        {loading ? (
          <div className="flex flex-col gap-5">
            <CardListSkeleton rows={5} />
          </div>
        ) : sections.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Записи не найдены.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Переключатель страниц */}
            <div className="flex flex-wrap gap-1.5">
              {sections.map(([name]) => (
                <Button
                  key={name}
                  size="sm"
                  variant={name === activeSection ? 'primary' : 'outline'}
                  onClick={() => setActiveSection(name)}
                >
                  {name}
                </Button>
              ))}
            </div>

            {/* Блоки активной страницы */}
            <Card>
              <CardContent className="p-6 flex flex-col gap-6">
                {activeRows.map((row) => {
                  const value = draft[row.key] ?? '';
                  const dirty = toStored(row) !== (row.value ?? '');
                  const multiline = row.type === 'textarea' || row.type === 'html';
                  return (
                    <div
                      key={row.key}
                      className="flex flex-col gap-1.5 pb-5 border-b border-border last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`content-${row.key}`}
                          className="text-sm font-medium text-mono"
                        >
                          {row.label || row.key}
                        </label>
                        {row.type === 'html' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => wrapGold(row.key)}
                            title="Выделите слово в поле и нажмите — оно станет золотым"
                          >
                            ✦ Золотой акцент
                          </Button>
                        )}
                      </div>
                      {multiline ? (
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
                          Enter — новая строка · выделите текст и нажмите «Золотой
                          акцент», чтобы выделить его цветом
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
                            <span className="text-sm text-green-500">
                              ✓ Сохранено
                            </span>
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
          </div>
        )}
      </Container>
    </Fragment>
  );
}
