require('dotenv').config();
const { load, save } = require('./db');
const { sendMail, anniversaryEmail } = require('./mailer');

async function checkAndSendAnniversary(force=false) {
  const db = load();
  const now = new Date();
  const m = now.getMonth()+1, d = now.getDate(), y = now.getFullYear();
  const sm = db.settings.deathMonth, sd = db.settings.deathDay;
  const isToday = (m===sm && d===sd);
  if (!isToday && !force) return { sent:false, reason:'Not anniversary today' };
  if (!force && db.meta.lastAnniversarySentYear===y) return { sent:false, reason:'Already sent this year' };
  const targets = db.users.filter(u=>u.notify && u.email);
  let sent = 0, failed = 0;
  const yearsSince = 1;
  for (const u of targets) {
    try {
      await sendMail({ to:u.email, subject:`In Loving Memory of Jhon Ora — ${y} Remembrance`, html:anniversaryEmail({ name:u.name, siteUrl:db.settings.siteUrl, yearsSince, deathMonth:sm, deathDay:sd }) });
      sent++;
    } catch(e){ console.error('mail fail',u.email,e.message); failed++; }
  }
  db.meta.lastAnniversarySentYear = y;
  db.notifications.push({ id:'n_'+Date.now(), year:y, sent, failed, total:targets.length, at:new Date().toISOString(), forced:!!force });
  save(db);
  return { sent:true, year:y, emailed:sent, failed, total:targets.length };
}

if (require.main===module) {
  const force = process.argv.includes('--now');
  checkAndSendAnniversary(force).then(r=>{ console.log(r); process.exit(0); });
}
module.exports = { checkAndSendAnniversary };
