import api from '../lib/api'

export default function DashSettings({ settings, setSettings, setNotice, reload }) {
  const save = async (e) => {
    e.preventDefault()
    const { data } = await api.put('/api/admin/settings', settings)
    setSettings(data); setNotice('Saved')
  }
  const sendNow = async () => {
    if (!confirm('Send anniversary email to ALL now?')) return
    const { data } = await api.post('/api/admin/send-anniversary-now')
    setNotice(`Emailed ${data.emailed}/${data.total}`)
    reload()
  }

  return (
    <div className="card">
      <h3>Death anniversary and site link</h3>
      <form onSubmit={save}>
        <label>Death month (1-12)</label>
        <input type="number" min="1" max="12" value={settings.deathMonth} onChange={(e) => setSettings({ ...settings, deathMonth: e.target.value })} />
        <label>Death day (1-31)</label>
        <input type="number" min="1" max="31" value={settings.deathDay} onChange={(e) => setSettings({ ...settings, deathDay: e.target.value })} />
        <label>Memorial site URL (link in email)</label>
        <input value={settings.siteUrl || ''} onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn">Save</button>
          <button type="button" className="btn gold" onClick={sendNow}>Send email now</button>
        </div>
      </form>
      <div className="alert">
        NOTE: Do not change this settings, email notification automatically sends yearly at 6am on {settings.deathMonth}/{settings.deathDay}. Do not click Send email now button, it is for testing only.
      </div>
    </div>
  )
}
