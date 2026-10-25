import { useEffect } from 'react'

// Original build's `yi` hook: reveals .reveal elements as they enter view.
export default function useReveal(dep) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver((rs) => {
      rs.forEach((r) => {
        if (r.isIntersecting) { r.target.classList.add('vis'); io.unobserve(r.target) }
      })
    }, { threshold: 0.12 })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [dep])
}
