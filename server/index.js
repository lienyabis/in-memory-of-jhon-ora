require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { ensureSuperAdmin, DATA_DIR } = require('./db');
const { checkAndSendAnniversary } = require('./anniversary');

const app = express();
// Frontend origin(s) allowed to call the API. Comma-separated, e.g.
// CLIENT_URL=https://jhon-ora-memorial.onrender.com
const CLIENT_URL = process.env.CLIENT_URL || process.env.SITE_URL || 'http://localhost:5173';
app.use(cors({ origin: CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean), credentials: true }));
app.use(express.json());

const uploadDir = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.post('/api/admin/send-anniversary-now', require('./middleware/auth').auth, require('./middleware/auth').requireRole('admin','superadmin'), async (req,res)=>{
  const r = await checkAndSendAnniversary(true);
  res.json(r);
});

// Serve built frontend when deployed as single service (server/client_dist)
const clientDist = path.join(__dirname, 'client_dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  ensureSuperAdmin().then(()=>{
    app.listen(PORT, ()=> console.log(`Memorial server on :${PORT} (data: ${DATA_DIR})`));
  });
  // every day 8am check anniversary (skip during builds/tests)
  if (process.env.DISABLE_CRON !== '1') {
    cron.schedule('0 8 * * *', async ()=>{
      console.log('[cron] checking anniversary...');
      await checkAndSendAnniversary(false);
    });
  }
}
module.exports = app;

