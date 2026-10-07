const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Render persistent disk: set DATA_DIR=/var/data (see render.yaml).
// Local dev: falls back to the server folder.
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'db.json');

const DEFAULT_OPTIONS = {
  relations: ['friend', 'family', 'batchmate', 'relatives'],
  batchLevels: ['College', 'Highschool', 'Elementary', 'Others']
};

const DEFAULT_SETTINGS = {
  deathMonth: parseInt(process.env.DEATH_MONTH || '10', 10),
  deathDay: parseInt(process.env.DEATH_DAY || '7', 10),
  siteUrl: process.env.SITE_URL || 'http://localhost:5173',
  honoreeName: 'Jhon Sollano Ora',
  aka: 'Princess John Ora',
  classInfo: 'BSICT Students Class 2020'
};

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const data = { users: [], comments: [], notifications: [], options: DEFAULT_OPTIONS, settings: DEFAULT_SETTINGS, meta: { lastAnniversarySentYear: null } };
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return data;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const data = JSON.parse(raw);
    data.users = data.users || [];
    data.comments = data.comments || [];
    data.notifications = data.notifications || [];
    data.options = { ...DEFAULT_OPTIONS, ...(data.options || {}) };
    data.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    data.meta = data.meta || {};
    return data;
  } catch (e) {
    console.error('DB parse error, resetting', e);
    return { users: [], comments: [], notifications: [], options: DEFAULT_OPTIONS, settings: DEFAULT_SETTINGS, meta: {} };
  }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function uid(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function ensureSuperAdmin() {
  const db = load();
  const email = (process.env.SUPERADMIN_EMAIL || 'superadmin@jhonora.memorial').toLowerCase();
  const pass = process.env.SUPERADMIN_PASSWORD || 'JhonOra2024!';
  let user = db.users.find(u => u.role === 'superadmin');
  if (!user) {
    const existing = db.users.find(u => u.email.toLowerCase() === email);
    const hash = await bcrypt.hash(pass, 10);
    if (existing) {
      existing.role = 'superadmin';
      existing.passwordHash = hash;
      existing.verified = true;
      existing.notify = true;
      user = existing;
    } else {
      user = {
        id: uid('u'),
        name: 'Super Admin',
        email,
        passwordHash: hash,
        role: 'superadmin',
        relation: 'family',
        batchLevel: '',
        verified: true,
        notify: true,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
    }
    save(db);
    console.log(`[init] Superadmin ensured: ${email}`);
  }
  return user;
}

module.exports = { load, save, uid, ensureSuperAdmin, DB_PATH, DATA_DIR };
