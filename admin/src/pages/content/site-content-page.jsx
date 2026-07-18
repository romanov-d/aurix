'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
const RICH_CLASS =
  'w-full min-h-[52px] rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring whitespace-pre-wrap [&_.gold]:text-primary';

// Из contenteditable оставляем только <br> и <span class="gold"> — чистый HTML.
function sanitize(root) {
  let html = '';
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const walk = (node) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) html += esc(n.textContent);
      else if (n.nodeName === 'BR') html += '<br>';
      else if (n.nodeName === 'SPAN' && n.classList.contains('gold')) {
        html += '<span class="gold">';
        walk(n);
        html += '</span>';
      } else if (['DIV', 'P'].includes(n.nodeName)) {
        if (html && !html.endsWith('<br>')) html += '<br>';
        walk(n);
      } else walk(n);
    });
  };
  walk(root);
  return html.replace(/(<br>)+$/g, '');
}

// Любой акцент (em / span с любым классом) → единый <span class="gold">,
// чтобы он и отображался золотым в редакторе, и сохранялся единообразно.
const normalizeIn = (html) =>
  (html || '')
    .replace(/<(?:span|em)[^>]*>/gi, '<span class="gold">')
    .replace(/<\/(?:span|em)>/gi, '</span>');

// Визуальный редактор заголовка: золотой текст сразу золотой, без скобок и тегов.
function GoldField({ id, value, onChange }) {
  const ref = useRef(null);
  // Начальное значение ставим один раз, чтобы не сбивать курсор при вводе.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = normalizeIn(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => ref.current && onChange(sanitize(ref.current));

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      emit();
    }
  };

  // Выделение → золото (или снять золото, если уже внутри акцента).
  const toggleGold = () => {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel.rangeCount || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    let node = range.commonAncestorContainer;
    while (node && node !== el && !(node.nodeType === 1 && node.classList?.contains('gold')))
      node = node.parentNode;
    if (node && node.classList?.contains('gold')) {
      const parent = node.parentNode;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
    } else {
      const span = document.createElement('span');
      span.className = 'gold';
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    sel.removeAllRanges();
    emit();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={toggleGold}
          title="Выделите слово и нажмите — оно станет золотым (повторно — снимет)">
          ✦ Золотой акцент
        </Button>
      </div>
      <div
        id={id}
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onKeyDown={onKeyDown}
        className={RICH_CLASS}
      />
      <div className="text-xs text-muted-foreground">
        Enter — новая строка · выделите слово и нажмите «Золотой акцент» для цвета
      </div>
    </div>
  );
}

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
        setDraft(Object.fromEntries(list.map((r) => [r.key, r.value ?? ''])));
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

  const save = async (row) => {
    const value = draft[row.key] ?? '';
    setSavingKey(row.key);
    setErrorKey((er) => ({ ...er, [row.key]: '' }));
    try {
      const updated = await api.patch('/admin/content/' + row.key, { value });
      setItems((list) =>
        list.map((r) => (r.key === row.key ? { ...r, ...updated } : r)),
      );
      setSavedKey(row.key);
      setTimeout(() => setSavedKey((k) => (k === row.key ? null : k)), 2000);
    } catch (err) {
      setErrorKey((er) => ({ ...er, [row.key]: err?.message || 'Ошибка сохранения' }));
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

            <Card>
              <CardContent className="p-6 flex flex-col gap-6">
                {activeRows.map((row) => {
                  const value = draft[row.key] ?? '';
                  const dirty = value !== (row.value ?? '');
                  return (
                    <div
                      key={row.key}
                      className="flex flex-col gap-1.5 pb-5 border-b border-border last:border-0 last:pb-0"
                    >
                      <label className="text-sm font-medium text-mono">
                        {row.label || row.key}
                      </label>
                      {row.type === 'html' ? (
                        <GoldField
                          id={`content-${row.key}`}
                          value={row.value ?? ''}
                          onChange={(html) =>
                            setDraft((d) => ({ ...d, [row.key]: html }))
                          }
                        />
                      ) : row.type === 'textarea' ? (
                        <textarea
                          className={TEXTAREA_CLASS}
                          value={value}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [row.key]: e.target.value }))
                          }
                        />
                      ) : (
                        <Input
                          value={value}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [row.key]: e.target.value }))
                          }
                        />
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
          </div>
        )}
      </Container>
    </Fragment>
  );
}
