const nodemailer = require('nodemailer');

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || '"In Loving Memory of Jhon Ora" <no-reply@jhonora.memorial>';
  if (!transporter) {
    console.log('==== EMAIL (dev log, SMTP not configured) ====');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(html);
    console.log('==============================================');
    return { logged: true };
  }
  await transporter.sendMail({ from, to, subject, html });
  return { sent: true };
}

function anniversaryEmail({ name, siteUrl, yearsSince, deathMonth, deathDay }) {
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#f8fafc;padding:24px;border-radius:12px">
    <div style="text-align:center">
      <div style="font-size:13px;letter-spacing:3px;color:#64748b">IN LOVING MEMORY</div>
      <h1 style="color:#0f172a;margin:8px 0">Jhon Sollano Ora</h1>
      <div style="color:#475569;font-style:italic">"Princess John Ora" • BSICT Class 2020</div>
    </div>
    <p>Dear ${name || 'friend'},</p>
    <p>Today marks <b>${yearsSince} year${yearsSince === 1 ? '' : 's'}</b> since Jhon passed away (${deathMonth}/${deathDay}). We remember his smile, kindness, and light that continues to live in all of us.</p>
    <p>We invite you to visit his memorial, light a candle in prayer, and share a memory or photo:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${siteUrl}" style="background:#0f172a;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none">Visit Memorial Website</a>
    </div>
    <p style="color:#64748b;font-size:13px">You receive this because you signed up to remember Jhon. Reply to this email if you wish to be removed.</p>
    <p>With love and remembrance,<br/>Jhon Ora Memorial Family</p>
  </div>`;
}

module.exports = { sendMail, anniversaryEmail, getTransporter };
