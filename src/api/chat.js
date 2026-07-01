import { api } from './client.js';

// ─── Клиент (ЛК) ───
export const myThreads      = () => api('/chat/threads');
export const openThread     = (body = {}) => api('/chat/threads', { method: 'POST', body });
export const threadMessages = (id, after = 0) => api(`/chat/threads/${id}/messages?after=${after}`);
export const sendMessage    = (id, body) => api(`/chat/threads/${id}/messages`, { method: 'POST', body });
export const markThreadRead = (id) => api(`/chat/threads/${id}/read`, { method: 'POST' });
export const myUnread       = () => api('/chat/unread-count');

export const clientStreamUrl = '/api/chat/stream';

// ─── Админ / менеджер ───
export const adminThreads        = (params = {}) => api(`/admin/chat/threads?${new URLSearchParams(params)}`);
export const adminOpenThread     = (user_id) => api('/admin/chat/threads', { method: 'POST', body: { user_id } });
export const adminThreadMessages = (id, after = 0) => api(`/admin/chat/threads/${id}/messages?after=${after}`);
export const adminSend           = (id, body) => api(`/admin/chat/threads/${id}/messages`, { method: 'POST', body });
export const adminMarkRead       = (id) => api(`/admin/chat/threads/${id}/read`, { method: 'POST' });
export const adminPatchThread    = (id, body) => api(`/admin/chat/threads/${id}`, { method: 'PATCH', body });
export const adminUnread         = () => api('/admin/chat/unread-count');
export const adminStreamUrl      = '/api/admin/chat/stream';
