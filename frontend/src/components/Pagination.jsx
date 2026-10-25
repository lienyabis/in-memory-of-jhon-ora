// Page-size choices offered to admins (dashboard lists).
export const PAGE_SIZES = [10, 25, 50, 100, 500]

// Modern pager for the dashboard data lists.
// It renders NOTHING unless the list has more than 10 rows; above that
// it paginates automatically (default 10 per page) and lets admins pick
// 10 / 25 / 50 / 100 / 500 rows per page.
export default function Pagination({ total, page, pageSize, onPage, onPageSize }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), pages)
  if (!total || total <= 10) return null

  const from = (current - 1) * pageSize + 1
  const to = Math.min(total, current * pageSize)

  // 1 … 4 5 [6] 7 8 … 20
  const nums = []
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) nums.push(i)
  } else {
    nums.push(1)
    if (current > 4) nums.push('…')
    for (let i = Math.max(2, current - 2); i <= Math.min(pages - 1, current + 2); i++) nums.push(i)
    if (current < pages - 3) nums.push('…')
    nums.push(pages)
  }

  return (
    <div className="pager">
      <span className="pager-info">Showing {from}–{to} of {total}</span>
      <div className="pager-pages">
        <button type="button" disabled={current <= 1} onClick={() => onPage(current - 1)}>‹ Prev</button>
        {nums.map((n, i) => (n === '…'
          ? <span key={`gap-${i}`} className="gap">…</span>
          : (
            <button key={n} type="button" className={n === current ? 'on' : ''} onClick={() => onPage(n)}>
              {n}
            </button>
          )))}
        <button type="button" disabled={current >= pages} onClick={() => onPage(current + 1)}>Next ›</button>
      </div>
      <label className="pager-size">
        Rows
        <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    </div>
  )
}