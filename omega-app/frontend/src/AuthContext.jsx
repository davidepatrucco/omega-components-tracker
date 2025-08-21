import React, { createContext, useState, useContext, useEffect } from 'react';
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('auth_token') || null; } catch(e){ return null; }
  });
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')) || null; } catch(e){ return null; }
  });

  useEffect(() => {
    try {
      if (token) localStorage.setItem('auth_token', token); else localStorage.removeItem('auth_token');
    } catch (e) {}
  }, [token]);

  useEffect(() => {
    try {
      if (user) localStorage.setItem('auth_user', JSON.stringify(user)); else localStorage.removeItem('auth_user');
    } catch (e) {}
  }, [user]);

  const login = (t, u) => { setToken(t); setUser(u || null); };
  const logout = () => { setToken(null); setUser(null); };

  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth(){ return useContext(AuthContext); }
