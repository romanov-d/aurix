import { createContext, useContext, useEffect, useState } from 'react';
import * as Auth from '../api/auth.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Auth.me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    // login возвращает { user } (вошёл) ИЛИ { needsCode, email } (нужен 2FA-код)
    async login(body) { const res = await Auth.login(body); if (res.user) setUser(res.user); return res; },
    async loginVerify(body) { const { user } = await Auth.loginVerify(body); setUser(user); return user; },
    async register(body) { const res = await Auth.register(body); if (res.user) setUser(res.user); return res; },
    async verifyEmailCode(code) { const { user } = await Auth.verifyCode({ code }); setUser(user); return user; },
    async resendEmailCode() { return Auth.resendCode(); },
    async forgotPassword(email) { return Auth.forgotPassword({ email }); },
    async resetPassword(body) { const { user } = await Auth.resetPassword(body); setUser(user); return user; },
    async logout() { await Auth.logout(); setUser(null); },
    async refresh() { try { const { user } = await Auth.me(); setUser(user); } catch { setUser(null); } },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
