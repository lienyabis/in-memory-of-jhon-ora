<?php
// API info page (opening /api_home.php in a browser shows this).
// The React frontend lives at the site root (index.html); the API is
// under /api/... in this SAME folder — no separate hosting needed.
http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
$health = '/api/health';
?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>John Paul Ora Memorial — API</title></head>
<body style="font-family:Georgia,serif;background:#f8fafc;color:#0f172a;padding:40px;text-align:center">
<div style="font-size:13px;letter-spacing:3px;color:#64748b">IN LOVING MEMORY</div>
<h1>John Paul Sollano Ora — Backend API</h1>
<p>This is the memorial API (pure PHP + MySQL), served from the same folder as the website.</p>
<p>Home: <a href="/">/</a> · Health check: <a href="<?php echo $health; ?>"><?php echo $health; ?></a></p>
<p style="color:#64748b;font-size:13px">Setup checker: <a href="/install.php">install.php</a> (delete it after setup)</p>
</body></html>
