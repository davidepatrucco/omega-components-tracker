import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '', // Use VITE_API_URL for production, fallback to relative URLs for development
  withCredentials: true, // Include cookies for authentication
});

// Funzione per tentare il refresh del token
const tryRefreshToken = async () => {
  try {
    console.log('🔄 Tentativo refresh token...');
    // Il refresh token è in un cookie HttpOnly, non serve inviarlo nel body
    const response = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      {}, // Body vuoto - il refresh token è nel cookie
      { withCredentials: true }
    );

    if (response.data?.accessToken) {
      // Salva il nuovo access token
      localStorage.setItem('auth_token', response.data.accessToken);
      // Aggiorna la scadenza (15 minuti per l'access token)
      const expiry = Date.now() + 15 * 60 * 1000; // 15 minuti
      localStorage.setItem('auth_token_expiry', expiry.toString());
      
      // Salva anche la nuova scadenza della sessione se fornita
      if (response.data?.sessionExpiresAt) {
        localStorage.setItem('auth_session_expiry', response.data.sessionExpiresAt.toString());
      }
      
      console.log('✅ Token refreshato con successo');
      return response.data.accessToken;
    }

    return null;
  } catch (error) {
    console.error('❌ Errore refresh token:', error);
    return null;
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors with automatic refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('⚠️ Token scaduto, tentativo refresh...');
      const newToken = await tryRefreshToken();
      
      if (newToken) {
        // Refresh riuscito, riprova la richiesta originale con il nuovo token
        console.log('🔄 Refresh riuscito, riprovo la richiesta...');
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        // Refresh fallito, fai logout completo
        console.log('❌ Refresh fallito, logout necessario');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_expiry');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
      }
    }
    
    // Add userMessage to error for consistent error handling
    if (error.response?.data?.userMessage) {
      error.userMessage = error.response.data.userMessage;
    } else if (error.response?.data?.error) {
      error.userMessage = error.response.data.error;
    } else {
      error.userMessage = error.message || 'Errore di rete';
    }
    
    return Promise.reject(error);
  }
);

export { api };
