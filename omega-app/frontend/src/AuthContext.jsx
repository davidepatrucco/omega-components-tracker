import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { 
      // Controlla se il token è ancora valido (15 minuti + buffer)
      const savedToken = localStorage.getItem('auth_token');
      const tokenExpiry = localStorage.getItem('auth_token_expiry');
      
      if (savedToken && tokenExpiry) {
        const now = Date.now();
        const expiry = parseInt(tokenExpiry);
        
        if (now < expiry) {
          return savedToken;
        } else {
          // Token scaduto, rimuovi tutto tranne il refresh token (è nel cookie)
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_token_expiry');
          localStorage.removeItem('auth_user');
          return null;
        }
      }
      
      return null;
    } catch(e){ 
      return null; 
    }
  });
  
  const [user, setUser] = useState(() => {
    try { 
      // Solo se il token è valido, carica anche l'utente
      if (token) {
        return JSON.parse(localStorage.getItem('auth_user')) || null; 
      }
      return null;
    } catch(e){ 
      return null; 
    }
  });

  useEffect(() => {
    try {
      if (token) {
        localStorage.setItem('auth_token', token);
        // Imposta scadenza a 15 minuti dal momento del salvataggio
        const expiry = Date.now() + 15 * 60 * 1000; // 15 minuti
        localStorage.setItem('auth_token_expiry', expiry.toString());
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_expiry');
        // Non rimuovere il refresh token dal localStorage perché è gestito come cookie HttpOnly
      }
    } catch (e) {}
  }, [token]);

  useEffect(() => {
    try {
      if (user && token) {
        localStorage.setItem('auth_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('auth_user');
      }
    } catch (e) {}
  }, [user, token]);

  const login = (accessToken, userData, refreshToken = null, sessionExpiresAt = null) => { 
    setToken(accessToken); 
    setUser(userData || null);
    
    // Salva la scadenza della sessione (refresh token) se fornita
    if (sessionExpiresAt) {
      try {
        localStorage.setItem('auth_session_expiry', sessionExpiresAt.toString());
      } catch (e) {}
    }
    
    // Il refresh token è gestito automaticamente come cookie HttpOnly dal backend
    // Non serve salvarlo nel localStorage
    console.log('✅ Login completato, refresh token gestito via cookie');
  };
  
  const logout = () => { 
    setToken(null); 
    setUser(null);
    // Pulizia completa di tutti i token (il refresh token cookie sarà pulito dalla chiamata logout API)
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_token_expiry');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_session_expiry'); // Rimuovi anche la scadenza sessione
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(){ 
  return useContext(AuthContext); 
}
