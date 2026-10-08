<?php
// Local-dev router for `php -S localhost:8000 backend/router.php`.
// Serves /uploads files, routes /api/... to api.php with PATH_INFO.
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

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
    echo 'Not found';
    return true;
}

if ($uri === '/' || $uri === '/index.php') {
    require __DIR__ . '/index.php';
    return true;
}

if ($uri === '/install.php') {
    require __DIR__ . '/install.php';
    return true;
}

if ($uri === '/cron.php') {
    require __DIR__ . '/cron.php';
    return true;
}

if (strpos($uri, '/api') === 0) {
    // Pass the FULL path; api.php normalizes with/without the /api prefix
    $_SERVER['PATH_INFO'] = $uri;
    require __DIR__ . '/api.php';
    return true;
}

if ($uri === '/api.php') {
    require __DIR__ . '/api.php';
    return true;
}

return false;
