import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Heaven from './components/Heaven'
import Topbar from './components/Topbar'
import Home from './pages/Home'
import Memories from './pages/Memories'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

function Guard({ children, roles }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="wrap">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Heaven />
        <Topbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Guard roles={['admin', 'superadmin']}><Dashboard /></Guard>} />
          <Route path="/settings" element={<Guard roles={['guest', 'admin', 'superadmin']}><Settings /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <div className="footer">In Loving Memory of John Paul Sollano Ora • “Princess John Ora” • BSICT Class 2020 🕊️</div>
      </BrowserRouter>
    </AuthProvider>
  )
}
