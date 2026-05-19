import { api } from './client.js';

export const register = (body) => api('/auth/register', { method: 'POST', body });
export const login = (body) => api('/auth/login', { method: 'POST', body });
export const logout = () => api('/auth/logout', { method: 'POST' });
export const me = () => api('/me');
