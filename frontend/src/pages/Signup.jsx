import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { apiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import useReveal from '../lib/useReveal'

// Sign-up — exact strings/structure/order from the compiled build.
export default function Signup() {
  const { signup } = useAuth()
  const nav = useNavigate()
  const [opts, setOpts] = useState({ relations: ['friend', 'family', 'batchmate', 'relatives'], batchLevels: ['College', 'Highschool', 'Elementary', 'Others'] })
  const [form, setForm] = useState({ name: '', email: '', password: '', relation: '', batchLevel: '' })
  const [err, setErr] = useState('')
  useReveal(JSON.stringify(opts))

  useEffect(() => {
    api.get('/api/auth/options').then(({ data }) => setOpts(data)).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      const u = await signup(form)
      nav(u.role === 'guest' ? '/memories' : '/dashboard')
    } catch (ex) { setErr(apiError(ex, 'Signup failed')) }
  }

  const isBatch = (form.relation || '').toLowerCase() === 'batchmate'
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="wrap">
      <form className="auth card reveal" onSubmit={submit}>
        <div style={{ textAlign: 'center', fontSize: 40 }}>🕊️</div>
        <h2 style={{ textAlign: 'center', color: '#0f1f3d', margin: '6px 0' }}>Sign Up to Remember John</h2>
        <p style={{ fontFamily: 'Arial', fontSize: 13, color: '#475569' }}>
          Use your active email so you'll get notified every death anniversary with a link to this memorial.
        </p>
        {err && <div className="err">{err}</div>}
        <label>Full name</label>
        <input value={form.name} onChange={set('name')} placeholder="Your name" />
        <label>Active email</label>
        <input value={form.email} onChange={set('email')} placeholder="you@email.com" />
        <label>Relation to John Paul Ora</label>
        <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value, batchLevel: '' })}>
          <option value="">-- select --</option>
          {opts.relations.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {isBatch && (
          <>
            <label>Batch level (batchmate)</label>
            <select value={form.batchLevel} onChange={set('batchLevel')}>
              <option value="">-- select --</option>
              {opts.batchLevels.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </>
        )}
        <label>Password</label>
        <input type="password" value={form.password} onChange={set('password')} placeholder="min 6 characters" />
        <button className="btn gold" style={{ width: '100%', marginTop: 8 }}>Sign Up</button>
        <p style={{ fontFamily: 'Arial', fontSize: 13 }}>
          Have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
