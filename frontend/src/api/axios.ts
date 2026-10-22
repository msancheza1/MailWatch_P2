import axios from 'axios';
export const api = axios.create({ baseURL: 'http://localhost:3000' });
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('mailwatch-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      sessionStorage.removeItem('mailwatch-token');
      window.dispatchEvent(new Event('auth-expired'));
    }
    return Promise.reject(error);
  },
);
