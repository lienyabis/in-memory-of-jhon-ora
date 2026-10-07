import { useEffect } from 'react';
export default function useReveal(dep){
  useEffect(()=>{
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('vis'); io.unobserve(e.target); } });
    },{ threshold:.12 });
    els.forEach(el=>io.observe(el));
    return ()=>io.disconnect();
  },[dep]);
}
