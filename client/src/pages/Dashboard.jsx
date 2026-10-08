import React, { useEffect, useState } from 'react';
import api, { imgUrl } from '../api';
import { useAuth } from '../AuthContext';
export default function Dashboard(){
  const { user } = useAuth();
  const [tab,setTab]=useState('pending');
  const [stats,setStats]=useState(null);
  const [comments,setComments]=useState([]);
  const [users,setUsers]=useState([]);
  const [opts,setOpts]=useState(null);
  const [settings,setSettings]=useState(null);
  const [notes,setNotes]=useState([]);
  const [msg,setMsg]=useState(''); const [err,setErr]=useState('');
  const [newAdmin,setNewAdmin]=useState({name:'',email:'',password:''});
  const [newOpt,setNewOpt]=useState({relations:'',batchLevels:''});
  const loadAll=async()=>{
    try{
      const [s,c,u,o,st,n]=await Promise.all([api.get('/api/admin/stats'),api.get('/api/admin/comments'),api.get('/api/admin/users'),api.get('/api/admin/options'),api.get('/api/admin/settings'),api.get('/api/admin/notifications')]);
      setStats(s.data); setComments(c.data); setUsers(u.data); setOpts(o.data); setSettings(st.data); setNotes(n.data);
    }catch(ex){ setErr(ex.response?.data?.error||'Failed to load'); }
  };
  useEffect(()=>{ loadAll(); },[]);
  const say=(t)=>{ setMsg(t); setTimeout(()=>setMsg(''),3500); };
  const review=async(id,status)=>{
    try{ await api.put('/api/admin/comments/'+id,{status}); loadAll(); say('Memory '+status); }
    catch(ex){ alert(ex.response?.data?.error||'This memory is read-only.'); }
  };
  const delC=async(id)=>{ if(!confirm('Delete this memory?')) return; await api.delete('/api/admin/comments/'+id); loadAll(); };
  const delU=async(id)=>{ if(!confirm('Remove this account?')) return; try{ await api.delete('/api/admin/users/'+id); loadAll(); }catch(ex){ alert(ex.response?.data?.error||'Failed'); } };
  const createAdmin=async(e)=>{ e.preventDefault(); setErr('');
    try{ await api.post('/api/admin/users/admin',newAdmin); setNewAdmin({name:'',email:'',password:''}); loadAll(); say('Admin created'); }
    catch(ex){ setErr(ex.response?.data?.error||'Failed'); } };
  const addOpt=async(type)=>{ const v=newOpt[type]; if(!v.trim()) return;
    try{ const r=await api.post('/api/admin/options',{type,value:v}); setOpts(r.data); setNewOpt({...newOpt,[type]:''}); say('Option added'); }
    catch(ex){ alert(ex.response?.data?.error||'Failed'); } };
  const delOpt=async(type,value)=>{ if(!confirm('Delete "'+value+'"?')) return;
    try{ const r=await api.delete('/api/admin/options',{data:{type,value}}); setOpts(r.data); }catch(ex){ alert('Failed'); } };
  const saveSettings=async(e)=>{ e.preventDefault();
    const r=await api.put('/api/admin/settings',settings); setSettings(r.data); say('Saved'); };
  const sendNow=async()=>{ if(!confirm('Send anniversary email to ALL now?')) return;
    const r=await api.post('/api/admin/send-anniversary-now'); say('Emailed '+r.data.emailed+'/'+r.data.total); loadAll(); };
  const list = tab==='pending'?comments.filter(c=>c.status==='pending'):tab==='approved'?comments.filter(c=>c.status==='approved'):tab==='rejected'?comments.filter(c=>c.status==='rejected'):comments;
  return <div className="wrap">
    <h1>Dashboard <span className="badge">{user?.role}</span></h1>
    {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
    {stats && <div className="statrow">
      <div className="stat"><b>{stats.pending}</b>Pending</div>
      <div className="stat"><b>{stats.approved}</b>Approved</div>
      <div className="stat"><b>{stats.guests}</b>Guests</div>
      <div className="stat"><b>{stats.admins}</b>Admins</div>
      <div className="stat"><b>{stats.totalUsers}</b>Total</div>
    </div>}
    <div className="dash">
      <div className="side">
        {[['pending','Review comments'],['all','All memories'],['users','Users & Admins'],['options','Signup options'],['settings','Anniversary & Site'],['log','Email log']].map(([k,l])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{l}</button>)}
      </div>
      <div>
      {(tab==='pending'||tab==='all'||tab==='approved'||tab==='rejected') && <div className="card">
        <div className="tabs">{['pending','approved','rejected','all'].map(s=><button key={s} className={tab===s?'on':''} onClick={()=>setTab(s)}>{s}</button>)}</div>
        {list.length===0 && <p style={{fontFamily:'Arial'}}>Nothing here.</p>}
        {list.map(c=>{ const done = c.status==='approved' || c.status==='rejected'; return <div key={c.id} style={{borderBottom:'1px solid #e2e8f0',padding:'10px 0'}}>
          <b>{c.name}</b> <span className="badge">{c.relation}{c.batchLevel?` - ${c.batchLevel}`:''}</span> <span className="badge">{c.status}</span>
          {done && <span className="badge" style={{background:'#f1f5f9'}}>read-only</span>}
          <p style={{fontFamily:'Arial'}}>{c.message}</p>
          {(Array.isArray(c.images)&&c.images.length?c.images:(c.image?[c.image]:[])).slice(0,4).map((s,i)=><img key={i} src={imgUrl(s)} alt="" style={{width:120,height:90,objectFit:'cover',borderRadius:8,marginRight:6}} />)}
          <div style={{fontFamily:'Arial',fontSize:12,color:'#64748b'}}>{c.email} - {new Date(c.createdAt).toLocaleString()}{c.reviewedBy ? ` • reviewed by ${c.reviewedBy}` : ''}</div>
          <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
            <button className="btn" style={{padding:'6px 14px'}} disabled={done} title={done?'Already '+c.status:''} onClick={()=>review(c.id,'approved')}>{c.status==='approved' ? '✓ Approved' : 'Approve'}</button>
            <button className="btn light" style={{padding:'6px 14px'}} disabled={done} title={done?'Already '+c.status:''} onClick={()=>review(c.id,'rejected')}>{c.status==='rejected' ? '✕ Rejected' : 'Reject'}</button>
            <button className="btn light" style={{padding:'6px 14px'}} onClick={()=>delC(c.id)}>Delete</button>
          </div>
        </div>;})}
      </div>}
      {tab==='users' && <div className="card">
        <h3>Create admin account</h3>
        <form onSubmit={createAdmin} style={{display:'grid',gap:8}}>
          <input placeholder="Name" value={newAdmin.name} onChange={e=>setNewAdmin({...newAdmin,name:e.target.value})} />
          <input placeholder="Email" value={newAdmin.email} onChange={e=>setNewAdmin({...newAdmin,email:e.target.value})} />
          <input placeholder="Password" type="password" value={newAdmin.password} onChange={e=>setNewAdmin({...newAdmin,password:e.target.value})} />
          <button className="btn">Create admin</button>
        </form>
        <table className="table" style={{marginTop:12}}><thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
          <td>{u.role!=='superadmin' ? <button className="btn light" style={{padding:'4px 10px'}} onClick={()=>delU(u.id)}>Remove</button> : <span className="badge">protected</span>}</td></tr>)}</tbody></table>
      </div>}
      {tab==='options' && opts && <div className="card">
        <h3>Signup options</h3>
        {['relations','batchLevels'].map(t=><div key={t} style={{marginBottom:14}}>
          <b style={{textTransform:'capitalize'}}>{t}</b>
          <div style={{margin:'8px 0'}}>{opts[t].map(v=><span key={v} className="badge">{v} <button style={{border:0,background:'transparent',cursor:'pointer'}} onClick={()=>delOpt(t,v)}>x</button></span>)}</div>
          <div style={{display:'flex',gap:8}}><input placeholder={'Add to '+t} value={newOpt[t]} onChange={e=>setNewOpt({...newOpt,[t]:e.target.value})} /><button className="btn" onClick={()=>addOpt(t)}>Add</button></div>
        </div>)}
      </div>}
      {tab==='settings' && settings && <div className="card">
        <h3>Death anniversary and site link</h3>
        <form onSubmit={saveSettings}>
          <label>Death month (1-12)</label><input type="number" min="1" max="12" value={settings.deathMonth} onChange={e=>setSettings({...settings,deathMonth:e.target.value})} />
          <label>Death day (1-31)</label><input type="number" min="1" max="31" value={settings.deathDay} onChange={e=>setSettings({...settings,deathDay:e.target.value})} />
          <label>Memorial site URL (link in email)</label><input value={settings.siteUrl} onChange={e=>setSettings({...settings,siteUrl:e.target.value})} />
          <div style={{display:'flex',gap:8,marginTop:8}}><button className="btn">Save</button><button type="button" className="btn gold" onClick={sendNow}>Send email now</button></div>
        </form>
        <div className="alert">Auto-sends yearly at 8am on {settings.deathMonth}/{settings.deathDay}. Set SMTP in server .env for real emails.</div>
      </div>}
      {tab==='log' && <div className="card">
        <h3>Email log</h3>
        {notes.length===0 && <p style={{fontFamily:'Arial'}}>No sends yet.</p>}
        <table className="table"><thead><tr><th>When</th><th>Year</th><th>Sent</th><th>Total</th></tr></thead>
        <tbody>{notes.map(n=><tr key={n.id}><td>{new Date(n.at).toLocaleString()}</td><td>{n.year}</td><td>{n.sent}</td><td>{n.total}</td></tr>)}</tbody></table>
      </div>}
      </div>
    </div>
  </div>;
}
