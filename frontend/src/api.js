import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config && err.config.url && err.config.url.includes('/auth/login');
    const isPasswordResetRequest = err.config && err.config.url && err.config.url.includes('/auth/set-initial-password');

    if (err.response && err.response.status === 401 && !isLoginRequest && !isPasswordResetRequest) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;