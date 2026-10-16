# In Loving Memory of John Paul Sollano Ora 🕊️ — ALL-IN-ONE (React + PHP + MySQL)

One single project folder = **compiled React frontend + pure PHP backend + MySQL**.
No separate API project, no CORS, no `VITE_API_URL` — the site and the API share
the same domain, so it hosts **free on InfinityFree** and also runs locally.

```
memorial-fullstack/
├── index.html · assets/ · jhon_ora.jpeg … compiled React build (the site)
├── api.php · auth.php · db.php · routes/ · store.php · mailer.php …
│              … pure PHP API (same folder, same domain)
├── .htaccess      Apache: /api rewrite + SPA fallback (InfinityFree)
├── router.php     local router for `php -S`
├── config.php     all settings (DB, secrets, URLs) — EDIT FOR PRODUCTION
├── .env           local settings (optional on hosting)
├── install.php    setup checker — DELETE after going live
├── cron.php       daily anniversary sender (cron-job.org)
├── start-local.bat one-click local server
├── client/        React Vite source (for rebuilding the frontend)
└── database/      MySQL schema.sql reference
```

**Why this works without API development:** the React build was compiled with an
empty API base URL, so every request goes to `/api/...` **on its own domain**.
`.htaccess` (production) and `router.php` (local) route those to `api.php` and
send React routes (`/memories`, `/login`, `/signup`, `/dashboard`) back to
`index.html`.

---

## 1. Local testing (Windows, WAMP/XAMPP)

Requirements: **PHP 8+**, **MySQL running** (WAMP shown below), nothing else.

```powershell
cd "memorial-fullstack"
php setup_local.php        # creates the `memorial` database (stock WAMP: root / no password)
start-local.bat            # or: php -S localhost:8000 router.php
```

Open **http://localhost:8000** — the full site runs (frontend + API same origin).

- Setup checker: http://localhost:8000/install.php — every row should be **PASS**
  (tables auto-create, superadmin is seeded on first request).
- Sign in at `/login` with the superadmin from `.env`:
  `superadmin@jhonora.memorial` / `JhonOra2024!`
- Not stock WAMP? Edit `.env` (`DB_HOST/DB_NAME/DB_USER/DB_PASS`) — it is read
  before the defaults in `config.php`.
- Anniversary test: http://localhost:8000/cron.php?key=change-me-cron-secret
  (emails go to `mail.log` when SMTP is empty).

---

## 2. Hosting free on InfinityFree (one folder, no API setup)

