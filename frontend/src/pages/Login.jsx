import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiError } from '../lib/api'
import useReveal from '../lib/useReveal'

// Sign-in — exact strings/structure from the compiled build.
export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  useReveal('')

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      const u = await login(email, password)
      nav(u.role === 'guest' ? '/memories' : '/dashboard')
    } catch (ex) { setErr(apiError(ex, 'Login failed')) }
  }

  return (
    <div className="wrap">
      <form className="auth card reveal" onSubmit={submit}>
        <div style={{ textAlign: 'center', fontSize: 40 }}>🕊️</div>
        <h2 style={{ textAlign: 'center', color: '#0f1f3d', margin: '6px 0' }}>Welcome Back</h2>
        <p style={{ fontFamily: 'Arial', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
          Sign in to share memories of John Paul Ora
        </p>
        {err && <div className="err">{err}</div>}
        <label>Active email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={{ textAlign: 'right', marginTop: -2 }}>
          <Link to="/forgot-password" style={{ fontFamily: 'Arial', fontSize: 13 }}>Forgot password?</Link>
        </div>
        <button className="btn gold" style={{ width: '100%', marginTop: 10 }}>Sign In</button>
        <p style={{ fontFamily: 'Arial', fontSize: 13, textAlign: 'center' }}>
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  )
}
