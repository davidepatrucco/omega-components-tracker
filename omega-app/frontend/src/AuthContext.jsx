import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { 
      // Controlla se il token è ancora valido (60 giorni)
      const savedToken = localStorage.getItem('auth_token');
      const tokenExpiry = localStorage.getItem('auth_token_expiry');
      
      if (savedToken && tokenExpiry) {
        const now = Date.now();
        const expiry = parseInt(tokenExpiry);
        
        if (now < expiry) {
          return savedToken;
        } else {
          // Token scaduto, rimuovi tutto
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_token_expiry');
          localStorage.removeItem('auth_refresh_token');
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
        // Imposta scadenza a 60 giorni dal momento del salvataggio
        const expiry = Date.now() + 60 * 24 * 60 * 60 * 1000;
        localStorage.setItem('auth_token_expiry', expiry.toString());
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_expiry');
        localStorage.removeItem('auth_refresh_token');
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

  const login = (accessToken, userData, refreshToken = null) => { 
    setToken(accessToken); 
    setUser(userData || null);
    
    // Salva anche il refresh token se presente
    if (refreshToken) {
      try {
        localStorage.setItem('auth_refresh_token', refreshToken);
        console.log('✅ Refresh token salvato per la web app');
      } catch (e) {
        console.error('❌ Errore salvataggio refresh token:', e);
      }
    }
  };
  
  const logout = () => { 
    setToken(null); 
    setUser(null);
    // Pulizia completa di tutti i token
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_token_expiry');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_user');
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
