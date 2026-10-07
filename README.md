# In Loving Memory of Jhon Sollano Ora 🕊️

Memorial website with roles, moderated memories photo grid, and yearly death-anniversary emails.

## Features
- **Roles:** 1 superadmin (full control, creates admins), admins (all access except cannot modify superadmin), guests (signup with active email to comment + get anniversary emails)
- **Signup:** active email, relation (friend/family/batchmate/relatives + custom added in dashboard), if batchmate → College/Highschool/Elementary/Others (+ custom), password
- **Comments:** guests sign in to post with optional image → pending → admin/superadmin approve → displayed ordered by year as photo grid
- **Anniversary email:** every year on death date (set in dashboard or .env DEATH_MONTH/DEATH_DAY) all accounts get email with link to site. Auto at 8am daily-check + manual "Send now" in dashboard.
- **Dashboard:** review comments, create admins, add signup options, set anniversary date + site URL, email log, stats

## Run locally (Windows)
1. Backend:
```
cd memorial-website/server
copy .env.example .env
REM edit .env: SUPERADMIN_EMAIL/PASSWORD, DEATH_MONTH/DEATH_DAY, SMTP_*, SITE_URL
npm install
npm start
```
Server: http://localhost:5000 — superadmin auto-created from .env.

2. Frontend (new terminal):
```
cd memorial-website/client
npm install
npm run dev
```
Site: http://localhost:5173

Test anniversary send: `npm run send-anniversary` in server, or Dashboard → Anniversary → Send email now.

## Real emails (Gmail)
- Create Gmail App Password, set SMTP_USER=you@gmail.com SMTP_PASS=apppassword. Without SMTP, emails log to server console (dev mode).

## Deploy notes
- Frontend: Vercel/Netlify (set VITE proxy or API URL). Backend: Render/Railway with persistent disk for db.json/uploads, set env vars, keep process always-on for cron.
- Update DEATH date to Jhon's actual passing date in dashboard Settings.
