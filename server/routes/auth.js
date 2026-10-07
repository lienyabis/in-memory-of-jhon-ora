const express = require('express');
const bcrypt = require('bcryptjs');
const { load, save, uid } = require('../db');
const { sign, auth } = require('../middleware/auth');

const router = express.Router();

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');
}

// GET signup options (public)
router.get('/options', (req, res) => {
  const db = load();
  res.json(db.options);
});

// SIGNUP: active email, relation, batchLevel if batchmate, password
router.post('/signup', async (req, res) => {
  const { name, email, password, relation, batchLevel } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Please enter your name' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Please enter an active email address' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const db = load();
  const rel = (relation || '').toLowerCase();
  if (!db.options.relations.map(r => r.toLowerCase()).includes(rel)) {
    return res.status(400).json({ error: 'Please select your relation to Jhon Ora' });
  }
  if (rel === 'batchmate') {
    const levels = db.options.batchLevels.map(b => b.toLowerCase());
    if (!batchLevel || !levels.includes(String(batchLevel).toLowerCase())) {
      return res.status(400).json({ error: 'Please select batch level: College, Highschool, Elementary, Others' });
    }
  }
  if (db.users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(400).json({ error: 'Email already registered. Please sign in.' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: uid('u'),
    name: name.trim(),
    email: email.trim(),
    passwordHash: hash,
    role: 'guest',
    relation: rel,
    batchLevel: rel === 'batchmate' ? batchLevel : '',
    verified: true, // active email assumed; SMTP verify optional
    notify: true,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  save(db);
  const token = sign(user);
  res.json({ token, user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const db = load();
  const user = db.users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
  if (!user) return res.status(400).json({ error: 'Account not found for this email' });
  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Wrong password' });
  const token = sign(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put('/me/notify', auth, (req, res) => {
  const db = load();
  const u = db.users.find(x => x.id === req.user.id);
  u.notify = req.body.notify !== false;
  save(db);
  res.json({ user: publicUser(u) });
});

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, relation: u.relation, batchLevel: u.batchLevel, notify: u.notify, createdAt: u.createdAt };
}

module.exports = router;
