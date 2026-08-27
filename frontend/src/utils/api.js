import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://api.kingcreativestudio.my.id/ram-berkah-sawit';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ram_sawit_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear storage if on protected page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('ram_sawit_token');
        localStorage.removeItem('ram_sawit_user');
      }
    }
    return Promise.reject(error);
  }
);
