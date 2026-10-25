import { useEffect, useState } from 'react'
import { useDashboard } from '../components/dashData'
import { useAuth } from '../context/AuthContext'
import useReveal from '../lib/useReveal'
import DashComments from '../components/DashComments'
import DashUsers from '../components/DashUsers'
import DashOptions from '../components/DashOptions'
import DashSettings from '../components/DashSettings'
import DashLog from '../components/DashLog'

const TABS = [
  ['pending', 'Review comments'],
  ['all', 'All memories'],
  ['users', 'Users & Admins'],
  ['options', 'Signup options'],
  ['settings', 'Anniversary & Site'],
  ['log', 'Email log'],
]

export default function Dashboard() {
  const { user } = useAuth()
  const d = useDashboard()
  const [tab, setTab] = useState('pending')
  const { stats, comments } = d

  useReveal(stats)

  useEffect(() => {
    if (!d.notice) return
    const t = setTimeout(() => d.setNotice(''), 3500)
    return () => clearTimeout(t)
  }, [d.notice])

  const filtered = tab === 'all' ? comments
    : tab === 'users' || tab === 'options' || tab === 'settings' || tab === 'log' ? []
    : comments.filter((c) => c.status === tab)

  return (
    <div className="wrap">
      <h1>Dashboard <span className="badge">{user?.role}</span></h1>
      {d.notice && <div className="ok">{d.notice}</div>}
      {d.err && <div className="err">{d.err}</div>}
      {stats && (
        <div className="statrow">
          <div className="stat"><b>{stats.pending}</b>Pending</div>
          <div className="stat"><b>{stats.approved}</b>Approved</div>
          <div className="stat"><b>{stats.guests}</b>Guests</div>
          <div className="stat"><b>{stats.admins}</b>Admins</div>
          <div className="stat"><b>{stats.totalUsers}</b>Total</div>
        </div>
      )}
      <div className="dash">
        <div className="side">
          {TABS.map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <div>
          {(tab === 'pending' || tab === 'all' || tab === 'approved' || tab === 'rejected') && (
            <div className="card">
              <div className="tabs">
                {['pending', 'approved', 'rejected', 'all'].map((k) => (
                  <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k}</button>
                ))}
              </div>
              <DashComments list={filtered} setNotice={d.setNotice} reload={d.reload} tab={tab} />
            </div>
          )}
          {tab === 'users' && <DashUsers users={d.users} setNotice={d.setNotice} setErr={d.setErr} reload={d.reload} />}
          {tab === 'options' && <DashOptions opts={d.opts} setOpts={d.setOpts} setNotice={d.setNotice} />}
          {tab === 'settings' && <DashSettings settings={d.settings} setSettings={d.setSettings} setNotice={d.setNotice} setErr={d.setErr} reload={d.reload} />}
          {tab === 'log' && <DashLog log={d.log} />}
        </div>
      </div>
    </div>
  )
}
