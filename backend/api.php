<?php
// Main API entry. On InfinityFree: /api.php is the entry and
// .htaccess rewrites /api/... -> /api.php/... (PATH_INFO).
// Local dev with `php -S`: use backend/router.php instead.
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/images_store.php';
require_once __DIR__ . '/routes/auth_routes.php';
require_once __DIR__ . '/routes/comment_routes.php';
require_once __DIR__ . '/routes/admin1.php';
require_once __DIR__ . '/routes/admin2.php';

handle_cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = $_SERVER['PATH_INFO'] ?? '/';
if (isset($_GET['__path'])) $path = '/' . ltrim($_GET['__path'], '/');
$path = '/' . trim((string)$path, '/');
// InfinityFree .htaccess maps /api/x -> api.php/x, so PATH_INFO may be
// "/x" (no /api prefix). Normalize: ensure it starts with /api.
if ($path === '/') $path = '/api/health';
if (strpos($path, '/api') !== 0) $path = '/api' . $path;
$segments = array_values(array_filter(explode('/', $path)));

try {
    $pdo = db();
} catch (Exception $e) {
    json_error('Database connection failed. Check backend/.env (DB_HOST/DB_NAME/DB_USER/DB_PASS). Details: ' . $e->getMessage(), 500);
}

if ($segments === ['api', 'health']) json_out(['ok' => true, 'time' => date('c')]);

// Auth
if ($segments === ['api', 'auth', 'options']) route_auth_options($pdo, $method);
if ($segments === ['api', 'auth', 'signup']) route_auth_signup($pdo, $method);
if ($segments === ['api', 'auth', 'login']) route_auth_login($pdo, $method);
if ($segments === ['api', 'auth', 'me']) route_auth_me($pdo, $method);
if ($segments === ['api', 'auth', 'me', 'notify']) route_auth_notify($pdo, $method);

// Comments
if ($segments === ['api', 'comments']) {
    if ($method === 'GET') route_comments_list($pdo, $method);
    if ($method === 'POST') route_comments_create($pdo, $method);
    json_error('Method not allowed', 405);
}
if ($segments === ['api', 'comments', 'mine']) route_comments_mine($pdo, $method);

// Public BLOB photo: GET /api/photos/{id} (no login needed, same as feed)
if (count($segments) === 3 && $segments[0] === 'api' && $segments[1] === 'photos' && $method === 'GET') {
    serve_photo_blob($pdo, $segments[2]);
}

// Admin
if (count($segments) >= 3 && $segments[0] === 'api' && $segments[1] === 'admin') {
    $me = require_role('admin', 'superadmin');
    $rest = array_slice($segments, 2);
    if ($rest === ['comments'] && $method === 'GET') admin_comments_list($pdo, $me);
    if (count($rest) === 2 && $rest[0] === 'comments' && $method === 'PUT') admin_comment_review($pdo, $me, $rest[1]);
    if (count($rest) === 2 && $rest[0] === 'comments' && $method === 'DELETE') admin_comment_delete($pdo, $me, $rest[1]);
    if ($rest === ['users'] && $method === 'GET') admin_users_list($pdo, $me);
    if ($rest === ['users', 'admin'] && $method === 'POST') admin_user_create($pdo, $me);
    if (count($rest) === 2 && $rest[0] === 'users' && $method === 'DELETE') admin_user_delete($pdo, $me, $rest[1]);
    if ($rest === ['options'] && $method === 'GET') admin_options_get($pdo, $me);
    if ($rest === ['options'] && $method === 'POST') admin_options_add($pdo, $me);
    if ($rest === ['options'] && $method === 'DELETE') admin_options_del($pdo, $me);
    if ($rest === ['settings'] && $method === 'GET') admin_settings_get($pdo, $me);
    if ($rest === ['settings'] && $method === 'PUT') admin_settings_put($pdo, $me);
    if ($rest === ['notifications'] && $method === 'GET') admin_notes($pdo, $me);
    if ($rest === ['stats'] && $method === 'GET') admin_stats($pdo, $me);
    if ($rest === ['send-anniversary-now'] && $method === 'POST') admin_send_now($pdo, $me);
    json_error('Not found', 404);
}

json_error('Not found', 404);
