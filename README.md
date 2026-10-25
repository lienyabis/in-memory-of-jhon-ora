# John Paul Ora Memorial — React + PHP + MySQL (split build)

A separate, self-contained rebuild of the `memorial-all-in-one` site with the
**exact same design, text and behavior**, split into:

- `frontend/` — Vite + React SPA (compiled CSS from the original build, copied verbatim)
- `backend/`  — pure PHP REST API (no framework, no Composer dependencies)
- `database/` — optional SQL schema (the backend also auto-creates tables)

Honoree: **John Paul Sollano Ora** ("Princess John Ora"), BSICT Class 2020.

## Requirements

- PHP 8.0+ with PDO MySQL (and optionally GD for image downscaling)
- MySQL 5.7+ / MariaDB 10.3+
- Node.js 18+ (for the frontend dev server / build)

## Local development (two terminals)

### 1) Backend (PHP API on :8000)

```bash
cd memorial-react-php-mysql/backend
# edit .env first: set DB_* and a SUPERADMIN_PASSWORD (see below)
php -S localhost:8000 router.php
```

- `.env` is already copied from `.env.example` for local dev.
- **Important:** set `SUPERADMIN_PASSWORD` in `backend/.env` *before the first
  request*. The superadmin account is seeded once, and its password hash is not
  regenerated later. Default local email: `superadmin@jhonora.memorial`.
- Tables + seed rows are created automatically on first request
  (`backend/db.php`), or import `database/schema.sql` manually.
- Health check: open <http://localhost:8000/api/health>

### 2) Frontend (Vite on :5173)

```bash
cd memorial-react-php-mysql/frontend
npm install
npm run dev
```

Open <http://localhost:5173>. In dev mode Vite proxies `/api` and `/uploads`
to `http://localhost:8000` (see `vite.config.js`), so no CORS issues locally.
`frontend/.env.development` sets `VITE_API_URL=` (empty = same origin = proxy).

## Frontend production build

```bash
cd frontend
# set the API base URL for your hosted backend:
#   echo VITE_API_URL=https://your-api.example.com > .env.production
npm run build        # outputs static files to frontend/dist/
```

Deploy `frontend/dist/` to any static host (Vercel, Netlify, InfinityFree HTML
dir, GitHub Pages, …). The API base URL is baked in at build time from
`VITE_API_URL` (leave it empty if the API is served from the same domain under
`/api`).

## Backend production (shared hosting, e.g. InfinityFree)

1. Upload everything in `backend/` to the add-on/subdomain document root
   (`.htaccess` rewrites `/api/...` to `api.php`; `router.php`/`.user.ini` are
   for the local `php -S` server and PHP config).
2. Create the MySQL database in cPanel and either import
   `database/schema.sql` or let the backend auto-create tables on first hit.
3. Edit `backend/.env` (protected by `.htaccess`) or the defaults in
   `config.php`: `DB_*`, `SUPERADMIN_*`, `SITE_URL` (this API's own URL, used
   in anniversary email links), `FRONTEND_URL` (the React site URL — used for
   CORS), `SMTP_*` for anniversary emails.
4. Cron for the yearly anniversary email (runs at 6am on the configured
   death anniversary date — see Dashboard → Anniversary & Site):
   `php cron.php?key=YOUR_CRON_SECRET` (schedule daily; it no-ops until the
   date). You can also trigger manually from the dashboard ("Send email now")
   or `php cron.php?key=...&force=1`.

## API overview (`backend/api.php`)

| Method + path                        | Auth     | Purpose |
| ------------------------------------ | -------- | ------- |
| `GET  /api/health`                   | –        | health check |
| `GET  /api/auth/options`             | –        | signup relation/batch options |
| `POST /api/auth/signup`              | –        | create account (auto sign-in) |
| `POST /api/auth/login`               | –        | sign in → `{token, user}` |
| `GET  /api/auth/me`                  | user     | current user |
| `PUT  /api/auth/me/password`         | user     | change password |
| `PUT  /api/auth/me/email`            | user     | change email |
| `POST /api/auth/me/avatar`           | user     | upload profile picture |
| `DELETE /api/auth/me/avatar`         | user     | remove profile picture |
| `GET  /api/avatars/{userId}`         | –        | serve profile picture |
| `GET  /api/comments`                 | –        | approved memories (by year) |
| `GET  /api/comments/mine`            | user     | own comments |
| `POST /api/comments`                 | user     | post memory (guests → pending) |
| `PUT  /api/comments/{id}`            | owner    | edit message (+ add photos) |
| `POST /api/comments/{id}/images`     | owner    | add photos |
| `DELETE /api/comments/{id}`          | owner/staff | delete comment + photos |
| `DELETE /api/photos/{photoId}`       | owner/staff | remove one photo |
| `GET  /api/photos/{photoId}`         | –        | serve photo (MySQL BLOB) |
| `GET/PUT /api/admin/*`               | staff    | stats, comment review, users, options, settings, notifications, send-anniversary-now |

Auth uses a stateless HS256 JWT in `Authorization: Bearer …`
(localStorage key `jhon_token`). Passwords: `password_hash()` bcrypt.

## Photo rules (same as original)

- Formats: JPG, PNG, GIF, WEBP (validated by real file bytes server-side)
- Max **6 files per comment**, combined total **≤ 8MB**
- Comment messages: **≤ 500 characters**
- Larger images are downscaled to 1600px long edge when GD is available

## File map

```
memorial-react-php-mysql/
├── frontend/           Vite + React SPA
│   ├── index.html
│   ├── vite.config.js  dev proxy /api + /uploads -> :8000
│   ├── public/jhon_ora.jpeg
│   └── src/            pages, components, context, lib, index.css
├── backend/            PHP REST API (no deps)
│   ├── .env / .env.example
│   ├── api.php         /api router
│   ├── router.php      local `php -S` router
│   ├── db.php          PDO + auto-migrate + superadmin seed
│   ├── routes/         auth, comments, admin endpoints
│   ├── anniversary.php cron.php  mailer.php
│   └── uploads/        legacy /uploads files (photos are MySQL BLOBs)
└── database/
    └── schema.sql      optional manual schema (auto-created otherwise)
```

