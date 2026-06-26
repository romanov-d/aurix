import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ChatBox from './ChatBox.jsx';
import * as Chat from '../api/chat.js';

// Вкладка «Чат» в ЛК. Поддерживает несколько диалогов: общий «Поддержка»
// + отдельные по машинам (создаются кнопкой на карточке авто, ?ct=<id>).
export default function AccountChat() {
  const location = useLocation();
  const [threads, setThreads] = useState(null); // null = загрузка
  const [activeId, setActiveId] = useState(null);
  const [err, setErr] = useState('');
  const wantThread = new URLSearchParams(location.search).get('ct');

  const load = async () => {
    try {
      let list = await Chat.myThreads();
      if (list.length === 0) { await Chat.openThread({}); list = await Chat.myThreads(); }
      setThreads(list);
      setActiveId((prev) => {
        if (wantThread && list.some((t) => String(t.id) === String(wantThread))) return Number(wantThread);
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id;
      });
    } catch (e) { setErr(e.message || 'Не удалось открыть чат'); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [wantThread]);

  if (err) return <div className="acc-block"><div className="acc-block-head"><h3>Чат с менеджером</h3></div><div style={{ padding: 20, color: '#ff8a8a' }}>{err}</div></div>;
  if (!threads) return <div className="acc-block"><div className="acc-block-head"><h3>Чат с менеджером</h3></div><div style={{ padding: 20, color: '#888' }}>Загрузка…</div></div>;

  const active = threads.find((t) => t.id === activeId) || threads[0];

  return (
    <div className="acc-block chat-block">
      <div className="acc-block-head"><h3>Чат с менеджером</h3></div>

      {threads.length > 1 && (
        <div className="chat-thread-tabs">
          {threads.map((t) => (
            <button key={t.id} className={`ctt ${t.id === active.id ? 'active' : ''}`} onClick={() => setActiveId(t.id)}>
              {t.car_name ? <><i className="ph-fill ph-car" /> {t.car_name}</> : <>Поддержка</>}
              {t.unread > 0 && <span className="ctt-badge">{t.unread}</span>}
            </button>
          ))}
        </div>
      )}

      {active && (
        <ChatBox
          key={active.id}
          threadId={active.id}
          selfRole="user"
          streamUrl={Chat.clientStreamUrl}
          loadMessages={(after) => Chat.threadMessages(active.id, after)}
          onSend={(body, attachment) => Chat.sendMessage(active.id, { body, attachment })}
          onRead={() => Chat.markThreadRead(active.id)}
          disabled={active.status === 'closed'}
        />
      )}
    </div>
  );
}
