import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api';
const AuthCtx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = localStorage.getItem('jhon_token');
    if (!t) { setLoading(false); return; }
    api.get('/api/auth/me').then(r => setUser(r.data.user)).catch(()=>localStorage.removeItem('jhon_token')).finally(()=>setLoading(false));
  }, []);
  const login = async (email, password) => {
    const r = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('jhon_token', r.data.token); setUser(r.data.user); return r.data.user;
  };
  const signup = async (payload) => {
    const r = await api.post('/api/auth/signup', payload);
    localStorage.setItem('jhon_token', r.data.token); setUser(r.data.user); return r.data.user;
  };
  const logout = () => { localStorage.removeItem('jhon_token'); setUser(null); };
  return <AuthCtx.Provider value={{ user, setUser, loading, login, signup, logout }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
