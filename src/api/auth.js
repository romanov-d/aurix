import { api } from './client.js';

export const register = (body) => api('/auth/register', { method: 'POST', body });
export const login = (body) => api('/auth/login', { method: 'POST', body });
export const loginVerify = (body) => api('/auth/login-verify', { method: 'POST', body });
export const verifyCode = (body) => api('/auth/verify-code', { method: 'POST', body });
export const resendCode = () => api('/auth/resend-code', { method: 'POST' });
export const logout = () => api('/auth/logout', { method: 'POST' });
export const me = () => api('/me');
