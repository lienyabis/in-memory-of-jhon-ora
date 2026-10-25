import { useEffect, useRef, useState } from 'react'

const BOX = 300
const OUT = 512

// Square cropper: drag to pan + zoom slider, exports 512px JPEG.
// Matches the memorial-all-in-one crop behavior.
export default function AvatarCropper({ src, onCancel, onConfirm }) {
  const imgRef = useRef(null)
  const viewRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [box, setBox] = useState(BOX)
  const drag = useRef(null)

  useEffect(() => {
    const fit = () => {
      const w = viewRef.current ? viewRef.current.clientWidth : 0
      if (w > 0) setBox(w)
    }
    fit()
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
    }
  }, [])

  const base = size.w ? Math.max(box / size.w, box / size.h) : 1
  const scale = base * zoom
  const w = size.w * scale
  const h = size.h * scale

  const clamp = (p, iw, ih) => ({
    x: Math.min(0, Math.max(box - iw, p.x)),
    y: Math.min(0, Math.max(box - ih, p.y)),
  })

  const down = (e) => {
    if (!size.w) return
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e) => {
    if (!drag.current) return
    const d = drag.current
    setPos(clamp({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }, w, h))
  }
  const up = () => { drag.current = null }

  const setZoomKeep = (z) => {
    if (!size.w) return
    const ns = base * z
    const cx = (box / 2 - pos.x) / (base * zoom)
    const cy = (box / 2 - pos.y) / (base * zoom)
    setZoom(z)
    setPos(clamp({ x: box / 2 - cx * ns, y: box / 2 - cy * ns }, size.w * ns, size.h * ns))
  }

  const confirm = () => {
    const img = imgRef.current
    if (!img || !size.w) return
    const cv = document.createElement('canvas')
    cv.width = OUT; cv.height = OUT
    const ctx = cv.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    const sx = -pos.x / scale
    const sy = -pos.y / scale
    const sw = box / scale
    ctx.drawImage(img, sx, sy, sw, sw, 0, 0, OUT, OUT)
    cv.toBlob((b) => { if (b) onConfirm(b) }, 'image/jpeg', 0.9)
  }

  return (
    <div className="crop-backdrop" onClick={onCancel}>
      <div className="crop-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: '#0f1f3d', margin: '0 0 10px' }}>Crop your picture</h3>
        <div ref={viewRef} className="crop-view"
          style={{ position: 'relative', overflow: 'hidden', touchAction: 'none' }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <img ref={imgRef} src={src} alt="crop" draggable={false}
            style={{ position: 'absolute', left: pos.x, top: pos.y, width: w || 'auto', height: h || 'auto', maxWidth: 'none', cursor: 'grab', userSelect: 'none' }}
            onLoad={(e) => setSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })} />
          <div className="crop-grid" />
        </div>
        <label style={{ display: 'block', marginTop: 10 }}>Zoom</label>
        <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoomKeep(parseFloat(e.target.value))} style={{ padding: 0 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" className="btn light" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn gold" onClick={confirm} style={{ flex: 1 }}>✓ Use this picture</button>
        </div>
      </div>
    </div>
  )
}
