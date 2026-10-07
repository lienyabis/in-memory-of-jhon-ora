import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import useReveal from '../useReveal';
function imgs(m){ if(Array.isArray(m.images)&&m.images.length) return m.images; return m.image?[m.image]:[]; }
export default function Home(){
  const [data,setData]=useState(null);
  const [light,setLight]=useState('');
  useEffect(()=>{ api.get('/api/comments').then(r=>setData(r.data)).catch(()=>{}); },[]);
  useReveal(data);
  const latest = data ? Object.entries(data.byYear).sort((a,b)=>b[0]-a[0]).slice(0,1) : [];
  return <>
    <div className="hero">
      <div style={{letterSpacing:4,fontSize:13,color:'#64748b'}}>IN LOVING MEMORY 🕊️</div>
      <div className="hero-frame" style={{marginTop:10}}><img src="/jhon_ora.jpeg" alt="Jhon Sollano Ora" /></div>
      <h1>Jhon Sollano Ora</h1>
      <div className="aka">known as “Princess John Ora”</div>
      <div style={{fontFamily:'Arial',marginTop:6,color:'#334155'}}>BSICT Students Class 2020</div>
      <p className="quote">“Gone from our sight, but never from our hearts. Your smile, kindness and light live on in every memory we share.”</p>
      <div className="hero-cta">
        <Link to="/memories"><button className="btn gold pulse-grow">🕊️ Share a Memory</button></Link>
      </div>
      <div className="alert reveal" style={{maxWidth:640,margin:'16px auto'}}>🕯️ Every year on his death anniversary, all registered accounts receive an email with a link back to this memorial.</div>
    </div>
    {light && <div className="lightbox" onClick={()=>setLight('')}><button onClick={()=>setLight('')}>✕</button><img src={light} alt="" /></div>}
    <div className="wrap">
      <h2 className="reveal" style={{color:'#0f1f3d'}}>Latest Memories</h2>
      {!data && <p>Loading…</p>}
      {data && data.total===0 && <p>No shared memories yet. Be the first to <Link to="/memories">share one</Link>.</p>}
      {latest.map(([yr,items])=><div key={yr}>
        <div className="year reveal">{yr}</div>
        <div className="grid">{items.slice(0,6).map(m=>{ const a=imgs(m); return <div key={m.id} className="card mem reveal">
          {a[0] && <img className="main" src={a[0]} alt="memory" onClick={()=>setLight(a[0])} />}
          {a.length>1 && <div className="thumbs">{a.slice(1,5).map((s,i)=><img key={i} src={s} alt="" onClick={()=>setLight(s)} />)}{a.length>5 && <span className="badge">+{a.length-5} more</span>}</div>}
          <div style={{marginTop:8}}><b>{m.name}</b> <span className="badge">{m.relation}{m.batchLevel?` • ${m.batchLevel}`:''}</span></div>
          <p style={{fontFamily:'Arial',fontSize:14}}>{m.message.slice(0,160)}</p>
        </div>;})}</div>
        <div style={{marginTop:10}}><Link to="/memories">View all memories →</Link></div>
      </div>)}
    </div>
  </>;
}

