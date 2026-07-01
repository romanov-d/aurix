import { useState, useEffect, useCallback } from 'react';
import ChatBox from './ChatBox.jsx';
import * as Chat from '../api/chat.js';

// Инбокс менеджера: слева список всех диалогов, справа переписка.
export default function AdminChat({ onOpenClient, openUserId, onOpened }) {
  const [threads, setThreads] = useState([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [active, setActive] = useState(null);
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');

  const loadThreads = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.q = search.trim();
      setThreads(await Chat.adminThreads(params));
    } catch { /* тихо */ }
    finally { setListLoaded(true); }
  }, [statusFilter, search]);

  useEffect(() => {
    loadThreads();
    const t = setInterval(loadThreads, 5000);
    return () => clearInterval(t);
  }, [loadThreads]);

  // Менеджер сам инициирует диалог: из списка пользователей пришёл openUserId —
  // создаём/находим тред этого клиента, открываем его и переключаемся на «Открытые».
  useEffect(() => {
    if (!openUserId) return;
    let alive = true;
    (async () => {
      try {
        const th = await Chat.adminOpenThread(openUserId);
        if (!alive) return;
        setStatusFilter('open');
        setSearch('');
        setActive(th);
        loadThreads();
      } catch (e) {
        alert(e.message || 'Не удалось открыть диалог');
      } finally {
        onOpened?.();
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openUserId]);

  const openThread = async (th) => {
    setActive(th);
    try { await Chat.adminMarkRead(th.id); loadThreads(); } catch { /* */ }
  };

  const toggleStatus = async () => {
    if (!active) return;
    const next = active.status === 'closed' ? 'open' : 'closed';
    try {
      const updated = await Chat.adminPatchThread(active.id, { status: next });
      setActive({ ...active, ...updated });
      loadThreads();
    } catch (e) { alert(e.message || 'Ошибка'); }
  };

  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }); }
    catch { return ''; }
  };

  return (
    <div className="admin-chat">
      <div className="admin-chat-list">
        <div className="admin-chat-filters">
          <input placeholder="Поиск: клиент / машина…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="open">Открытые</option>
            <option value="closed">Закрытые</option>
            <option value="all">Все</option>
          </select>
        </div>
        {!listLoaded && [0, 1, 2, 3].map((i) => (
          <div key={`sk${i}`} className="admin-chat-item" style={{ pointerEvents: 'none' }}>
            <div className="sk sk-line" style={{ width: '55%', height: 13 }} />
            <div className="sk sk-line" style={{ width: '82%', height: 11, marginTop: 6 }} />
            <div className="sk sk-line" style={{ width: '35%', height: 10, marginTop: 6 }} />
          </div>
        ))}
        {listLoaded && threads.length === 0 && <div className="admin-chat-empty">Диалогов нет</div>}
        {listLoaded && threads.map((t) => (
          <button key={t.id} className={`admin-chat-item ${active?.id === t.id ? 'active' : ''}`} onClick={() => openThread(t)}>
            <div className="aci-top">
              <span className="aci-name">{t.user_name || 'Клиент'}</span>
              {t.unread > 0 && <span className="aci-badge">{t.unread}</span>}
            </div>
            {t.car_name && <span className="aci-car"><i className="ph-fill ph-car" /> {t.car_name}</span>}
            <span className="aci-last">{t.last_body || '—'}</span>
            <span className="aci-time">{fmt(t.last_message_at)}{t.status === 'closed' ? ' · закрыт' : ''}</span>
          </button>
        ))}
      </div>

      <div className="admin-chat-main">
        {!active ? (
          <div className="admin-chat-placeholder">Выберите диалог слева</div>
        ) : (
          <>
            <div className="admin-chat-header">
              <div className="ach-who">
                <button type="button" className="ach-name-btn" onClick={() => onOpenClient?.(active.user_id)} title="Открыть профиль клиента">
                  {active.user_name} <i className="ph ph-arrow-square-out" />
                </button>
                <span className="ach-contact">{active.user_phone || active.user_email || ''}</span>
              </div>
              {active.car_name && <span className="ach-car"><i className="ph-fill ph-car" /> {active.car_name}</span>}
              <button className="btn btn-sm" onClick={toggleStatus}>
                {active.status === 'closed' ? 'Переоткрыть' : 'Закрыть'}
              </button>
            </div>
            <ChatBox
              key={active.id}
              threadId={active.id}
              selfRole="admin"
              streamUrl={Chat.adminStreamUrl}
              loadMessages={(after) => Chat.adminThreadMessages(active.id, after).then((r) => r.messages)}
              onSend={(body, attachment) => Chat.adminSend(active.id, { body, attachment })}
              onRead={() => Chat.adminMarkRead(active.id)}
              disabled={active.status === 'closed'}
            />
          </>
        )}
      </div>
    </div>
  );
}
