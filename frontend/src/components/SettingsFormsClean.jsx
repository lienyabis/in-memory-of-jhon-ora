import { useState } from 'react'
import api, { apiError, TOKEN_KEY } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export function PasswordCard() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [st, setSt] = useState({ err: '', ok: '' })

  const submit = async (e) => {
    e.preventDefault()
    setSt({ err: '', ok: '' })
    if (!form.currentPassword || !form.newPassword) { setSt({ err: 'Fill in both password fields.', ok: '' }); return }
    if (form.newPassword.length < 6) { setSt({ err: 'New password must be at least 6 characters.', ok: '' }); return }
    if (form.newPassword !== form.confirmPassword) { setSt({ err: 'New passwords do not match.', ok: '' }); return }
    try {
      const { data } = await api.put('/api/auth/me/password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      setSt({ err: '', ok: data.message || 'Password updated.' })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err2) { setSt({ err: apiError(err2, 'Could not change the password.'), ok: '' }) }
  }

  return (
    <div className="card reveal" style={{ marginBottom: 18 }}>
      <h3>Change password</h3>
      {st.err && <div className="err">{st.err}</div>}
      {st.ok && <div className="ok">{st.ok}</div>}
      <form onSubmit={submit} style={{ maxWidth: 420 }}>
        <label>Current password</label>
        <input type="password" value={form.currentPassword} autoComplete="current-password" onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        <label>New password (min 6 characters)</label>
        <input type="password" value={form.newPassword} autoComplete="new-password" onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        <label>Confirm new password</label>
        <input type="password" value={form.confirmPassword} autoComplete="new-password" onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
        <button className="btn" style={{ marginTop: 8 }}>Update password</button>
      </form>
    </div>
  )
}

export function EmailCard() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ newEmail: '', password: '' })
  const [st, setSt] = useState({ err: '', ok: '' })

  const submit = async (e) => {
    e.preventDefault()
    setSt({ err: '', ok: '' })
    if (!form.newEmail || !form.password) { setSt({ err: 'Enter the new email and your password.', ok: '' }); return }
    try {
      const { data } = await api.put('/api/auth/me/email', { newEmail: form.newEmail, password: form.password })
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
      setUser(data.user)
      setSt({ err: '', ok: data.message || 'Email updated.' })
      setForm({ newEmail: '', password: '' })
    } catch (err2) { setSt({ err: apiError(err2, 'Could not change the email.'), ok: '' }) }
  }

  return (
    <div className="card reveal">
      <h3>Change email</h3>
      {st.err && <div className="err">{st.err}</div>}
      {st.ok && <div className="ok">{st.ok}</div>}
      <form onSubmit={submit} style={{ maxWidth: 420 }}>
        <label>Current email</label>
        <input value={user?.email || ''} disabled />
        <label>New email</label>
        <input type="email" value={form.newEmail} placeholder="you@email.com" onChange={(e) => setForm({ ...form, newEmail: e.target.value })} />
        <label>Confirm with your password</label>
        <input type="password" value={form.password} autoComplete="current-password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn" style={{ marginTop: 8 }}>Update email</button>
      </form>
      <div className="alert" style={{ marginTop: 10 }}>We will keep sending anniversary notices to the new address.</div>
    </div>
  )
}
