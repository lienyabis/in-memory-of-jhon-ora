# In Loving Memory of Jhon Sollano Ora 🕊️

Memorial website with roles, moderated memories photo grid, and yearly
death-anniversary emails.

**Stack (free-hosting friendly):**

| Part | Tech | Hosted on |
|---|---|---|
| Frontend | React + Vite (static build) | **Render** — Static Site (free) |
| Backend | **Pure PHP** (no framework, no composer) | **InfinityFree** — free PHP hosting |
| Database | **MySQL** (tables auto-created on first request) | InfinityFree MySQL (free) |
| Anniversary cron | `backend/cron.php` hit daily by cron-job.org (free) | cron-job.org (free) |

> ⚠️ **InfinityFree limitation you must know:** InfinityFree free hosting runs a
> bot check that blocks cross-domain API calls (fetch from another site). Your
> **browser** works fine, but API calls from Render's domain *may* be
> challenged. If the live site shows API errors, use **Production option B**
> below (host everything on InfinityFree — same-domain requests always pass).
> This backend is a standalone PHP app so both options work unchanged.

---

## 1. Local development (Windows)

You need: **PHP 8+**, **MySQL running** (WAMP/XAMPP), **Node 18+**.

### A. Backend (pure PHP + MySQL) — terminal 1

```powershell
cd memorial-website\backend
copy .env.example .env
# edit .env: DB_NAME/DB_USER/DB_PASS to match your MySQL.
# Defaults (host 127.0.0.1, user root, no password, db memorial) fit stock WAMP.

php setup_local.php        # creates the `memorial` database if missing
php -S localhost:8000 router.php
```

Backend at `http://localhost:8000`. Open `http://localhost:8000/install.php`
to verify PHP version, extensions, DB connection and tables. The first request
auto-creates tables + the superadmin (`SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD`).

### B. Frontend (React) — terminal 2

```powershell
cd memorial-website\client
npm install
npm run dev
```

Site at `http://localhost:5173`. Vite proxies `/api` + `/uploads` to PHP on
`:8000`, so no extra config is needed. Sign in with the superadmin to open
the Dashboard.

### C. Test the anniversary email

---

## 2. Production

### Backend → InfinityFree (free PHP + MySQL)

1. InfinityFree → create account → **Create Account** (free subdomain like
   `xxxx.infinityfreeapp.com`) → open **Control Panel**.
2. Control Panel → **MySQL Databases** → create a database. **Write down:**
   `MySQL Host` (like `sqlXXX.infinityfree.com` — NOT localhost),
   `Database Name`, `Username`, `Password`.
3. **Configure:** open `backend/config.php` and edit the defaults (free
   hosting has no env-var panel, so editing the file is the reliable way):
   `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET` (long random),
   `FRONTEND_URL` (your Render URL), `CRON_SECRET` (long random),
   `SMTP_*` if you have them, `SITE_URL` (your Render URL).
4. **Upload** with FTP (FileZilla; credentials in Control Panel → FTP
   Details): upload the **contents** of `backend/` into `htdocs/` (so
   `htdocs/api.php`, `htdocs/.htaccess`, `htdocs/uploads/` exist).
   No build step. Make sure hidden files (`.htaccess`) are uploaded.
5. Open `https://YOUR-BACKEND.infinityfreeapp.com/install.php` → all PASS
   (tables auto-created, superadmin seeded). **Then delete `install.php`.**
6. Test `https://YOUR-BACKEND.infinityfreeapp.com/api/health` → `{"ok":true}`.

**Email on InfinityFree:** free hosting often blocks outbound SMTP ports. The
backend tries SMTP → PHP `mail()` → log file, in that order. For Gmail use an
**App Password**; if mail still fails, sends are logged and visible in
Dashboard → Email log. Brevo/SendGrid free SMTP also works.

