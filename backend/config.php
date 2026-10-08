<?php
// ============================================================
// Jhon Ora Memorial — Backend configuration
// Pure PHP, no framework. Works on InfinityFree free hosting.
// ------------------------------------------------------------
// HOW CONFIG WORKS (priority order):
//  1. Real environment variables (if host supports them)
//  2. backend/.env file (local dev — copy from .env.example)
//  3. Defaults below (edit for InfinityFree: easiest is to
//     edit the defaults directly since free hosting has no
//     env-var panel).
// ============================================================

// Load backend/.env (simple parser, no dependency)
(function () {
    $envFile = __DIR__ . '/.env';
    if (!is_readable($envFile)) return;
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        $pos = strpos($line, '=');
        if ($pos === false) continue;
        $k = trim(substr($line, 0, $pos));
        $v = trim(substr($line, $pos + 1));
        // strip surrounding quotes
        if (strlen($v) >= 2 && (($v[0] === '"' && substr($v, -1) === '"') || ($v[0] === "'" && substr($v, -1) === "'"))) {
            $v = substr($v, 1, -1);
        }
        if (getenv($k) === false) {
            putenv($k . '=' . $v);
            $_ENV[$k] = $v;
        }
    }
})();

function env_val($key, $default = '') {
    $v = getenv($key);
    if ($v === false && isset($_ENV[$key])) $v = $_ENV[$key];
    if ($v === false && isset($_SERVER[$key])) $v = $_SERVER[$key];
    return ($v === false || $v === null) ? $default : $v;
}

// ---- Database (MySQL) ----
// Local dev default: host 127.0.0.1, user root, no password, db memorial
// InfinityFree: use the MySQL details from cPanel → MySQL Databases
//   (host is like sqlXXX.infinityfree.com, NOT localhost).
define('DB_HOST', env_val('DB_HOST', '127.0.0.1'));
define('DB_PORT', env_val('DB_PORT', '3306'));
define('DB_NAME', env_val('DB_NAME', 'memorial'));
define('DB_USER', env_val('DB_USER', 'root'));
define('DB_PASS', env_val('DB_PASS', ''));

// ---- Auth ----
define('JWT_SECRET', env_val('JWT_SECRET', 'change-this-to-a-long-random-secret-min-32-chars'));
define('TOKEN_TTL_SECONDS', 7 * 24 * 3600); // 7 days

// ---- Superadmin seed (created automatically on first request) ----
define('SUPERADMIN_EMAIL', strtolower(env_val('SUPERADMIN_EMAIL', 'superadmin@jhonora.memorial')));
define('SUPERADMIN_PASSWORD', env_val('SUPERADMIN_PASSWORD', 'JhonOra2024!'));
define('SUPERADMIN_NAME', env_val('SUPERADMIN_NAME', 'Super Admin'));

// ---- Anniversary defaults ----
define('DEATH_MONTH', (int)env_val('DEATH_MONTH', '09'));
define('DEATH_DAY', (int)env_val('DEATH_DAY', '29'));
define('SITE_URL', rtrim(env_val('SITE_URL', 'http://localhost:5173'), '/'));

// ---- CORS: frontend origin(s) allowed to call this API ----
// Local: http://localhost:5173
// Production: https://your-site.onrender.com (comma-separated if more than one)
define('FRONTEND_URL', env_val('FRONTEND_URL', env_val('CLIENT_URL', 'http://localhost:5173')));

// ---- Email (SMTP). Leave empty to use PHP mail() / log mode ----
define('SMTP_HOST', env_val('SMTP_HOST', 'smtp.gmail.com'));
define('SMTP_PORT', (int)env_val('SMTP_PORT', '587'));
define('SMTP_USER', env_val('SMTP_USER', ''));
define('SMTP_PASS', env_val('SMTP_PASS', ''));
define('SMTP_FROM', env_val('SMTP_FROM', 'In Loving Memory of Jhon Ora <no-reply@jhonora.memorial>'));

// ---- Cron protection (cron-job.org hits cron.php?key=...) ----
define('CRON_SECRET', env_val('CRON_SECRET', 'change-me-cron-secret'));

// ---- Uploads (stored as MySQL BLOBs in `photos` table) ----
define('UPLOAD_MAX_MB', (int)env_val('UPLOAD_MAX_MB', '8'));
define('UPLOAD_MAX_FILES', (int)env_val('UPLOAD_MAX_FILES', '6'));
// Allowed formats: JPG/JPEG, PNG, GIF, WEBP (validated by real file bytes)
define('UPLOAD_ALLOWED_MIMES', env_val('UPLOAD_ALLOWED_MIMES', 'image/jpeg,image/png,image/gif,image/webp'));
// Photos larger than this (long edge, px) are downscaled when GD is available
define('IMAGE_MAX_DIMENSION', (int)env_val('IMAGE_MAX_DIMENSION', '1600'));
define('IMAGE_JPEG_QUALITY', (int)env_val('IMAGE_JPEG_QUALITY', '82'));
// Legacy: pre-BLOB /uploads files are still served if present
define('UPLOAD_DIR', __DIR__ . '/uploads');
define('UPLOAD_URL_PREFIX', '/uploads/');
