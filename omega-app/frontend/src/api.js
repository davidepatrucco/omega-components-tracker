import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '', // Use relative URLs since we have Vite proxy
  withCredentials: true, // Include cookies for authentication
});

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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    
    // Add userMessage to error for consistent error handling
    if (error.response?.data?.error) {
      error.userMessage = error.response.data.error;
    } else {
      error.userMessage = error.message || 'Errore di rete';
    }
    
    return Promise.reject(error);
  }
);

export { api };
