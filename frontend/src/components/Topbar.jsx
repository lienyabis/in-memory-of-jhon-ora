import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fileUrl } from '../lib/api'

// Sticky topbar — exact structure/classes from the compiled build.
export default function Topbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [imgOk, setImgOk] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 760) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleLogout = () => { logout(); nav('/') }

  return (
    <header className="topbar">
      <Link to="/" className="brand" style={{ color: '#fff', textDecoration: 'none' }}>
        🕊️ John Paul Ora Memorial
      </Link>
      <button className="hamb" onClick={() => setOpen((v) => !v)} aria-label="menu">☰</button>
      <nav className={open ? 'open' : ''} onClick={() => setOpen(false)}>
        <Link to="/" style={{ color: '#fff' }}>Home</Link>
        <Link to="/memories" style={{ color: '#fff' }}>Memories</Link>
        {user && (user.role === 'admin' || user.role === 'superadmin') && (
          <Link to="/dashboard" style={{ color: '#fff' }}>Dashboard</Link>
        )}
        {!user && (
          <>
            <Link to="/login" style={{ color: '#fff' }}>Sign In</Link>
            <Link to="/signup" style={{ color: '#fff' }}>Sign Up</Link>
          </>
        )}
        {user && (
          <Link to="/settings" style={{ color: '#fff' }} title="Account settings">⚙️ Settings</Link>
        )}
        {user && (
          <span className="nav-user">
            {imgOk && user.avatar && (
              <img className="nav-avatar" src={fileUrl(user.avatar)} alt="" onError={() => setImgOk(false)} />
            )}
            <span className="nav-user-name">{user.name} ({user.role})</span>
            <button className="btn light" onClick={handleLogout}>Logout</button>
          </span>
        )}
      </nav>
    </header>
  )
}
