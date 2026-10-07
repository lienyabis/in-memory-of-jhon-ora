import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Nav from './Nav';
import HeavenBackground from './HeavenBackground';
import Home from './pages/Home';
import Memories from './pages/Memories';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
function Guard({ children, roles }){
  const { user, loading } = useAuth();
  if (loading) return <div className="wrap">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}
export default function App(){
  return <AuthProvider><BrowserRouter>
    <HeavenBackground />
    <Nav />
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/memories" element={<Memories/>} />
      <Route path="/login" element={<Login/>} />
      <Route path="/signup" element={<Signup/>} />
      <Route path="/dashboard" element={<Guard roles={['admin','superadmin']}><Dashboard/></Guard>} />
    </Routes>
    <div className="footer">In Loving Memory of Jhon Sollano Ora • “Princess John Ora” • BSICT Class 2020 🕊️</div>
  </BrowserRouter></AuthProvider>;
}

