import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:4000', // Default for development - should be configurable
  withCredentials: false, // Mobile doesn't support cookies, we'll use headers
});

// Mobile token storage utilities
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const tokenStorage = {
  async setToken(token) {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  },
  
  async getToken() {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },
  
  async removeToken() {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
  
  async setUser(user) {
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
  },
  
  async getUser() {
    const userStr = await SecureStore.getItemAsync(AUTH_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },
  
  async removeUser() {
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getToken();
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
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await tokenStorage.removeToken();
      await tokenStorage.removeUser();
      // In mobile app, we'll handle navigation in the component
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

// API functions
export const authAPI = {
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    const { accessToken, user } = response.data;
    
    // Store token and user in secure storage
    await tokenStorage.setToken(accessToken);
    await tokenStorage.setUser(user);
    
    return { accessToken, user };
  },
  
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      await tokenStorage.removeToken();
      await tokenStorage.removeUser();
    }
  }
};

export const componentsAPI = {
  async searchByBarcode(barcode) {
    const response = await api.get('/components', { params: { barcode } });
    return response.data;
  },
  
  async getById(id) {
    const response = await api.get(`/components/${id}`);
    return response.data;
  }
};

export const statusAPI = {
  async changeStatus(componentId, to, note, ddtInfo = null) {
    const response = await api.post('/changestatus', {
      componentId,
      to,
      note,
      ...(ddtInfo && { ddtNumber: ddtInfo.number, ddtDate: ddtInfo.date })
    });
    return response.data;
  }
};