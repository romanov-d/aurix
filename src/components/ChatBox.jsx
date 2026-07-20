import { useState, useEffect, useRef } from 'react';
import { fileToCompressedDataUrl, dataUrlBytes } from '../api/image.js';

// Переиспользуемая лента чата: сообщения + ввод + вложения.
// Реалтайм: SSE (мгновенно) + страховочный polling (12с) на случай,
// если поток заблокирован прокси.
// Пропсы:
//   threadId     — id диалога
//   selfRole     — 'user' | 'admin'
//   loadMessages — async (afterId) => массив сообщений
//   onSend       — async (text, attachment|null) => созданное сообщение
//   onRead       — опц. колбэк «прочитано»
//   streamUrl    — URL SSE-потока (для EventSource)
//   disabled     — заблокировать ввод (закрытый диалог)

export default function ChatBox({ threadId, selfRole, loadMessages, onSend, onRead, streamUrl, disabled }) {
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attach, setAttach] = useState(null); // { url, name, type, size }
  const lastId = useRef(0);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const pushMsg = (m) => {
    if (!m?.id || m.id <= lastId.current) return;
    lastId.current = m.id;
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  };

  // Догрузка новых сообщений (после lastId)
  const poll = async () => {
    try {
      const fresh = await loadMessages(lastId.current);
      if (!Array.isArray(fresh) || !fresh.length) return;
      fresh.forEach(pushMsg);
      onRead?.();
    } catch { /* следующий тик попробует снова */ }
  };

  useEffect(() => {
    setMessages([]);
    lastId.current = 0;
    setLoaded(false);
    if (!threadId) return;
    let alive = true;

    // Первичная загрузка — снимает скелетон даже если сообщений нет
    (async () => {
      try {
        const fresh = await loadMessages(0);
        if (alive && Array.isArray(fresh) && fresh.length) { fresh.forEach(pushMsg); onRead?.(); }
      } catch { /* */ }
      finally { if (alive) setLoaded(true); }
    })();
    const timer = setInterval(() => alive && poll(), 12000); // страховка

    // SSE — мгновенная доставка
    let es;
    if (streamUrl && typeof EventSource !== 'undefined') {
      es = new EventSource(streamUrl, { withCredentials: true });
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'message' && String(data.thread_id) === String(threadId)) {
            pushMsg(data.message);
            onRead?.();
          }
        } catch { /* */ }
      };
      es.onerror = () => { /* EventSource сам переподключится */ };
    }

    return () => { alive = false; clearInterval(timer); es?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, streamUrl]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = await fileToCompressedDataUrl(file, { maxSize: 2000, quality: 0.82 });
    if (dataUrlBytes(url) > 8 * 1024 * 1024) { alert('Файл слишком большой. Пришлите вложение поменьше.'); return; }
    setAttach({ url, name: file.name, type: file.type, size: dataUrlBytes(url) });
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !attach) || sending || disabled) return;
    setSending(true);
    try {
      const msg = await onSend(body, attach);
      setText('');
      setAttach(null);
      pushMsg(msg);
    } catch (err) {
      alert(err.message || 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const fmtTime = (iso) => {
    try { return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }); }
    catch { return ''; }
  };

  return (
    <div className="chatbox">
      <div className="chat-msgs">
        {!loaded ? (
          <div className="chat-skeleton">
            {[['theirs', 150], ['mine', 110], ['theirs', 210], ['mine', 90], ['theirs', 170]].map(([side, w], i) => (
              <div key={i} className={`chat-msg ${side}`}>
                <div className="sk chat-bubble-sk" style={{ width: w }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">Сообщений пока нет. Напишите первым — менеджер ответит.</div>
        ) : null}
        {loaded && messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.sender_role === selfRole ? 'mine' : 'theirs'}`}>
            <div className="chat-bubble">
              {m.body && <span className="chat-text">{m.body}</span>}
              {m.attachment_url && (m.attachment_type || '').startsWith('image/') ? (
                <a href={m.attachment_url} target="_blank" rel="noreferrer" className="chat-img-link">
                  <img src={m.attachment_url} alt={m.attachment_name || ''} className="chat-img" />
                </a>
              ) : m.attachment_url ? (
                <a href={m.attachment_url} target="_blank" rel="noreferrer" download={m.attachment_name} className="chat-att">
                  <i className="ph-fill ph-paperclip" /> {m.attachment_name || 'файл'}
                </a>
              ) : null}
            </div>
            <div className="chat-time">{fmtTime(m.created_at)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {attach && (
        <div className="chat-attach-preview">
          <i className="ph-fill ph-paperclip" />
          <span className="cap-name">{attach.name}</span>
          <button type="button" onClick={() => setAttach(null)} aria-label="Убрать файл">✕</button>
        </div>
      )}

      <form className="chat-input" onSubmit={submit}>
        <input type="file" ref={fileRef} onChange={onFile} accept="image/*,.pdf" style={{ display: 'none' }} />
        <button type="button" className="chat-clip" onClick={() => fileRef.current?.click()} disabled={disabled || sending} aria-label="Прикрепить файл">
          <i className="ph-fill ph-paperclip" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? 'Диалог закрыт' : 'Введите сообщение…'}
          disabled={disabled || sending}
        />
        <button type="submit" disabled={disabled || sending || (!text.trim() && !attach)}>
          {sending ? '…' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}
