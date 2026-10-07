import axios from 'axios';
// In production (Render) set VITE_API_URL to the backend URL,
// e.g. https://jhon-ora-memorial.onrender.com
// Local dev: empty baseURL so Vite proxy handles /api + /uploads.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('jhon_token');
  if (t) cfg.headers.Authorization = 'Bearer ' + t;
  return cfg;
});
export const apiBase = import.meta.env.VITE_API_URL || '';
// Resolve an image path (/uploads/...) against the API host in production.
export const imgUrl = src => {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src;
  return (import.meta.env.VITE_API_URL || '') + src;
};
export default api;

