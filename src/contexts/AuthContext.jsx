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
    async login(body) { const { user } = await Auth.login(body); setUser(user); return user; },
    async register(body) { const { user } = await Auth.register(body); setUser(user); return user; },
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
