import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const pad = n => String(n).padStart(2, '0');
const toStr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromStr = s => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const sameDay = (a, b) => a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                   'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function fmtShort(s) {
  if (!s) return '';
  const d = fromStr(s);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  let dow = first.getDay();
  dow = dow === 0 ? 6 : dow - 1; // Mon=0

  const lastDay = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let i = 0; i < dow; i++) {
    const prevLast = new Date(year, month, 0).getDate();
    days.push({ date: new Date(year, month - 1, prevLast - dow + i + 1), outside: true });
  }
  for (let d = 1; d <= lastDay; d++) {
    days.push({ date: new Date(year, month, d), outside: false });
  }
  const trailing = 42 - days.length;
  for (let d = 1; d <= trailing; d++) {
    days.push({ date: new Date(year, month + 1, d), outside: true });
  }
  return days;
}

export default function DateRangePicker({
  from,
  to,
  onChange,
  minDate,
  variant = 'default', // 'default' | 'hero' | 'sidebar'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);
  const [picking, setPicking] = useState(false);
  const today = new Date(); today.setHours(0,0,0,0);
  const initDate = from ? fromStr(from) : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const ref = useRef(null);
  const popupRef = useRef(null); // модалка рендерится порталом вне ref — нужен свой ref

  const fromDate = from ? fromStr(from) : null;
  const toDate   = to   ? fromStr(to)   : null;
  const minD = minDate ? fromStr(minDate) : today;

  useEffect(() => {
    function outside(e) {
      const inTrigger = ref.current && ref.current.contains(e.target);
      const inPopup = popupRef.current && popupRef.current.contains(e.target);
      if (!inTrigger && !inPopup) {
        setIsOpen(false);
        setHoverDate(null);
        if (picking && !to) {
          setPicking(false);
        }
      }
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [picking, to]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(date) {
    if (date < minD) return;
    if (!picking || !fromDate) {
      onChange({ from: toStr(date), to: null });
      setPicking(true);
    } else {
      if (date.getTime() === fromDate.getTime()) return;
      if (date > fromDate) {
        onChange({ from: from, to: toStr(date) });
      } else {
        onChange({ from: toStr(date), to: from });
      }
      setPicking(false);
      setHoverDate(null);
      setIsOpen(false);
    }
  }

  function clearDates(e) {
    e.stopPropagation();
    onChange({ from: null, to: null });
    setPicking(false);
    setHoverDate(null);
  }

  const days = getCalendarDays(viewYear, viewMonth);

  const effStart = picking && hoverDate && hoverDate < fromDate ? hoverDate : fromDate;
  const effEnd   = picking && hoverDate
    ? (hoverDate >= fromDate ? hoverDate : fromDate)
    : toDate;

  function hasRange() { return from && to; }
  function getLabel() {
    if (hasRange()) return `${fmtShort(from)} — ${fmtShort(to)}`;
    if (from) return `${fmtShort(from)} — ...`;
    return null;
  }

  const isHero = variant === 'hero';
  const isSidebar = variant === 'sidebar';

  return (
    <div ref={ref} className={`drp-root${isOpen ? ' drp-open' : ''}`}>

      {isHero ? (
        <div className="drp-hero-trigger" onClick={() => setIsOpen(v => !v)}>
          <div className="drp-hero-seg drp-hero-seg-from">
            <span className="drp-hero-lbl">Получение</span>
            <span className="drp-hero-val">{from ? fmtShort(from) : 'Дата'}</span>
          </div>
          <div className="drp-hero-divider">—</div>
          <div className="drp-hero-seg drp-hero-seg-to">
            <span className="drp-hero-lbl">Возврат</span>
            <span className="drp-hero-val">{to ? fmtShort(to) : 'Дата'}</span>
          </div>
          {hasRange() && (
            <button className="drp-hero-clear" onClick={clearDates}>
              <i className="ph ph-x" />
            </button>
          )}
        </div>
      ) : (
        <button className={`drp-trigger${isSidebar ? ' drp-trigger-sidebar' : ''}`} onClick={() => setIsOpen(v => !v)}>
          <i className="ph-fill ph-calendar-blank" />
          <span>{getLabel() || 'Выбрать даты'}</span>
          {hasRange() && (
            <span className="drp-clear-btn" onClick={clearDates}>
              <i className="ph ph-x" />
            </span>
          )}
        </button>
      )}

      {isOpen && (() => {
        // Сайдбарную модалку рендерим порталом в body: иначе она заперта в
        // stacking-context sticky-сайдбара .filters, и колонка с карточками
        // (позже в DOM) рисуется поверх календаря — даты не выбрать.
        const node = (
        <>
        {isSidebar && <div className="drp-modal-backdrop" onClick={() => setIsOpen(false)} />}
        <div ref={popupRef} className={`drp-popup${isHero ? ' drp-popup-hero' : ''}${isSidebar ? ' drp-popup-modal' : ''}`}>
          <div className="drp-header">
            <button className="drp-nav" onClick={prevMonth}>
              <svg height="14" viewBox="0 0 16 16" width="14" fill="currentColor">
                <path fillRule="evenodd" d="M10.5 14.06L9.97 13.53 5.15 8.71a1 1 0 010-1.42L9.97 2.47 10.5 1.94 11.56 3l-.53.53L6.56 8l4.47 4.47.53.53L10.5 14.06z"/>
              </svg>
            </button>
            <span className="drp-month-label">{MONTHS_RU[viewMonth]} {viewYear}</span>
            <button className="drp-nav" onClick={nextMonth}>
              <svg height="14" viewBox="0 0 16 16" width="14" fill="currentColor">
                <path fillRule="evenodd" d="M5.5 1.94l.53.53 4.82 4.82a1 1 0 010 1.42L6.03 13.53 5.5 14.06 4.44 13l.53-.53L9.44 8 4.97 3.53 4.44 3 5.5 1.94z"/>
              </svg>
            </button>
          </div>

          <div className="drp-grid">
            {DAYS_RU.map(d => (
              <div key={d} className="drp-day-name">{d}</div>
            ))}
            {days.map(({ date, outside }, i) => {
              const isStart     = !outside && effStart  && sameDay(date, effStart);
              const isEnd       = !outside && effEnd    && sameDay(date, effEnd);
              const isInRange   = !outside && effStart && effEnd && date > effStart && date < effEnd;
              const isTodayDay  = !outside && sameDay(date, today);
              const isDisabled  = date < minD;

              let cls = 'drp-day';
              if (outside)   cls += ' drp-out';
              if (isDisabled && !outside) cls += ' drp-disabled';
              if (isInRange) cls += ' drp-range';
              if (isStart)   cls += ' drp-start';
              if (isEnd)     cls += ' drp-end';
              if (isTodayDay && !isStart && !isEnd) cls += ' drp-today';

              return (
                <div
                  key={i}
                  className={cls}
                  onMouseEnter={() => picking && !outside && date >= minD && setHoverDate(date)}
                  onMouseLeave={() => picking && setHoverDate(null)}
                  onClick={() => !outside && !isDisabled && handleDayClick(date)}
                >
                  <span>{date.getDate()}</span>
                </div>
              );
            })}
          </div>

          <div className="drp-footer">
            {picking
              ? <span className="drp-hint"><i className="ph-fill ph-arrow-right" /> Выберите дату возврата</span>
              : hasRange()
                ? <span className="drp-hint drp-hint-ok"><i className="ph-fill ph-check-circle" /> {fmtShort(from)} — {fmtShort(to)}</span>
                : <span className="drp-hint">Кликните на дату получения</span>
            }
          </div>
        </div>
        </>
        );
        return isSidebar ? createPortal(node, document.body) : node;
      })()}
    </div>
  );
}
