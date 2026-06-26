import { useState, useEffect } from 'react';
import ChatBox from './ChatBox.jsx';
import * as Chat from '../api/chat.js';

// Вкладка «Чат» в ЛК. Фаза 1 — один общий диалог поддержки (find-or-create).
export default function AccountChat() {
  const [thread, setThread] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    Chat.openThread({})
      .then((t) => { if (alive) setThread(t); })
      .catch((e) => { if (alive) setErr(e.message || 'Не удалось открыть чат'); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="acc-block chat-block">
      <div className="acc-block-head"><h3>Чат с менеджером</h3></div>
      {err ? (
        <div style={{ padding: 20, color: '#ff8a8a' }}>{err}</div>
      ) : !thread ? (
        <div style={{ padding: 20, color: '#888' }}>Загрузка…</div>
      ) : (
        <ChatBox
          threadId={thread.id}
          selfRole="user"
          loadMessages={(after) => Chat.threadMessages(thread.id, after)}
          onSend={(body) => Chat.sendMessage(thread.id, { body })}
          onRead={() => Chat.markThreadRead(thread.id)}
          disabled={thread.status === 'closed'}
        />
      )}
    </div>
  );
}
