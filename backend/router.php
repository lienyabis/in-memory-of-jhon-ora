<?php
// SPLIT backend local-dev router (API ONLY - no frontend here).
// Run from backend/:
//   php -S localhost:8000 router.php
// Serves: /api/... -> api.php, /uploads (legacy), *.php scripts.
// React frontend runs separately on Vite :5173.
$uri = (string)parse_url($_SERVER["REQUEST_URI"] ?? "/", PHP_URL_PATH);
$uri = rawurldecode($uri);
$base = basename($uri);
if (preg_match("#(?:^|/)\\.#", $uri) || $base === "mail.log" || $base === "router.php" || $base === "api_test.php") {
  http_response_code(403); header("Content-Type: text/plain; charset=utf-8"); echo "Forbidden"; return true;
}
if ($uri === "/api" || strpos($uri, "/api/") === 0) {
  $_SERVER["PATH_INFO"] = $uri;
  require __DIR__ . "/api.php";
  return true;
}
if ($uri === "/api.php") { require __DIR__ . "/api.php"; return true; }
if (strpos($uri, "/uploads/") === 0) {
  $file = __DIR__ . $uri;
  if (is_file($file)) {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $mime = ["jpg"=>"image/jpeg","jpeg"=>"image/jpeg","png"=>"image/png","gif"=>"image/gif","webp"=>"image/webp"];
    header("Content-Type: " . ($mime[$ext] ?? "application/octet-stream"));
    readfile($file); return true;
  }
  http_response_code(404); echo "Not found"; return true;
}
if ($uri === "/" || $uri === "/index.html") {
  header("Content-Type: application/json; charset=utf-8");
  echo json_encode(["ok"=>true,"service"=>"john-ora-memorial API (split backend)","health"=>"/api/health"]);
  return true;
}
if (is_file(__DIR__ . $uri)) { return false; }
http_response_code(404);
header("Content-Type: application/json; charset=utf-8");
echo json_encode(["error"=>"Not found"]);
return true;
