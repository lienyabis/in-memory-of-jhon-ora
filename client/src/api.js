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
// Guard: the SPA rewrite can serve index.html (HTTP 200) for missing /api
// routes when VITE_API_URL is unset. Reject any non-JSON payload so pages
// show an error/empty state instead of crashing with a white screen.
api.interceptors.response.use(
  r => {
    if (r.data === null || typeof r.data !== 'object') {
      return Promise.reject(new Error('Invalid API response — check VITE_API_URL on Render.'));
    }
    return r;
  },
  e => Promise.reject(e)
);
export const apiBase = import.meta.env.VITE_API_URL || '';
// Resolve an image path (/uploads/...) against the API host in production.
// The PHP backend may also return absolute URLs — those pass through.
export const imgUrl = src => {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src;
  return (import.meta.env.VITE_API_URL || '') + src;
};
export default api;

