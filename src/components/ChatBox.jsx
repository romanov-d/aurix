import { useState, useEffect, useRef } from 'react';

// Переиспользуемая лента чата: список сообщений + поле ввода.
// Реалтайм фаза 1 — polling каждые 3 сек (только новые сообщения по id).
// Пропсы:
//   threadId     — id диалога (при смене — лента перезагружается)
//   selfRole     — 'user' | 'admin' (для выравнивания пузырей)
//   loadMessages — async (afterId) => массив сообщений
//   onSend       — async (text) => созданное сообщение
//   onRead       — опц. колбэк «отметить прочитанным»
//   disabled     — заблокировать ввод (напр. закрытый диалог)
export default function ChatBox({ threadId, selfRole, loadMessages, onSend, onRead, disabled }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    lastId.current = 0;
    if (!threadId) return;
    let alive = true;
    const poll = async () => {
      try {
        const fresh = await loadMessages(lastId.current);
        if (!alive || !Array.isArray(fresh) || !fresh.length) return;
        lastId.current = fresh[fresh.length - 1].id;
        setMessages((prev) => [...prev, ...fresh]);
        onRead?.();
      } catch { /* тихо — следующий тик попробует снова */ }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    try {
      const msg = await onSend(body);
      setText('');
      if (msg?.id && msg.id > lastId.current) {
        lastId.current = msg.id;
        setMessages((prev) => [...prev, msg]);
      }
    } catch (err) {
      alert(err.message || 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    } catch { return ''; }
  };

  return (
    <div className="chatbox">
      <div className="chat-msgs">
        {messages.length === 0 && (
          <div className="chat-empty">Сообщений пока нет. Напишите первым — менеджер ответит.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.sender_role === selfRole ? 'mine' : 'theirs'}`}>
            <div className="chat-bubble">
              {m.body && <span className="chat-text">{m.body}</span>}
              {m.attachment_url && (
                <a href={m.attachment_url} target="_blank" rel="noreferrer" className="chat-att">
                  <i className="ph-fill ph-paperclip" /> {m.attachment_name || 'файл'}
                </a>
              )}
            </div>
            <div className="chat-time">{fmtTime(m.created_at)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? 'Диалог закрыт' : 'Введите сообщение…'}
          disabled={disabled || sending}
        />
        <button type="submit" disabled={disabled || sending || !text.trim()}>
          {sending ? '…' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}
