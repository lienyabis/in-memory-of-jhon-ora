import axios from 'axios'

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const TOKEN_KEY = 'jhon_token'

// Same contract as memorial-all-in-one: empty base = same-origin /api/...
const api = axios.create({ baseURL: API_BASE || '' })

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY)
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

export default api

// Backend returns "/api/photos/xxx" or "/api/avatars/xxx".
// In split dev (Vite :5173 + PHP :8000) prefix with VITE_API_URL.
export function fileUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/api/') || path.startsWith('/uploads/')) return `${API_BASE}${path}`
  return path
}

export function apiError(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error || err?.message || fallback
}
