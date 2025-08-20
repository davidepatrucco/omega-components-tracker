import React, { createContext, useState, useContext } from 'react';
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const login = (t) => setToken(t);
  const logout = () => setToken(null);
  return <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth(){ return useContext(AuthContext); }
