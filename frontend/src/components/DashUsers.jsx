import { useEffect, useState } from 'react'
import api, { apiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import UserAvatar from './UserAvatar'
import Pagination from './Pagination'

export default function DashUsers({ users, setNotice, setErr, reload }) {
  const { user: me } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  // Back to page 1 when the user list changes size or the page size does.
  useEffect(() => { setPage(1) }, [users.length, size])

  const create = async (e) => {
    e.preventDefault(); setErr('')
    try {
      await api.post('/api/admin/users/admin', form)
      setForm({ name: '', email: '', password: '' })
      reload(); setNotice('Admin created')
    } catch (err2) { setErr(apiError(err2, 'Failed')) }
  }
  const setRole = async (id, role) => {
    if (!confirm(`Change this account's role to "${role}"?`)) { reload(); return }
    try {
      const { data } = await api.put(`/api/admin/users/${id}/role`, { role })
      setNotice(data.message || `Role changed to ${role}`)
      reload()
    } catch (err2) { alert(apiError(err2, 'Failed')); reload() }
  }
  const remove = async (id) => {
    if (!confirm('Remove this account?')) return
    try { await api.delete(`/api/admin/users/${id}`); reload() }
    catch (err2) { alert(apiError(err2, 'Failed')) }
  }

  // Clamp the page to what the list actually holds, then slice it.
  const pages = Math.max(1, Math.ceil(users.length / size))
  const safe = Math.min(page, pages)
  const shown = users.slice((safe - 1) * size, safe * size)

  return (
    <div className="card">
      <h3>Create admin account</h3>
      <form onSubmit={create} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn">Create admin</button>
      </form>
      <table className="table users-table" style={{ marginTop: 12 }}>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>
          {shown.map((k) => (
            <tr key={k.id}>
              <td>
                <span className="name-line">
                  <UserAvatar userId={k.id} name={k.name} />
                  <span>{k.name}</span>
                </span>
              </td>
              <td>{k.email}</td>
              <td>
                {k.role === 'superadmin' || k.id === me?.id
                  ? <span className="badge">{k.role}{k.id === me?.id ? ' (you)' : ''}</span>
                  : <select value={k.role} style={{ width: 'auto', padding: '4px 8px', margin: 0 }} onChange={(e) => setRole(k.id, e.target.value)}>
                      <option value="guest">guest</option>
                      <option value="admin">admin</option>
                    </select>}
              </td>
              <td>{k.role !== 'superadmin'
                ? <button className="btn light" style={{ padding: '4px 10px' }} onClick={() => remove(k.id)}>Remove</button>
                : <span className="badge">protected</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination total={users.length} page={safe} pageSize={size} onPage={setPage} onPageSize={setSize} />
    </div>
  )
}
