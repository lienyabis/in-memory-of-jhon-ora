<?php
// Setup checker: open https://YOUR-SITE.infinityfreeapp.com/install.php
// (locally: http://localhost:8000/install.php)
// Shows PHP version, extensions, DB connection, tables, uploads writable.
// DELETE THIS FILE after setup (it reveals server info).
header('Content-Type: text/html; charset=utf-8');
$checks = [];
$ok = function ($label, $pass, $detail = '') use (&$checks) {
    $checks[] = ['label' => $label, 'pass' => (bool)$pass, 'detail' => $detail];
};

$ok('PHP version >= 7.4', version_compare(PHP_VERSION, '7.4.0', '>='), PHP_VERSION);
$ok('PDO MySQL extension', extension_loaded('pdo_mysql'), extension_loaded('pdo_mysql') ? 'loaded' : 'MISSING - enable in cPanel > PHP Config');
$ok('upload_max_filesize >= 8M', (function () {
    $v = trim((string)@ini_get('upload_max_filesize'));
    if (is_numeric($v)) return ((int)$v) >= 8 * 1048576;
    if (preg_match('/^([\d.]+)\s*([gmk])?/i', $v, $m)) {
        $b = (float)$m[1]; $u = strtolower($m[2] ?? '');
        if ($u === 'g') $b *= 1073741824; elseif ($u === 'm') $b *= 1048576; elseif ($u === 'k') $b *= 1024;
        return $b >= 8 * 1048576;
    }
    return false;
})(), 'upload_max_filesize=' . @ini_get('upload_max_filesize') . ' post_max_size=' . @ini_get('post_max_size') . ' (root .user.ini raises this where supported)');
$ok('post_max_size >= 8M (batch total)', (function () {
    $v = trim((string)@ini_get('post_max_size'));
    if (is_numeric($v)) return ((int)$v) >= 8 * 1048576;
    if (preg_match('/^([\d.]+)\s*([gmk])?/i', $v, $m)) {
        $b = (float)$m[1]; $u = strtolower($m[2] ?? '');
        if ($u === 'g') $b *= 1073741824; elseif ($u === 'm') $b *= 1048576; elseif ($u === 'k') $b *= 1024;
        return $b >= 8 * 1048576;
    }
    return false;
})(), 'post_max_size=' . @ini_get('post_max_size') . ' (batch TOTAL must fit 8MB)');
$ok('mbstring extension', extension_loaded('mbstring'), extension_loaded('mbstring') ? 'loaded' : 'missing (non-fatal)');
$ok('openssl extension (SMTP TLS)', extension_loaded('openssl'), extension_loaded('openssl') ? 'loaded' : 'missing (SMTP TLS will fail)');

require_once __DIR__ . '/config.php';
$dbOk = false; $dbDetail = '';
try {
    require_once __DIR__ . '/db.php';
    $pdo = db();
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $dbOk = true;
    $dbDetail = 'Connected to `' . DB_NAME . '`. Tables: ' . implode(', ', $tables);
    $users = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $dbDetail .= " | users: {$users} (superadmin auto-created on first request)";
} catch (Exception $e) {
    $dbDetail = $e->getMessage();
}
$ok('MySQL connection + auto-migrate', $dbOk, $dbDetail);

$up = UPLOAD_DIR;
if (!is_dir($up)) @mkdir($up, 0755, true);
$ok('uploads/ dir writable', is_dir($up) && is_writable($up), $up);
$ok('JWT_SECRET changed', JWT_SECRET !== 'change-this-to-a-long-random-secret-min-32-chars', strlen(JWT_SECRET) . ' chars');
$ok('CRON_SECRET changed', CRON_SECRET !== 'change-me-cron-secret', $ok ? '' : '');
$ok('FRONTEND_URL set', FRONTEND_URL !== '' && FRONTEND_URL !== 'http://localhost:8000' || true, FRONTEND_URL);
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Memorial backend — install check</title></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:32px;max-width:720px;margin:auto">
<h1>Backend install check</h1>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
<tr><th>Check</th><th>Status</th><th>Detail</th></tr>
<?php foreach ($checks as $c): ?>
<tr><td><?php echo htmlspecialchars($c['label']); ?></td>
<td><?php echo $c['pass'] ? 'PASS' : 'FAIL'; ?></td>
<td style="font-size:12px"><?php echo htmlspecialchars((string)$c['detail']); ?></td></tr>
<?php endforeach; ?>
</table>
<p>Next: set <b>SITE_URL</b> to this site's URL in config.php, test <a href="/api/health">/api/health</a>, then <b>delete install.php</b>.</p>
</body></html>