1. **Create account:** [infinityfree.com](https://www.infinityfree.com) →
   *Sign Up* → *Create Account* → free subdomain
   (`something.infinityfreeapp.com`) → open **Control Panel**.
2. **Create the database:** Control Panel → **MySQL Databases** → create one.
   Copy the four values: **MySQL Host** (`sqlXXX.infinityfree.com` — NOT
   (Alternatively upload `.env.example` renamed to `.env` with the same edits —
   `.htaccess` blocks web access to it.)
4. **Upload with FTP:** Control Panel → *Account Details* → *FTP Details*
   (use FileZilla/WinSCP). Upload the **contents** of `memorial-fullstack/`
   into `htdocs/` — including the hidden `.htaccess` file.
5. **Visit** `https://something.infinityfreeapp.com/install.php` — every row
   should be PASS. Then **delete `install.php`** before going live.

---

## 3. Rebuilding the React frontend

The `client/` folder holds the Vite source. To regenerate the compiled build:

```powershell
cd client
npm install
npm run build      # outputs to client/dist/
```

Copy `client/dist/` contents (`index.html`, `assets/`) into the project root
alongside the PHP files. The build uses an empty API base URL so all requests
stay same-origin (`/api/...`).

---

## 4. API reference (unchanged contract)

- `GET /api/health` · `GET /api/auth/options`
- `POST /api/auth/signup|login` · `GET /api/auth/me` · `PUT /api/auth/me/notify`
- **Account settings (any signed-in user):**
  - `PUT /api/auth/me/password` — `{currentPassword, newPassword}`
  - `PUT /api/auth/me/email` — `{newEmail, password}` (returns a fresh token)
  - `POST /api/auth/me/avatar` (multipart `avatar`) · `DELETE /api/auth/me/avatar`
  - `GET /api/avatars/{userId}` — public picture bytes (BLOB, `no-store`)
- `GET /api/comments` (public approved by year) · `POST /api/comments`
  (auth, multipart `message` + `images[]`, **max 500 chars**) · `GET /api/comments/mine`
- **Own-comment management (author or admin):**
  - `PUT /api/comments/{id}` — edit text (guest edits go back to `pending`)
  - `POST /api/comments/{id}/images` — append photos (multipart `images[]`)
  - `DELETE /api/comments/{id}` — removes the comment + its photos
  - `DELETE /api/photos/{id}` — remove ONE uploaded photo
- `GET /api/admin/{comments?status=,users,options,settings,notifications,stats}`
- `PUT /api/admin/comments/{id}` · `DELETE /api/admin/comments/{id}`
- `POST /api/admin/users/admin` · `DELETE /api/admin/users/{id}`
  · `PUT /api/admin/users/{id}/role` — `{role: guest|admin}` (admin & superadmin;
  superadmin account and your own role are protected)
- `POST|DELETE /api/admin/options` · `PUT /api/admin/settings`
---

## 5. Features

- **Signup:** active email, relation (friend/family/batchmate/relatives +
  custom in dashboard), batchmate → College/Highschool/Elementary/Others
  (+ custom), password min 6.
- **Comments:** signed-in users post with up to 6 photos (8 MB each, images
  only) → guests go to **pending** → admin/superadmin approve → shown grouped
  by year as a photo grid. Admin posts publish immediately.
- **Photos:** stored as `LONGBLOB` rows (auto-created `photos` table), server-
  validated by real magic bytes, downscaled to 1600 px when GD is available.
- **Dashboard:** review comments, create admins, signup options, anniversary
  date + site URL, email log, stats.
- **Anniversary email:** yearly on the death date, all `notify=1` accounts get
  an email with a site link.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| Site loads, every API call shows "Invalid API response" | `.htaccess` missing in `htdocs/` — re-upload it (hidden file) |
| `Database connection failed` | Wrong `DB_HOST/DB_NAME/DB_USER/DB_PASS` in `config.php` — host must be `sqlXXX.infinityfree.com`, and the DB user is usually the full name with prefix |
| `/install.php` shows FAIL rows | Fix the listed row, re-check; delete the file when all PASS |
| 404 on `/memories`, `/login`… | `.htaccess` not uploaded or `mod_rewrite` issue — re-upload `.htaccess` |
| Emails not arriving | Check Dashboard → Email log (`mail.log`); configure SMTP or use cron-job.org URL |
| Photos rejected | JPG/PNG/GIF/WEBP only, ≤ 8 MB each, ≤ 6 files (`UPLOAD_*` in config) |

---

## Built With

- [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) — compiled frontend
- [Tailwind CSS](https://tailwindcss.com/) + [React Router](https://reactrouter.com/)
- Pure **PHP** (no framework) backend — PDO MySQL, HS256 JWT (no dependency)
- [MySQL](https://www.mysql.com/) — `users`, `comments`, `photos`, `avatars`,
  `options_store`, `settings`, `notifications` tables
- [InfinityFree](https://www.infinityfreeapp.com) — free one-folder hosting

## License

MIT
- `POST /api/admin/send-anniversary-now` · `GET /cron.php?key=...`
- `GET /api/photos/{id}` — public photo bytes (MySQL BLOB, correct
  Content-Type, 1-year cache)

After a **guest** posts a comment, every admin/superadmin account automatically
receives a review-notification email (same SMTP → mail() → mail.log fallback
chain as the anniversary mail).

Run `php api_test.php` (local server required) to exercise all of the above —
40 checks. The file is blocked from web access by `.htaccess`/`router.php`.
   `localhost`), **Database Name**, **Username**, **Password**.
3. **Configure before uploading** — open `config.php` in a text editor and edit
   the defaults (free hosting has no env panel, editing the file is reliable):

   | Constant | Value |
   |---|---|
   | `DB_HOST` | `sqlXXX.infinityfree.com` |
   | `DB_NAME` / `DB_USER` / `DB_PASS` | from step 2 (user may equal the DB name) |
   | `JWT_SECRET` | a long random string (32+ chars) |
   | `CRON_SECRET` | another long random string |
   | `SITE_URL` | `https://something.infinityfreeapp.com` |
   | `FRONTEND_URL` | same URL |
   | `SMTP_*` | optional — leave empty to log emails instead |