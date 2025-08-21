import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getComponents = (params = {}) => {
  return api.get('/components', { params });
};

export const getStats = () => {
  return api.get('/getStats');
};

export default api;