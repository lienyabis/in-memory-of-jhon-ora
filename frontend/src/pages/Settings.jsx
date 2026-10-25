import { useAuth } from '../context/AuthContext'
import useReveal from '../lib/useReveal'
import { AvatarCard } from '../components/SettingsAvatar'
import { PasswordCard, EmailCard } from '../components/SettingsFormsClean'

export default function Settings() {
  const { user } = useAuth()
  useReveal('settings')
  if (!user) return <div className="wrap"><p>Please sign in to open account settings.</p></div>
  return (
    <div className="wrap">
      <h1 className="reveal" style={{ color: '#0f1f3d' }}>Account Settings</h1>
      <p className="reveal" style={{ fontFamily: 'Arial', fontSize: 14, color: '#475569' }}>
        Signed in as <b>{user.name}</b> ({user.email}) — role: <span className="badge">{user.role}</span>
      </p>
      <AvatarCard />
      <PasswordCard />
      <EmailCard />
    </div>
  )
}
