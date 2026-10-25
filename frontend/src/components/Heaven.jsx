import { useEffect } from 'react'

// Fixed heaven backdrop: gradient sky + god rays + drifting clouds + rising
// particles + twinkling star sparks. Matches memorial-all-in-one CSS 1:1.
export default function Heaven() {
  useEffect(() => {
    const host = document.getElementById('heaven-particles')
    if (!host || host.dataset.done) return
    host.dataset.done = '1'
    const colors = ['#ffffff', '#ffe9a8', '#ffd97a', '#e8f1ff']
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span')
      s.className = 'particle'
      const size = 4 + Math.random() * 5
      s.style.width = s.style.height = `${size}px`
      s.style.left = `${Math.random() * 100}%`
      s.style.bottom = '-20px'
      s.style.background = colors[i % colors.length]
      s.style.boxShadow = `0 0 10px 2px ${colors[i % colors.length]}`
      s.style.animationDuration = `${7 + Math.random() * 9}s`
      s.style.animationDelay = `${Math.random() * 9}s`
      host.appendChild(s)
    }
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('span')
      s.className = `spark ${i % 2 ? 'gold' : 'white'}`
      const size = 5 + Math.random() * 8
      s.style.width = s.style.height = `${size}px`
      s.style.left = `${Math.random() * 100}%`
      s.style.top = `${Math.random() * 70}%`
      s.style.animationDuration = `${2 + Math.random() * 3}s`
      s.style.animationDelay = `${Math.random() * 3}s`
      host.appendChild(s)
    }
  }, [])

  return (
    <div className="heaven photo" aria-hidden="true">
      <div className="sky-glow" />
      <div className="ray r1" />
      <div className="ray r2" />
      <div className="cloud p1" />
      <div className="cloud p2" />
      <div className="cloud p3" />
      <div className="cloud p4" />
      <div className="cloud p5" />
      <div id="heaven-particles" />
    </div>
  )
}
