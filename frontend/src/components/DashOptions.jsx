import { useState } from 'react'
import api, { apiError } from '../lib/api'

export default function DashOptions({ opts, setOpts, setNotice }) {
  const [draft, setDraft] = useState({ relations: '', batchLevels: '' })
  if (!opts) return null

  const add = async (kind) => {
    const value = draft[kind].trim()
    if (!value) return
    try {
      const { data } = await api.post('/api/admin/options', { type: kind, value })
      setOpts(data); setDraft({ ...draft, [kind]: '' }); setNotice('Option added')
    } catch (e) { alert(apiError(e, 'Failed')) }
  }
  const del = async (kind, value) => {
    if (!confirm(`Delete "${value}"?`)) return
    try {
      const { data } = await api.delete('/api/admin/options', { data: { type: kind, value } })
      setOpts(data)
    } catch { alert('Failed') }
  }

  return (
    <div className="card">
      <h3>Signup options</h3>
      {['relations', 'batchLevels'].map((kind) => (
        <div key={kind} style={{ marginBottom: 14 }}>
          <b style={{ textTransform: 'capitalize' }}>{kind}</b>
          <div style={{ margin: '8px 0' }}>
            {opts[kind].map((v) => (
              <span key={v} className="badge">{v}{' '}
                <button style={{ border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => del(kind, v)}>x</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder={`Add to ${kind}`} value={draft[kind]} onChange={(e) => setDraft({ ...draft, [kind]: e.target.value })} />
            <button className="btn" onClick={() => add(kind)}>Add</button>
          </div>
        </div>
      ))}
    </div>
  )
}
