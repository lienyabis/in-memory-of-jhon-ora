import { useEffect, useRef, useState } from 'react'
import api, { apiError, fileUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AvatarCropper from './AvatarCropper'

const OK_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_MB = 8

export function AvatarCard() {
  const { user, setUser } = useAuth()
  const [pickUrl, setPickUrl] = useState('')
  const [hasAvatar, setHasAvatar] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [tick, setTick] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!user) return
    fetch(fileUrl(user.avatar), { method: 'GET' })
      .then((r) => setHasAvatar(r.ok))
      .catch(() => setHasAvatar(false))
  }, [user, tick])

  if (!user) return null

  const onPick = (e) => {
    const f = (e.target.files || [])[0]
    setErr(''); setOk('')
    if (!f) return
    if (!OK_TYPES.includes(f.type)) { setErr('Only JPG, PNG, GIF or WEBP pictures are allowed.'); e.target.value = ''; return }
    if (f.size > MAX_MB * 1024 * 1024) { setErr(`The picture must be ${MAX_MB}MB or smaller.`); e.target.value = ''; return }
    setPickUrl(URL.createObjectURL(f))
    e.target.value = ''
  }
  const cancelPick = () => { if (pickUrl) URL.revokeObjectURL(pickUrl); setPickUrl('') }

  const confirmPick = async (blob) => {
    setBusy(true); setErr(''); setOk('')
    try {
      const fd = new FormData()
      fd.append('avatar', blob, 'avatar.jpg')
      const { data } = await api.post('/api/auth/me/avatar', fd)
      setOk(data.message || 'Profile picture updated.')
      setUser(data.user)
      setTick(Date.now())
    } catch (e2) { setErr(apiError(e2, 'Upload failed. Please try again.')) }
    finally { setBusy(false); cancelPick() }
  }

  const remove = async () => {
    if (!confirm('Remove your profile picture?')) return
    setErr(''); setOk('')
    try {
      const { data } = await api.delete('/api/auth/me/avatar')
      setOk(data.message || 'Profile picture removed.')
      setTick(Date.now())
    } catch (e2) { setErr(apiError(e2, 'Could not remove the picture.')) }
  }

  return (
    <div className="card reveal" style={{ marginBottom: 18 }}>
      <h3>Profile picture</h3>
      {err && <div className="err">{err}</div>}
      {ok && <div className="ok">{ok}</div>}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="avatar-xl">
          {hasAvatar
            ? <img src={fileUrl(user.avatar) + (tick ? `?v=${tick}` : '')} alt={user.name} onError={() => setHasAvatar(false)} />
            : <span>{(user.name || '?').trim().charAt(0).toUpperCase()}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={onPick} />
          <button className="btn gold" disabled={busy} onClick={() => inputRef.current && inputRef.current.click()}>
            {busy ? 'Uploading…' : hasAvatar ? 'Change picture' : 'Upload picture'}
          </button>
          {hasAvatar && <button className="btn light" onClick={remove}>Remove picture</button>}
          <div style={{ fontFamily: 'Arial', fontSize: 12, color: '#64748b', maxWidth: 260 }}>
            JPG, PNG, GIF or WEBP are accepted format. Max size {MAX_MB}MB.
          </div>
        </div>
      </div>
      {pickUrl && <AvatarCropper src={pickUrl} onCancel={cancelPick} onConfirm={confirmPick} />}
    </div>
  )
}
