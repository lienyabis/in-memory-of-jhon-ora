import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
export default function Nav(){
  const { user, logout } = useAuth();
  const [open,setOpen]=useState(false);
  return <div className="topbar">
    <div className="brand">🕊️ Jhon Ora Memorial</div>
    <button className="hamb" onClick={()=>setOpen(!open)} aria-label="menu">☰</button>
    <nav className={open?'open':''} onClick={()=>setOpen(false)}>
      <Link to="/" style={{color:'#fff'}} >Home</Link>
      <Link to="/memories" style={{color:'#fff'}} >Memories</Link>
      {user && (user.role==='admin'||user.role==='superadmin') && <Link to="/dashboard" style={{color:'#fff'}} >Dashboard</Link>}
      {!user && <><Link to="/login" style={{color:'#fff'}}>Sign In</Link><Link to="/signup" style={{color:'#fff'}}>Sign Up</Link></>}
      {user && <span style={{marginLeft:10,fontFamily:'Arial',fontSize:13,color:'#fff'}}>{user.name} ({user.role}) <button className="btn light" style={{padding:'4px 12px',marginLeft:8}} onClick={logout}>Logout</button></span>}
    </nav>
  </div>;
}

