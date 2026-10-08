<?php
// Backend landing page (opening the backend URL in a browser shows this).
// The real API lives under /api/... and is consumed by the React frontend.
http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
$health = '/api/health';
?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jhon Ora Memorial — API</title></head>
<body style="font-family:Georgia,serif;background:#f8fafc;color:#0f172a;padding:40px;text-align:center">
<div style="font-size:13px;letter-spacing:3px;color:#64748b">IN LOVING MEMORY</div>
<h1>Jhon Sollano Ora — Backend API</h1>
<p>This is the memorial API (pure PHP + MySQL). The website frontend is hosted separately.</p>
<p>Health check: <a href="<?php echo $health; ?>"><?php echo $health; ?></a></p>
<p style="color:#64748b;font-size:13px">Setup checker: <a href="/install.php">install.php</a> (delete it after setup)</p>
</body></html>
