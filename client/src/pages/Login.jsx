import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import useReveal from '../useReveal';
export default function Login(){
  const { login } = useAuth(); const nav=useNavigate();
  const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [err,setErr]=useState('');
  useReveal('');
  const go=async(e)=>{ e.preventDefault(); setErr('');
    try{ const u=await login(email,pw); nav(u.role==='guest'?'/memories':'/dashboard'); }
    catch(ex){ setErr(ex.response?.data?.error||'Login failed'); } };
  return <div className="wrap"><form className="auth card reveal" onSubmit={go}>
    <div style={{textAlign:'center',fontSize:40}}>🕊️</div>
    <h2 style={{textAlign:'center',color:'#0f1f3d',margin:'6px 0'}}>Welcome Back</h2>
    <p style={{fontFamily:'Arial',fontSize:13,color:'#64748b',textAlign:'center'}}>Sign in to share memories of Jhon Ora</p>
    {err && <div className="err">{err}</div>}
    <label>Active email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" />
    <label>Password</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} />
    <button className="btn gold" style={{width:'100%',marginTop:10}}>Sign In</button>
    <p style={{fontFamily:'Arial',fontSize:13,textAlign:'center'}}>No account? <Link to="/signup">Sign up</Link></p>
  </form></div>;
}

