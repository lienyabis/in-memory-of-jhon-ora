import { useEffect, useState } from 'react'
import api, { apiError, fileUrl } from '../lib/api'
import UserAvatar from './UserAvatar'
import Pagination from './Pagination'

export default function DashComments({ list, setNotice, reload, tab }) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  // Back to page 1 whenever the underlying list, the active tab or the
  // page size changes (never when only the page number changes).
  useEffect(() => { setPage(1) }, [list.length, tab, size])

  const review = async (id, status) => {
    try {
      await api.put(`/api/admin/comments/${id}`, { status })
      reload()
      setNotice(`Memory ${status}`)
    } catch (e) { alert(apiError(e, 'This memory is read-only.')) }
  }
  const remove = async (id) => {
    if (!confirm('Delete this memory?')) return
    try { await api.delete(`/api/admin/comments/${id}`); reload() } catch {}
  }

  // Clamp the page to what the list actually holds, then slice it.
  const pages = Math.max(1, Math.ceil(list.length / size))
  const safe = Math.min(page, pages)
  const shown = list.slice((safe - 1) * size, safe * size)

  return (
    <>
      {list.length === 0 && <p style={{ fontFamily: 'Arial' }}>Nothing here.</p>}
      {shown.map((k) => {
        const locked = k.status === 'approved' || k.status === 'rejected'
        const imgs = Array.isArray(k.images) && k.images.length ? k.images : k.image ? [k.image] : []
        return (
          <div key={k.id} className="review-row">
            <div className="name-line">
              <UserAvatar userId={k.userId} name={k.name} />
              <b>{k.name}</b>
              <span className="badge">{k.relation}{k.batchLevel ? ` - ${k.batchLevel}` : ''}</span>
              <span className="badge">{k.status}</span>
              {locked && <span className="badge" style={{ background: '#f1f5f9' }}>read-only</span>}
            </div>
            <p className="cmt-msg" style={{ fontFamily: 'Arial' }}>{k.message}</p>
            {imgs.slice(0, 4).map((src, i) => (
              <img key={i} src={fileUrl(src)} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, marginRight: 6, marginTop: 6 }} />
            ))}
            <div style={{ fontFamily: 'Arial', fontSize: 12, color: '#64748b', marginTop: 6 }}>
              {k.email} - {new Date(k.createdAt).toLocaleString()}{k.reviewedBy ? ` • reviewed by ${k.reviewedBy}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button className="btn" style={{ padding: '6px 14px' }} disabled={locked} title={locked ? 'Already ' + k.status : ''} onClick={() => review(k.id, 'approved')}>{k.status === 'approved' ? '✓ Approved' : 'Approve'}</button>
              <button className="btn light" style={{ padding: '6px 14px' }} disabled={locked} title={locked ? 'Already ' + k.status : ''} onClick={() => review(k.id, 'rejected')}>{k.status === 'rejected' ? '✕ Rejected' : 'Reject'}</button>
              <button className="btn light" style={{ padding: '6px 14px' }} onClick={() => remove(k.id)}>Delete</button>
            </div>
          </div>
        )
      })}
      <Pagination total={list.length} page={safe} pageSize={size} onPage={setPage} onPageSize={setSize} />
    </>
  )
}
