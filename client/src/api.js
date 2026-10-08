import axios from 'axios';
// Production (Render): set VITE_API_URL to the PHP backend URL,
// e.g. https://your-backend.infinityfreeapp.com
// Local dev: empty baseURL so Vite proxy forwards /api + /uploads to PHP.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('jhon_token');
  if (t) cfg.headers.Authorization = 'Bearer ' + t;
  return cfg;
});
export const apiBase = import.meta.env.VITE_API_URL || '';
// Resolve an image path (/uploads/...) against the API host in production.
// The PHP backend may also return absolute URLs — those pass through.
export const imgUrl = src => {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src;
  return (import.meta.env.VITE_API_URL || '') + src;
};
export default api;

