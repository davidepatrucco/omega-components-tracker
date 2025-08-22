// Configuration for the mobile app
export const CONFIG = {
  // API Configuration
  API: {
    // Default to localhost for development
    // In production, this should be set to the actual backend URL
    BASE_URL: __DEV__ ? 'http://localhost:4000' : 'https://api.omega.intellitude.com',
    
    // Timeout for API requests (in milliseconds)
    TIMEOUT: 10000,
  },

  // App Configuration
  APP: {
    NAME: 'Omega Mobile',
    VERSION: '1.0.0',
  },

  // Barcode Configuration
  BARCODE: {
    // Supported barcode types
    TYPES: ['code128'],
    
    // Auto-transition target state
    TARGET_STATUS: '3',
    TARGET_STATUS_LABEL: '3 - Costruito',
    
    // Source states that allow auto-transition
    ALLOWED_SOURCE_STATES: ['1', '2', '2-ext'],
  },

  // UI Configuration
  UI: {
    // Theme colors matching web app
    COLORS: {
      PRIMARY: '#1677ff',
      SUCCESS: '#52c41a',
      WARNING: '#fa8c16',
      ERROR: '#f5222d',
      TEXT: '#262626',
      TEXT_SECONDARY: '#8c8c8c',
      BACKGROUND: '#f6f8fb',
      WHITE: '#ffffff',
    },
  },
};

// Helper function to get API base URL
export const getApiBaseUrl = () => {
  return CONFIG.API.BASE_URL;
};

// Helper function to check if a status allows auto-transition
export const canAutoTransition = (currentStatus) => {
  return CONFIG.BARCODE.ALLOWED_SOURCE_STATES.includes(currentStatus);
};

export default CONFIG;