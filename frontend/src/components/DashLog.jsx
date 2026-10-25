export default function DashLog({ log }) {
  const rows = log || []
  return (
    <div className="card">
      <h3>Email log</h3>
      {rows.length === 0 && <p style={{ fontFamily: 'Arial' }}>No sends yet.</p>}
      <table className="table">
        <thead><tr><th>When</th><th>Year</th><th>Sent</th><th>Total</th></tr></thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.id}>
              <td>{new Date(n.at).toLocaleString()}</td>
              <td>{n.year}</td>
              <td>{n.sent}</td>
              <td>{n.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