**Anniversary auto-send:** InfinityFree free has no cron — use free
[cron-job.org](https://cron-job.org): URL
`https://YOUR-BACKEND.infinityfreeapp.com/cron.php?key=YOUR_CRON_SECRET`,
once daily ~08:00. The script only sends on the anniversary date (or forced)
and never double-sends in the same year.

### Frontend → Render (free static site)

1. Push this repo to GitHub.
2. Render → **New → Static Site** → select repo. `render.yaml` sets:
   root `memorial-website/client`, build `npm install && npm run build`,
   publish `dist`, SPA rewrite `/* → /index.html`.
3. Render → Environment → set **`VITE_API_URL`** =
   `https://YOUR-BACKEND.infinityfreeapp.com` (no trailing slash). Redeploy.
4. Open `https://xxx.onrender.com` → feed loads from InfinityFree, login
   works (JWT), photo uploads are stored as MySQL BLOBs.

### Production option B (fallback: everything on InfinityFree)

If Render → InfinityFree API calls get blocked by the bot check:

1. `cd memorial-website/client` → leave `VITE_API_URL` empty → `npm run build`.
2. Upload `client/dist/*` into InfinityFree `htdocs/` and `backend/*` into
   `htdocs/api/` (adjust `.htaccess` + paths), or serve both from `htdocs/`.
3. Same-domain requests always pass InfinityFree's checks. ✅

---

## 3. Features & roles

- **Roles:** 1 superadmin (full control, creates admins), admins (all access,
  cannot touch superadmin), guests (signup with active email → comment + get
  anniversary emails).

---

## 4. Project layout

```
memorial-website/
├── backend/            # PURE PHP API (InfinityFree) — no framework
│   ├── api.php         # entry: routes /api/... (via .htaccess PATH_INFO)
│   ├── config.php      # ALL settings (edit defaults for InfinityFree)
│   ├── db.php          # PDO MySQL + auto-migrate + superadmin seed
│   ├── auth.php        # HS256 JWT + current-user guards
│   ├── helpers.php     # CORS, JSON, upload-URL helpers
│   ├── images_validate.php # strict upload validation (type/size/magic bytes)
│   ├── images_store.php    # MySQL BLOB store + GET /api/photos/{id} serving
│   ├── store.php       # options + settings (MySQL)
│   ├── mailer.php      # SMTP (raw sockets) → mail() → log fallback
│   ├── anniversary.php # yearly send engine (no double-send)
│   ├── cron.php        # cron-job.org entry (?key=CRON_SECRET)
│   ├── install.php     # setup checker — DELETE after setup
│   ├── setup_local.php # local DB creator (php setup_local.php)
│   ├── router.php      # local `php -S` router
│   ├── .htaccess       # /api rewrite + protect secrets
│   ├── uploads/        # legacy pre-BLOB files only (new photos go to MySQL)
│   └── .env.example    # local dev template
├── client/             # React + Vite SPA (Render static site)
│   └── src/api.js      # VITE_API_URL points to PHP backend in prod
├── server/             # LEGACY Node backend (reference only, not deployed)
├── render.yaml         # Render free static site + SPA rewrite + VITE_API_URL
└── README.md
```

## 5. API reference (same contract as the old Node API)

- `GET /api/health` · `GET /api/auth/options`
- `POST /api/auth/signup|login` · `GET /api/auth/me` · `PUT /api/auth/me/notify`
- `GET /api/comments` (public approved by year) · `POST /api/comments`
  (auth, multipart `message` + `images[]`) · `GET /api/comments/mine`
- `GET /api/admin/{comments?status=,users,options,settings,notifications,stats}`
- `PUT /api/admin/comments/{id}` · `DELETE /api/admin/comments/{id}`
- `POST /api/admin/users/admin` · `DELETE /api/admin/users/{id}`
- `POST|DELETE /api/admin/options` · `PUT /api/admin/settings`
- `POST /api/admin/send-anniversary-now` · `GET /cron.php?key=...`
- `GET /api/photos/{id}` — public photo bytes from MySQL (correct
  Content-Type, 1-year cache). Feed `images[]` use these URLs.

## 6. Photo storage & validation (MySQL BLOB)

- **Storage:** uploaded photos are stored as `LONGBLOB` rows in the `photos`
  table (auto-created on first request), linked by `comment_id`. Nothing is
  written to `backend/uploads/` anymore — that folder only serves legacy
  pre-BLOB files. Deleting a comment deletes its photo rows too.
- **Server validation (before storage):** upload error code, ≤ `UPLOAD_MAX_MB`
  (default 8 MB) each, client MIME + extension allow-list, **real magic bytes**
  via `getimagesize()`, sane dimensions, non-empty bytes, max
  `UPLOAD_MAX_FILES` (default 6) files. Failures return a 400 naming the file.
- **Allowed formats:** JPG/JPEG, PNG, GIF, WEBP only.
- **Downscale:** photos larger than `IMAGE_MAX_DIMENSION` (default 1600 px long
  edge) are resized when PHP GD is available (`IMAGE_JPEG_QUALITY`, default 82;
  GIF → JPEG, PNG/WEBP keep transparency). Without GD the original is kept.
- **Frontend pre-check:** the Memories form rejects non-allow-list types and
  oversized files instantly with the same limits, before uploading.
- **InfinityFree note:** free MySQL is usually capped (~100–200 MB). BLOB
  photos count toward it — the 1600 px downscale keeps each photo small.
  If the DB fills up, lower `IMAGE_MAX_DIMENSION` or prune old photos.

- **Signup:** active email, relation (friend/family/batchmate/relatives +
  custom in dashboard), batchmate → College/Highschool/Elementary/Others
  (+ custom), password min 6.
- **Comments:** signed-in users post with up to 6 photos (8 MB each, images
  only) → guests go to **pending** → admin/superadmin approve → shown grouped
  by year as photo grid. Admin posts publish immediately.
- **Dashboard:** review comments, create admins, signup options, anniversary
  date + site URL, email log, stats.
- **Anniversary email:** yearly on the death date, all `notify=1` accounts get
  an email with a site link. Auto via cron-job.org + manual "Send email now".


Dashboard → Anniversary & Site → **Send email now**, or open
`http://localhost:8000/cron.php?key=YOUR_CRON_SECRET`.
Without SMTP, emails append to `backend/mail.log` (dev mode).
