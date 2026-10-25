import { useCallback, useEffect, useState } from 'react'
import api, { apiError } from '../lib/api'

export function useDashboard() {
  const [stats, setStats] = useState(null)
  const [comments, setComments] = useState([])
  const [users, setUsers] = useState([])
  const [opts, setOpts] = useState(null)
  const [settings, setSettings] = useState({ deathMonth: 9, deathDay: 29, siteUrl: '' })
  const [log, setLog] = useState([])
  const [notice, setNotice] = useState('')
  const [err, setErr] = useState('')

  const reload = useCallback(async () => {
    try {
      const [s, c, u, o, st, l] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/comments'),
        api.get('/api/admin/users'),
        api.get('/api/admin/options'),
        api.get('/api/admin/settings'),
        api.get('/api/admin/notifications'),
      ])
      setStats(s.data); setComments(c.data); setUsers(u.data)
      setOpts(o.data); setSettings(st.data); setLog(l.data)
    } catch (e) { setErr(apiError(e)) }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { stats, comments, setComments, users, setUsers, opts, setOpts, settings, setSettings, log, notice, setNotice, err, setErr, reload }
}
