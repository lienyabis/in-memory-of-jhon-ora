const jwt = require('jsonwebtoken');
const { load } = require('../db');

const SECRET = process.env.JWT_SECRET || 'change-this-to-a-long-random-secret';

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const payload = jwt.verify(token, SECRET);
    const db = load();
    const user = db.users.find(u => u.id === payload.id);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired, please login again' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Login required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Not allowed for your role' });
    next();
  };
}

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, SECRET, { expiresIn: '7d' });
}

module.exports = { auth, requireRole, sign, SECRET };
