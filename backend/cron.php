<?php
// External cron entry (InfinityFree has no cron on free plan).
// Free service https://cron-job.org hits this URL daily:
//   https://YOUR-BACKEND.infinityfreeapp.com/cron.php?key=YOUR_CRON_SECRET
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/anniversary.php';

handle_cors();
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') json_error('Method not allowed', 405);

$key = $_GET['key'] ?? '';
if (!hash_equals((string)CRON_SECRET, (string)$key)) {
    json_error('Forbidden: bad cron key', 403);
}

try {
    $pdo = db();
} catch (Exception $e) {
    json_error('Database connection failed: ' . $e->getMessage(), 500);
}

json_out(check_and_send_anniversary(false));
