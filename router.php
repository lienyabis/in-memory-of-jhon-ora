<?php
// ============================================================
// Local-dev router for the ALL-IN-ONE project (React build + PHP).
// Run from THIS folder:
//     php -S localhost:8000 router.php
// Serves: index.html + assets, /api/... -> api.php, /uploads,
// PHP scripts (install.php, cron.php, ...), SPA fallback.
// ============================================================
$uri = (string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uri = rawurldecode($uri);

// --- Never serve secrets / internals over HTTP locally ---
$base = basename($uri);
if (preg_match('#(?:^|/)\.#', $uri) || $base === 'mail.log' || $base === 'router.php' || $base === 'api_test.php') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Forbidden';
    return true;
}

// --- API: /api/... -> api.php (full PATH_INFO, same as Apache rewrite) ---
if ($uri === '/api' || strpos($uri, '/api/') === 0) {
    $_SERVER['PATH_INFO'] = $uri; // api.php normalizes with/without /api prefix
    require __DIR__ . '/api.php';
    return true;
}
if ($uri === '/api.php') {
    require __DIR__ . '/api.php';
    return true;
}

// --- Legacy /uploads files (pre-BLOB photos) ---
if (strpos($uri, '/uploads/') === 0) {
    $file = __DIR__ . $uri;
    if (is_file($file)) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $mime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp'];
        header('Content-Type: ' . ($mime[$ext] ?? 'application/octet-stream'));
        readfile($file);
        return true;
    }
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found';
    return true;
}

// --- Root: the React SPA ---
if ($uri === '/' || $uri === '/index.html') {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    return true;
}

// --- Real files (assets, images, *.php scripts): let the built-in
//     server serve/execute them as-is ---
if (is_file(__DIR__ . $uri)) {
    return false;
}

// --- SPA fallback for React routes (/memories, /login, /signup, /dashboard, /settings).
//     Anything that looks like a missing static file gets a real 404. ---
if (preg_match('/\.(php|phtml|js|mjs|css|png|jpe?g|gif|webp|ico|svg|woff2?|ttf|otf|eot|map|txt|xml|json|pdf|zip)$/i', $uri)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found';
    return true;
}
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
return true;