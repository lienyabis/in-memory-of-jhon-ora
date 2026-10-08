<?php
// Shared HTTP helpers: CORS, JSON responses, input parsing, base URL.
require_once __DIR__ . '/config.php';

function allowed_origins() {
    $raw = FRONTEND_URL;
    $parts = array_map('trim', explode(',', $raw));
    return array_values(array_filter($parts));
}

function handle_cors() {
    $origins = allowed_origins();
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if ($origin && in_array($origin, $origins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    } elseif (count($origins) > 0 && $origins[0] !== '') {
        // Fallback: allow first configured origin (helps non-browser tools)
        // header('Access-Control-Allow-Origin: ' . $origins[0]);
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function json_out($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error($message, $status = 400) {
    json_out(['error' => $message], $status);
}

// Parse JSON or form body into array
function body_input() {
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($ct, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $d = json_decode($raw, true);
        return is_array($d) ? $d : [];
    }
    // multipart/form-data or x-www-form-urlencoded land in $_POST
    if (!empty($_POST)) return $_POST;
    $raw = file_get_contents('php://input');
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

// Base URL of THIS backend (scheme + host, no trailing slash), e.g. https://xxx.infinityfreeapp.com
function backend_base_url() {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host;
}

// Convert stored path "/uploads/x.jpg" to absolute URL using current host
function absolute_upload_url($path) {
    if (!$path) return '';
    if (preg_match('#^https?://#i', $path)) return $path;
    return backend_base_url() . $path;
}

function is_email($s) {
    return (bool)preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', (string)$s);
}

function now_sql() {
    return date('Y-m-d H:i:s');
}
