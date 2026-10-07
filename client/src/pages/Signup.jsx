import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import useReveal from '../useReveal';
export default function Signup(){
  const { signup } = useAuth(); const nav=useNavigate();
  const [opts,setOpts]=useState({ relations:['friend','family','batchmate','relatives'], batchLevels:['College','Highschool','Elementary','Others'] });
  const [f,setF]=useState({ name:'', email:'', password:'', relation:'', batchLevel:'' });
  const [err,setErr]=useState('');
  useEffect(()=>{ api.get('/api/auth/options').then(r=>setOpts(r.data)).catch(()=>{}); },[]);
  useReveal(JSON.stringify(opts));
  const go=async(e)=>{ e.preventDefault(); setErr('');
    try{ const u=await signup(f); nav(u.role==='guest'?'/memories':'/dashboard'); }
    catch(ex){ setErr(ex.response?.data?.error||'Signup failed'); } };
  const isBatch = f.relation.toLowerCase()==='batchmate';
  return <div className="wrap"><form className="auth card reveal" onSubmit={go}>
    <div style={{textAlign:'center',fontSize:40}}>🕊️</div>
    <h2 style={{textAlign:'center',color:'#0f1f3d',margin:'6px 0'}}>Sign Up to Remember Jhon</h2>
    <p style={{fontFamily:'Arial',fontSize:13,color:'#475569'}}>Use your active email so you'll get notified every death anniversary with a link to this memorial.</p>
    {err && <div className="err">{err}</div>}
    <label>Full name</label><input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Your name" />
    <label>Active email</label><input value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="you@email.com" />
    <label>Relation to Jhon Ora</label>
    <select value={f.relation} onChange={e=>setF({...f,relation:e.target.value,batchLevel:''})}>
      <option value="">-- select --</option>
      {opts.relations.map(r=><option key={r} value={r}>{r}</option>)}
    </select>
    {isBatch && <><label>Batch level (batchmate)</label>
      <select value={f.batchLevel} onChange={e=>setF({...f,batchLevel:e.target.value})}>
        <option value="">-- select --</option>
        {opts.batchLevels.map(b=><option key={b} value={b}>{b}</option>)}
      </select></>}
    <label>Password</label><input type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})} placeholder="min 6 characters" />
    <button className="btn gold" style={{width:'100%',marginTop:8}}>Sign Up</button>
    <p style={{fontFamily:'Arial',fontSize:13}}>Have an account? <Link to="/login">Sign in</Link></p>
  </form></div>;
}
