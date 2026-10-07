require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { ensureSuperAdmin } = require('./db');
const { checkAndSendAnniversary } = require('./anniversary');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.post('/api/admin/send-anniversary-now', require('./middleware/auth').auth, require('./middleware/auth').requireRole('admin','superadmin'), async (req,res)=>{
  const r = await checkAndSendAnniversary(true);
  res.json(r);
});

const PORT = process.env.PORT || 5000;
ensureSuperAdmin().then(()=>{
  app.listen(PORT, ()=> console.log(`Memorial server on http://localhost:${PORT}`));
});

// every day 8am check anniversary
cron.schedule('0 8 * * *', async ()=>{
  console.log('[cron] checking anniversary...');
  await checkAndSendAnniversary(false);
});
