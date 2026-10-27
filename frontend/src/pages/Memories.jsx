import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { apiError, fileUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import useReveal from '../lib/useReveal'
import UserAvatar from '../components/UserAvatar'
import Pagination from '../components/Pagination'

const MAX_FILES = 6
const MAX_MB = 8
const MAX_CHARS = 500
const TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const fmtMB = (b) => (b / 1048576).toFixed(1) + 'MB'
const cplen = (s) => Array.from(String(s)).length
const split = (fs) => ({
  bad: fs.filter((f) => !TYPES.includes(f.type)),
  ok: fs.filter((f) => TYPES.includes(f.type)),
})
const nf = (c) => (Array.isArray(c.images) && c.images.length ? c.images : c.image ? [c.image] : [])

export default function Memories() {
  const { user } = useAuth()
  const [feed, setFeed] = useState(null)
  const [light, setLight] = useState('')
  const [msg, setMsg] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editMsg, setEditMsg] = useState('')
  const [newFiles, setNewFiles] = useState([])
  const [newPreviews, setNewPreviews] = useState([])
  const [editBusy, setEditBusy] = useState(false)
  const createRef = useRef(null)
  const editRef = useRef(null)
  // Paginate the public wall: this page shows EVERY memory, so once the
  // list grows past 10 rows we page it (default 10/page, choices up to
  // 500) exactly like the dashboard lists.
  const [wallPage, setWallPage] = useState(1)
  const [wallSize, setWallSize] = useState(10)

  useReveal(feed)

  const load = async () => {
    try { const { data } = await api.get('/api/comments'); setFeed(data) } catch { }
  }
  useEffect(() => { load() }, [])

  useEffect(() => { setWallPage(1) }, [feed, wallSize])
  // Flatten the year groups into one ordered list, slice the page, then
  // re-group so year headings still render correctly.
  const wall = (() => {
    if (!feed || !feed.byYear) return { total: 0, safe: 1, shown: [] }
    const flat = Object.entries(feed.byYear)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .flatMap(([year, list]) => list.map((c) => ({ year, c })))
    const pages = Math.max(1, Math.ceil(flat.length / wallSize))
    const safe = Math.min(Math.max(1, wallPage), pages)
    return { total: flat.length, safe, shown: flat.slice((safe - 1) * wallSize, safe * wallSize) }
  })()
  const groupedShown = (() => {
    const map = new Map()
    for (const { year, c } of wall.shown) {
      if (!map.has(year)) map.set(year, [])
      map.get(year).push(c)
    }
    return [...map.entries()]
  })()

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f))
    setNewPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [newFiles])
  const onPick = (e) => {
    const picked = Array.from(e.target.files || [])
    const { bad, ok: good } = split(picked)
    const total = good.reduce((a, f) => a + f.size, 0)
    if (bad.length) setErr(`Only JPG, PNG, GIF or WEBP photos are allowed (${bad.length} file(s) skipped).`)
    else if (total > MAX_MB * 1024 * 1024) setErr(`Those photos are too large in total (${fmtMB(total)}). The combined total must be ${MAX_MB}MB or smaller (${good.length} selected). Remove some photos or use smaller files.`)
    else setErr('')
    setFiles(good.slice(0, MAX_FILES))
    if (good.length > MAX_FILES) setErr(`You can attach up to ${MAX_FILES} photos. Only the first ${MAX_FILES} were kept.`)
    e.target.value = ''
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setOk('')
    if (!user) { setErr('Please sign in or sign up to leave a memory.'); return }
    const text = msg.trim()
    if (!text) { setErr('Please write your memory/message first.'); return }
    if (cplen(text) > MAX_CHARS) { setErr(`Your comment is too long. Maximum ${MAX_CHARS} characters (you used ${cplen(text)}).`); return }
    if (files.length > MAX_FILES) { setErr(`You can attach up to ${MAX_FILES} photos.`); return }
    const total = files.reduce((a, f) => a + f.size, 0)
    if (total > MAX_MB * 1024 * 1024) { setErr(`Those photos are too large in total (${fmtMB(total)}). The combined total must be ${MAX_MB}MB or smaller. Remove some photos or use smaller files.`); return }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('message', text)
      files.forEach((f) => fd.append('images[]', f, f.name))
      const { data } = await api.post('/api/comments', fd)
      setOk(data.message)
      setMsg(''); setFiles([])
      if (createRef.current) createRef.current.value = ''
      load()
    } catch (ex) { setErr(apiError(ex, 'Failed to submit. Please try again.')) }
    finally { setBusy(false) }
  }

  const startEdit = (c) => {
    setEditId(c.id); setEditMsg(c.message); setNewFiles([]); setErr(''); setOk('')
  }
  const cancelEdit = () => {
    setEditId(null); setEditMsg(''); setNewFiles([])
    if (editRef.current) editRef.current.value = ''
  }

  const onEditPick = (e, c) => {
    const picked = Array.from(e.target.files || [])
    const slots = MAX_FILES - nf(c).length - newFiles.length
    const { bad, ok: good } = split(picked)
    if (bad.length) setErr(`Only JPG, PNG, GIF or WEBP photos are allowed (${bad.length} file(s) skipped).`)
    else {
      const total = [...newFiles, ...good].reduce((a, f) => a + f.size, 0)
      if (total > MAX_MB * 1024 * 1024) setErr(`Those new photos are too large in total (${fmtMB(total)}). The combined total of new photos must be ${MAX_MB}MB or smaller.`)
      else if (good.length > slots) setErr(`You can attach up to ${MAX_FILES} photos per comment. Only ${Math.max(slots, 0)} slot(s) left.`)
      else setErr('')
    }
    setNewFiles([...newFiles, ...good].slice(0, Math.max(slots, 0)))
    e.target.value = ''
  }

  const saveEdit = async (id) => {
    const text = editMsg.trim()
    setErr(''); setOk('')
    if (!text) { setErr('Please write your memory/message first.'); return }
    if (cplen(text) > MAX_CHARS) { setErr(`Your comment is too long. Maximum ${MAX_CHARS} characters (you used ${cplen(text)}).`); return }
    setEditBusy(true)
    try {
      const r1 = await api.put(`/api/comments/${id}`, { message: text })
      if (newFiles.length) {
        const fd = new FormData()
        newFiles.forEach((f) => fd.append('images[]', f, f.name))
        const r2 = await api.post(`/api/comments/${id}/images`, fd)
        setOk(r2.data.message || r1.data.message)
      } else setOk(r1.data.message)
      cancelEdit(); load()
    } catch (ex) { setErr(apiError(ex, 'Failed to save changes.')) }
    finally { setEditBusy(false) }
  }

  const removeComment = async (id) => {
    if (!confirm('Delete this comment and all of its photos?')) return
    setErr(''); setOk(''); setEditBusy(true)
    try { await api.delete(`/api/comments/${id}`); cancelEdit(); load() }
    catch (ex) { setErr(apiError(ex, 'Failed to delete the comment.')) }
    finally { setEditBusy(false) }
  }

  const removePhoto = async (src) => {
    const m = /\/api\/photos\/([A-Za-z0-9_-]+)/.exec(src || '')
    if (!m) { setErr('This old photo cannot be removed here.'); return }
    if (!confirm('Remove this photo from your comment?')) return
    setErr(''); setOk(''); setEditBusy(true)
    try { await api.delete(`/api/photos/${m[1]}`); load() }
    catch (ex) { setErr(apiError(ex, 'Failed to remove the photo.')) }
    finally { setEditBusy(false) }
  }

  return (
    <div className="wrap">
      <h1 className="reveal" style={{ color: '#0f1f3d' }}>Memories of John 💐</h1>

      {light && (
        <div className="lightbox" onClick={() => setLight('')}>
          <button onClick={() => setLight('')}>✕</button>
          <img src={light} alt="" />
        </div>
      )}

      <div className="card reveal" style={{ marginBottom: 18 }}>
        <h3>Leave a memory / comment</h3>
        {err && <div className="err">{err}</div>}
        {ok && <div className="ok">{ok}</div>}
        {user ? (
          <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
            <textarea ref={createRef} rows={4} maxLength={MAX_CHARS}
              placeholder="Share your favorite memory of John Paul Ora…"
              value={msg} onChange={(e) => setMsg(e.target.value)} />
            <div style={{ fontFamily: 'Arial', fontSize: 12, color: cplen(msg) >= MAX_CHARS - 40 ? '#b91c1c' : '#64748b', marginTop: -2 }}>
              {cplen(msg)}/{MAX_CHARS} characters
            </div>
            <label>Attach photos related to Jhon (you can select multiple, up to 6 — JPG/PNG/GIF/WEBP, {MAX_MB}MB combined total)</label>
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={onPick} />
            {files.length > 0 && (
              <div className="hint" style={{ fontFamily: 'Arial', fontSize: 12, color: '#64748b' }}>
                Selected: {files.length} photo(s), {fmtMB(files.reduce((a, f) => a + f.size, 0))} of {MAX_MB}MB total.
              </div>
            )}
            {files.length > 0 && (
              <div className="preview">
                {previews.map((u, i) => <img key={i} src={u} alt={`selected ${i + 1}`} />)}
              </div>
            )}
            <button className="btn gold pulse-grow" type="submit" disabled={busy}>{busy ? 'Posting…' : '🕊️ Submit for Review'}</button>
            <div style={{ fontFamily: 'Arial', fontSize: 12, color: '#64748b', marginTop: 6 }}>
              {user.role === 'guest' ? 'Guest comments are reviewed by admin/superadmin before display.' : 'Admin posts are published immediately.'}
            </div>
          </form>
        ) : (
          <p style={{ fontFamily: 'Arial' }}>
            You need an account so we can notify you every death anniversary. <Link to="/login">Sign in</Link> or <Link to="/signup">Sign up with your active email</Link>.
          </p>
        )}
      </div>
      {!feed && <p>Loading…</p>}
      {feed && feed.years.map((y) => (
        <div key={y}>
          <div className="year reveal">{y} <span style={{ fontFamily: 'Arial', fontSize: 13, color: '#64748b' }}>({feed.byYear[y].length} memories)</span></div>
          <div>
            {(feed.byYear[y] || []).map((c) => {
              const X = nf(c)
              const mine = !!user && c.userId === user.id
              return (
                <div key={c.id} className="card mem reveal">
                  {X[0] && (
  <div className="main-img-wrap">
    <img className="main-bg" src={fileUrl(X[0])} alt="" />
    <img className="main" src={fileUrl(X[0])} alt="memory of Jhon" onClick={() => setLight(fileUrl(X[0]))} />
  </div>
)}
                  {X.length > 1 && (
                    <div className="thumbs">
                      {X.slice(1, 5).map((src, i) => (
                        <img key={i} src={fileUrl(src)} alt="" onClick={() => setLight(fileUrl(src))} />
                      ))}
                      {X.length > 5 && <span className="badge">+{X.length - 5} more</span>}
                    </div>
                  )}
                  <div className="name-line" style={{ marginTop: 8 }}>
                    <UserAvatar userId={c.userId} name={c.name} />
                    <b>{c.name}</b>
                    {mine && <span className="badge" style={{ background: '#dcfce7', borderColor: '#86efac' }}>mine</span>}
                  </div>
                  <div>
                    <span className="badge">{c.relation}</span>
                    {c.batchLevel && <span className="badge">{c.batchLevel}</span>}
                    <span className="badge">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  {mine && editId === c.id ? (
                    <div className="edit-box">
                      <textarea rows={4} maxLength={MAX_CHARS} value={editMsg} onChange={(e) => setEditMsg(e.target.value)} />
                      <div style={{ fontFamily: 'Arial', fontSize: 12, color: cplen(editMsg) >= MAX_CHARS - 40 ? '#b91c1c' : '#64748b' }}>
                        {cplen(editMsg)}/{MAX_CHARS} characters
                      </div>
                      <div className="preview">
                        {X.map((src, i) => (
                          <div key={src + i} className="preview-item">
                            <img src={fileUrl(src)} alt={`photo ${i + 1}`} onClick={() => setLight(fileUrl(src))} />
                            <button type="button" className="img-x" title="Remove this photo" disabled={editBusy} onClick={() => removePhoto(src)}>✕</button>
                          </div>
                        ))}
                      </div>
                      <label style={{ display: 'block' }}>Add more photos ({X.length + newFiles.length}/{MAX_FILES})</label>
                      <input ref={editRef} type="file" accept="image/*" multiple onChange={(e) => onEditPick(e, c)} />
                      {newFiles.length > 0 && (
                        <div className="preview">
                          {newPreviews.map((u, i) => <img key={i} src={u} alt={`new ${i + 1}`} />)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="btn" disabled={editBusy} onClick={() => saveEdit(c.id)}>{editBusy ? 'Saving…' : '💾 Save'}</button>
                        <button className="btn light" disabled={editBusy} onClick={cancelEdit}>Cancel</button>
                      </div>
                      {user.role === 'guest' && (
                        <div style={{ fontFamily: 'Arial', fontSize: 12, color: '#64748b', marginTop: 6 }}>
                          Edited guest comments go back to admin review.
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="cmt-msg" style={{ fontFamily: 'Arial', fontSize: 14 }}>{c.message}</p>
                  )}
                  {mine && editId !== c.id && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <button className="btn light" style={{ padding: '5px 14px', fontSize: 13 }} onClick={() => startEdit(c)}>✎ Edit</button>
                      <button className="btn light" style={{ padding: '5px 14px', fontSize: 13, color: '#b91c1c' }} disabled={editBusy} onClick={() => removeComment(c.id)}>🗑 Delete</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

    </div>
  )
}


