import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import api, { TOKEN_KEY } from '../lib/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY)
    if (!t) { setUser(null); setReady(true); return null }
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data.user)
      return data.user
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
      return null
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    return data.user
  }

  const signup = async (payload) => {
    const { data } = await api.post('/api/auth/signup', payload)
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  const isStaff = user && (user.role === 'admin' || user.role === 'superadmin')

  return (
    <AuthCtx.Provider value={{ user, setUser, ready, refresh, login, signup, logout, isStaff }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
