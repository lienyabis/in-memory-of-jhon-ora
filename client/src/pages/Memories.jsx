import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { imgUrl } from '../api';
import { useAuth } from '../AuthContext';
import useReveal from '../useReveal';
function imgs(m){ if(Array.isArray(m.images)&&m.images.length) return m.images; return m.image?[m.image]:[]; }
export default function Memories(){
  const { user } = useAuth();
  const [data,setData]=useState(null);
  const [msg,setMsg]=useState(''); const [files,setFiles]=useState([]);
  const [previews,setPreviews]=useState([]);
  const [info,setInfo]=useState(''); const [err,setErr]=useState('');
  const [light,setLight]=useState('');
  const [sending,setSending]=useState(false);
  const inputRef = useRef(null);
  const load=()=>api.get('/api/comments').then(r=>setData(r.data)).catch(()=>{});
  useEffect(()=>{ load(); },[]);
  useReveal(data ? data.total : 'empty');
  useEffect(()=>{
    const urls = files.map(f=>URL.createObjectURL(f));
    setPreviews(urls);
    return ()=>urls.forEach(u=>URL.revokeObjectURL(u));
  },[files]);
  const pick=(e)=>{
    const chosen = Array.from(e.target.files||[]).filter(f=>/^image\//.test(f.type));
    if(chosen.length !== (e.target.files||[]).length) setErr('Only image files can be attached.');
    setFiles(chosen.slice(0,6));
    if(chosen.length>6) setErr('You can attach up to 6 photos. Only the first 6 were kept.');
  };
  const submit=async(e)=>{
    e.preventDefault(); setErr(''); setInfo('');
    if(!user){ setErr('Please sign in or sign up to leave a memory.'); return; }
    if(!msg.trim()){ setErr('Please write your memory/message first.'); return; }
    if(files.length>6){ setErr('You can attach up to 6 photos.'); return; }
    setSending(true);
    try{
      const fd=new FormData();
      fd.append('message',msg.trim());
      files.forEach(f=>fd.append('images',f,f.name));
      const r=await api.post('/api/comments',fd);
      setInfo(r.data.message);
      setMsg(''); setFiles([]);
      if(inputRef.current) inputRef.current.value='';
      load();
    }
    catch(ex){ setErr(ex.response?.data?.error||'Failed to submit. Please try again.'); }
    finally{ setSending(false); }
  };
  return <div className="wrap">
    <h1 className="reveal" style={{color:'#0f1f3d'}}>Memories of Jhon 💐</h1>
    {light && <div className="lightbox" onClick={()=>setLight('')}><button onClick={()=>setLight('')}>✕</button><img src={light} alt="" /></div>}
    <div className="card reveal" style={{marginBottom:18}}>
      <h3>Leave a memory / comment</h3>
      {err && <div className="err">{err}</div>}{info && <div className="ok">{info}</div>}
      {!user ? <p style={{fontFamily:'Arial'}}>You need an account so we can notify you every death anniversary. <Link to="/login">Sign in</Link> or <Link to="/signup">Sign up with your active email</Link>.</p> :
      <form onSubmit={submit}>
        <textarea rows="4" placeholder="Share your favorite memory of Jhon Ora…" value={msg} onChange={e=>setMsg(e.target.value)} />
        <label>Attach photos related to Jhon (you can select multiple, up to 6)</label>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={pick} />
        {files.length>0 && <div className="preview">{previews.map((s,i)=><img key={i} src={s} alt={'selected '+(i+1)} />)}</div>}
        <button className="btn gold pulse-grow" type="submit" disabled={sending}>{sending ? 'Posting…' : '🕊️ Submit for Review'}</button>
        <div style={{fontFamily:'Arial',fontSize:12,color:'#64748b',marginTop:6}}>{user.role==='guest' ? 'Guest comments are reviewed by admin/superadmin before display.' : 'Admin posts are published immediately.'}</div>
      </form>}
    </div>
    {!data && <p>Loading…</p>}
    {data && data.years.map(yr=><div key={yr}>
      <div className="year reveal">{yr} <span style={{fontFamily:'Arial',fontSize:13,color:'#64748b'}}>({data.byYear[yr].length} memories)</span></div>
      <div className="grid">{data.byYear[yr].map(m=>{ const a=imgs(m); return <div key={m.id} className="card mem reveal">
        {a[0] && <img className="main" src={imgUrl(a[0])} alt="memory of Jhon" onClick={()=>setLight(imgUrl(a[0]))} />}
        {a.length>1 && <div className="thumbs">{a.slice(1,5).map((s,i)=><img key={i} src={imgUrl(s)} alt="" onClick={()=>setLight(imgUrl(s))} />)}{a.length>5 && <span className="badge">+{a.length-5} more</span>}</div>}
        <div style={{marginTop:8}}><b>{m.name}</b></div>
        <div><span className="badge">{m.relation}</span>{m.batchLevel && <span className="badge">{m.batchLevel}</span>}<span className="badge">{new Date(m.createdAt).toLocaleDateString()}</span></div>
        <p style={{fontFamily:'Arial',fontSize:14}}>{m.message}</p>
      </div>;})}</div>
    </div>)}
  </div>;
}

