const express = require('express');
const bcrypt = require('bcryptjs');
const { load, save, uid } = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();
router.use(auth, requireRole('admin', 'superadmin'));
router.get('/comments', (req, res) => {
  const db = load();
  const { status } = req.query;
  let list = [...db.comments].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if (status) list = list.filter(c=>c.status===status);
  res.json(list);
});
router.put('/comments/:id', (req, res) => {
  const db = load();
  const c = db.comments.find(x=>x.id===req.params.id);
  if (!c) return res.status(404).json({ error:'Not found' });
  if (c.status==='approved' || c.status==='rejected') {
    return res.status(400).json({ error:'This memory was already '+c.status+' and is read-only. Delete it if you must remove it.' });
  }
  const { status } = req.body || {};
  if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ error:'Invalid status' });
  c.status = status; c.reviewedBy = req.user.email; c.reviewedAt = new Date().toISOString();
  save(db); res.json(c);
});
router.delete('/comments/:id', (req, res) => {
  const db = load();
  const idx = db.comments.findIndex(x=>x.id===req.params.id);
  if (idx<0) return res.status(404).json({ error:'Not found' });
  const [rm] = db.comments.splice(idx,1); save(db);
  try{
    const fs=require('fs'); const path=require('path');
    const all = [...(Array.isArray(rm.images)?rm.images:[]), ...(rm.image?[rm.image]:[])];
    [...new Set(all)].forEach(u=>{
      const p=path.join(__dirname,'..',String(u).replace('/uploads/','uploads/').replace(/^\/+/,''));
      if(p.includes('uploads') && fs.existsSync(p)) fs.unlinkSync(p);
    });
  }catch{}
  res.json({ ok:true });
});
router.get('/users', (req, res) => {
  const db = load();
  res.json(db.users.map(u=>({ id:u.id,name:u.name,email:u.email,role:u.role,relation:u.relation,batchLevel:u.batchLevel,notify:u.notify,createdAt:u.createdAt })));
});
router.post('/users/admin', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name||!email||!password) return res.status(400).json({ error:'Name, email, password required' });
  if (password.length<6) return res.status(400).json({ error:'Password min 6 chars' });
  const db = load();
  if (db.users.some(u=>u.email.toLowerCase()===String(email).toLowerCase())) return res.status(400).json({ error:'Email exists' });
  const user = { id:uid('u'),name,email,passwordHash:bcrypt.hashSync(password,10),role:'admin',relation:'family',batchLevel:'',verified:true,notify:true,createdAt:new Date().toISOString() };
  db.users.push(user); save(db);
  res.json({ id:user.id,name:user.name,email:user.email,role:user.role });
});
router.delete('/users/:id', (req, res) => {
  const db = load();
  const t = db.users.find(u=>u.id===req.params.id);
  if (!t) return res.status(404).json({ error:'Not found' });
  if (t.role==='superadmin') {
    if (req.user.role!=='superadmin') return res.status(403).json({ error:'Only superadmin can modify superadmin access' });
    return res.status(400).json({ error:'Cannot delete the superadmin (only 1 allowed)' });
  }
  if (t.id===req.user.id) return res.status(400).json({ error:'Cannot delete yourself' });
  db.users = db.users.filter(u=>u.id!==t.id); save(db);
  res.json({ ok:true });
});
router.get('/options', (req, res) => { res.json(load().options); });
router.post('/options', (req, res) => {
  const { type, value } = req.body || {};
  if (!['relations','batchLevels'].includes(type)) return res.status(400).json({ error:'Invalid type' });
  if (!value||!String(value).trim()) return res.status(400).json({ error:'Value required' });
  const db = load(); const v = String(value).trim();
  if (db.options[type].map(x=>x.toLowerCase()).includes(v.toLowerCase())) return res.status(400).json({ error:'Already exists' });
  db.options[type].push(v); save(db); res.json(db.options);
});
router.delete('/options', (req, res) => {
  const { type, value } = req.body || {};
  const db = load();
  db.options[type] = db.options[type].filter(x=>x.toLowerCase()!==String(value).toLowerCase());
  save(db); res.json(db.options);
});
router.get('/settings', (req, res) => { res.json(load().settings); });
router.put('/settings', (req, res) => {
  const db = load();
  const { deathMonth, deathDay, siteUrl } = req.body || {};
  if (deathMonth) db.settings.deathMonth = Math.min(12,Math.max(1,parseInt(deathMonth)));
  if (deathDay) db.settings.deathDay = Math.min(31,Math.max(1,parseInt(deathDay)));
  if (siteUrl) db.settings.siteUrl = siteUrl;
  save(db); res.json(db.settings);
});
router.get('/notifications', (req, res) => {
  const db = load(); res.json((db.notifications||[]).slice().reverse().slice(0,100));
});
router.get('/stats', (req, res) => {
  const db = load();
  res.json({ totalUsers:db.users.length, guests:db.users.filter(u=>u.role==='guest').length, admins:db.users.filter(u=>u.role==='admin').length, pending:db.comments.filter(c=>c.status==='pending').length, approved:db.comments.filter(c=>c.status==='approved').length, rejected:db.comments.filter(c=>c.status==='rejected').length });
});
module.exports = router;
