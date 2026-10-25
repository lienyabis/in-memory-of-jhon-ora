import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api, { apiError } from '../lib/api'
import useReveal from '../lib/useReveal'

// Reset password — opened from the emailed link
// (/reset-password?token=...). Confirms the new password twice and
// hands token + password to POST /api/auth/reset.
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const nav = useNavigate()
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  useReveal('')

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setOk('')
    if (pwd.length < 6) { setErr('Password must be at least 6 characters.'); return }
    if (pwd !== pwd2) { setErr('Both passwords do not match.'); return }
    setBusy(true)
    try {
      const { data } = await api.post('/api/auth/reset', { token, password: pwd })
      setOk(data.message)
      setPwd(''); setPwd2('')
    } catch (ex) { setErr(apiError(ex, 'Could not reset the password.')) }
    finally { setBusy(false) }
  }

  if (!token) {
    return (
      <div className="wrap">
        <div className="auth card reveal">
          <div style={{ textAlign: 'center', fontSize: 40 }}>🔑</div>
          <h2 style={{ textAlign: 'center', color: '#0f1f3d', margin: '6px 0' }}>Invalid Reset Link</h2>
          <div className="err">This reset link is invalid or incomplete. Please request a new one.</div>
          <p style={{ fontFamily: 'Arial', fontSize: 13, textAlign: 'center' }}>
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <form className="auth card reveal" onSubmit={submit}>
        <div style={{ textAlign: 'center', fontSize: 40 }}>🕊️</div>
        <h2 style={{ textAlign: 'center', color: '#0f1f3d', margin: '6px 0' }}>Choose a New Password</h2>
        <p style={{ fontFamily: 'Arial', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
          Enter your new password below. The link can be used once.
        </p>
        {err && <div className="err">{err}</div>}
        {ok && <div className="ok">{ok}</div>}
        {!ok && (
          <>
            <label>New password (min 6 characters)</label>
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
            <label>Confirm new password</label>
            <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} autoComplete="new-password" />
            <button className="btn gold" style={{ width: '100%', marginTop: 10 }} disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </>
        )}
        {ok && (
          <button type="button" className="btn gold" style={{ width: '100%', marginTop: 10 }} onClick={() => nav('/login')}>
            Go to Sign In
          </button>
        )}
        <p style={{ fontFamily: 'Arial', fontSize: 13, textAlign: 'center' }}>
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </form>
    </div>
  )
}