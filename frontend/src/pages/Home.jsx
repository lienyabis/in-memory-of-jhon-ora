import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { fileUrl } from '../lib/api'
import useReveal from '../lib/useReveal'
import UserAvatar from '../components/UserAvatar'

const nf = (c) => (Array.isArray(c.images) && c.images.length ? c.images : c.image ? [c.image] : [])

export default function Home() {
  const [feed, setFeed] = useState(null)
  const [light, setLight] = useState('')

  useEffect(() => {
    let alive = true
    api.get('/api/comments').then(({ data }) => { if (alive) setFeed(data) }).catch(() => {})
    return () => { alive = false }
  }, [])

  useReveal(feed)

  const years = feed && feed.byYear
    ? Object.entries(feed.byYear).sort((a, b) => b[0] - a[0]).slice(0, 1)
    : []

  return (
    <>
      <div className="hero">
        <div style={{ letterSpacing: 4, fontSize: 13, color: '#64748b' }}>IN LOVING MEMORY 🕊️</div>
        <div className="hero-frame" style={{ marginTop: 10 }}>
          <img src="/jhon_ora.jpeg" alt="John Paul Sollano Ora" />
        </div>
        <h1>John Paul Sollano Ora</h1>
        <div className="aka">known as “Princess John Ora”</div>
        <div style={{ fontFamily: 'Arial', marginTop: 6, color: '#334155' }}>BSICT Students Class 2020</div>
        <p className="quote">“Gone from our sight, but never from our hearts. Your smile, kindness and light live on in every memory we share.”</p>
        <div className="hero-cta">
          <Link to="/memories"><button className="btn gold pulse-grow">🕊️ Share a Memory</button></Link>
        </div>
        <div className="alert reveal" style={{ maxWidth: 640, margin: '16px auto' }}>
          🕯️ Every year on his death anniversary, all registered accounts receive an email with a link back to this memorial.
        </div>
      </div>

      {light && (
        <div className="lightbox" onClick={() => setLight('')}>
          <button onClick={() => setLight('')}>✕</button>
          <img src={light} alt="" />
        </div>
      )}

      <div className="wrap">
        <h2 className="reveal" style={{ color: '#0f1f3d' }}>Latest Memories</h2>
        {!feed && <p>Loading…</p>}
        {feed && feed.total === 0 && (
          <p>No shared memories yet. Be the first to <Link to="/memories">share one</Link>.</p>
        )}
        {years.map(([year, list]) => (
          <div key={year}>
            <div className="year reveal">{year}</div>
            <div className="grid">
              {list.slice(0, 6).map((c) => {
                const imgs = nf(c)
                return (
                  <div key={c.id} className="card mem reveal">
                    {imgs[0] && (
                      <>
                        <img className="main" src={fileUrl(imgs[0])} alt="memory" onClick={() => setLight(fileUrl(imgs[0]))} />
                        {imgs.slice(1).map((src, i) => (
                          <img key={i} className="home-thumb" src={fileUrl(src)} alt="" onClick={() => setLight(fileUrl(src))} />
                        ))}
                      </>
                    )}
                    <div className="name-line" style={{ marginTop: 8 }}>
                      <UserAvatar userId={c.userId} name={c.name} />
                      <b>{c.name}</b>
                      <span className="badge">{c.relation}{c.batchLevel ? ` • ${c.batchLevel}` : ''}</span>
                    </div>
                    <p className="cmt-msg" style={{ fontFamily: 'Arial', fontSize: 14 }}>{c.message.slice(0, 160)}</p>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 10 }}>
              <Link to="/memories">View all memories →</Link>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
