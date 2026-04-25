import axios, { InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  // baseURL: '/api',
  baseURL: import.meta.env.VITE_BASEURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token on every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
