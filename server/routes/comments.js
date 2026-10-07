const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { load, save, uid, DATA_DIR } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, 'mem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// Public: approved comments grouped by year
router.get('/', (req, res) => {
  const db = load();
  const approved = db.comments
    .filter(c => c.status === 'approved')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const byYear = {};
  for (const c of approved) {
    const y = new Date(c.createdAt).getFullYear();
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(publicComment(c, db));
  }
  const years = Object.keys(byYear).sort((a, b) => b - a);
  res.json({ years, byYear, total: approved.length });
});

// Guest creates comment (must be logged in). Multiple images supported.
// Admin/superadmin comments are auto-approved; guest comments go to pending.
router.post('/', auth, (req, res, next) => {
  upload.array('images', 6)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Each photo must be 8MB or smaller.' });
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'You can attach up to 6 photos.' });
      return res.status(400).json({ error: err.message || 'Photo upload failed. Only images are allowed.' });
    }
    next();
  });
}, (req, res) => {
  if (req.user.role !== 'guest' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Not allowed' });
  }
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'Please write your memory/message' });
  const db = load();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Account not found. Please sign in again.' });
  const files = req.files || [];
  const images = files.map(f => '/uploads/' + f.filename);
  const isStaff = user.role === 'admin' || user.role === 'superadmin';
  const status = isStaff ? 'approved' : 'pending';
  const c = {
    id: uid('c'),
    userId: user.id,
    name: user.name,
    email: user.email,
    relation: user.relation,
    batchLevel: user.batchLevel || '',
    message: message.trim(),
    image: images[0] || '',
    images,
    status,
    reviewedBy: isStaff ? user.email : undefined,
    reviewedAt: isStaff ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString()
  };
  db.comments.push(c);
  save(db);
  res.json({
    message: isStaff ? 'Your memory was published.' : 'Thank you. Your memory was submitted and is waiting for review.',
    comment: c
  });
});

// Own comments
router.get('/mine', auth, (req, res) => {
  const db = load();
  const mine = db.comments.filter(c => c.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(mine);
});

function publicComment(c, db) {
  const images = Array.isArray(c.images) && c.images.length ? c.images : (c.image ? [c.image] : []);
  return {
    id: c.id,
    name: c.name,
    relation: c.relation,
    batchLevel: c.batchLevel,
    message: c.message,
    image: c.image || images[0] || '',
    images,
    createdAt: c.createdAt,
    year: new Date(c.createdAt).getFullYear()
  };
}

module.exports = router;
