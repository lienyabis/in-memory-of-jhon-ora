import { useEffect, useState } from 'react'
import { fileUrl } from '../lib/api'

// Default profile picture — inline SVG, so it needs no extra request
// and keeps working offline / before the real picture loads.
export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<circle cx="32" cy="32" r="32" fill="#e2e8f0"/>' +
    '<circle cx="32" cy="25" r="11" fill="#94a3b8"/>' +
    '<path d="M11 57c3-11 11-17 21-17s18 6 21 17a32 32 0 01-42 0z" fill="#94a3b8"/>' +
    '</svg>'
  )

// Small round avatar shown beside a name. Uses the public
// GET /api/avatars/{userId} endpoint; when the user has no picture
// (404) or has no account (userId empty), it falls back to the
// default profile image.
export default function UserAvatar({ userId, size = 28, name = '' }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [userId])
  const src = !userId || broken ? DEFAULT_AVATAR : fileUrl(`/api/avatars/${userId}`)
  return (
    <img
      className="list-avatar"
      src={src}
      alt={name ? `${name} profile picture` : 'Profile picture'}
      style={{ width: size, height: size }}
      onError={() => setBroken(true)}
    />
  )
}