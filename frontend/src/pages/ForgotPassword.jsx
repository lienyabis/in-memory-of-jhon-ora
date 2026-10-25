import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { apiError } from '../lib/api'
import useReveal from '../lib/useReveal'

// Forgot password — asks for the account email and the backend sends a
// one-time reset link ({FRONTEND_URL}/reset-password?token=...).
// The API answers with the same generic message either way, so accounts
// cannot be probed through this form.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  useReveal('')

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setOk('')
    if (!email.trim()) { setErr('Please enter your email address.'); return }
    setBusy(true)
    try {
      const { data } = await api.post('/api/auth/forgot', { email: email.trim() })
      setOk(data.message)
      setEmail('')
    } catch (ex) { setErr(apiError(ex, 'Could not send the reset link. Please try again.')) }
    finally { setBusy(false) }
  }

  return (
    <div className="wrap">
      <form className="auth card reveal" onSubmit={submit}>
        <div style={{ textAlign: 'center', fontSize: 40 }}>🔑</div>
        <h2 style={{ textAlign: 'center', color: '#0f1f3d', margin: '6px 0' }}>Forgot Password</h2>
        <p style={{ fontFamily: 'Arial', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
          Enter the email of your account and we will email you a link to reset your password.
        </p>
        {err && <div className="err">{err}</div>}
        {ok && <div className="ok">{ok}</div>}
        {!ok && (
          <>
            <label>Active email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            <button className="btn gold" style={{ width: '100%', marginTop: 10 }} disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
        <p style={{ fontFamily: 'Arial', fontSize: 13, textAlign: 'center' }}>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}