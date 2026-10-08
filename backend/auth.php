<?php
// Minimal HS256 JWT (no dependency) + current-user helpers.
require_once __DIR__ . '/db.php';

function b64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode($data) {
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_sign(array $user) {
    $header = b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = b64url_encode(json_encode([
        'id' => $user['id'],
        'role' => $user['role'],
        'email' => $user['email'],
        'exp' => time() + TOKEN_TTL_SECONDS,
    ]));
    $sig = b64url_encode(hash_hmac('sha256', $header . '.' . $payload, JWT_SECRET, true));
    return $header . '.' . $payload . '.' . $sig;
}

function jwt_verify($token) {
    if (!is_string($token)) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    list($h, $p, $s) = $parts;
    $expect = b64url_encode(hash_hmac('sha256', $h . '.' . $p, JWT_SECRET, true));
    if (!hash_equals($expect, $s)) return null;
    $payload = json_decode(b64url_decode($p), true);
    if (!is_array($payload)) return null;
    if (isset($payload['exp']) && $payload['exp'] < time()) return null;
    return $payload;
}

// Map DB row (snake_case) -> API user (camelCase, matches old Node API)
function public_user($u) {
    if (!$u) return null;
    return [
        'id' => $u['id'],
        'name' => $u['name'],
        'email' => $u['email'],
        'role' => $u['role'],
        'relation' => $u['relation'],
        'batchLevel' => $u['batch_level'],
        'notify' => (bool)$u['notify'],
        'createdAt' => $u['created_at'],
    ];
}

function bearer_token() {
    // Apache may hide Authorization header -> .htaccess passes it as HTTP_AUTHORIZATION or REDIRECT_HTTP_AUTHORIZATION
    $h = '';
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) $h = $_SERVER['HTTP_AUTHORIZATION'];
    elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $h = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    elseif (function_exists('apache_request_headers')) {
        $heads = apache_request_headers();
        foreach ($heads as $k => $v) {
            if (strtolower($k) === 'authorization') { $h = $v; break; }
        }
    }
    if (stripos($h, 'Bearer ') === 0) return substr($h, 7);
    return null;
}

function current_user() {
    static $cache = null;
    static $done = false;
    if ($done) return $cache;
    $done = true;
    $token = bearer_token();
    if (!$token) return null;
    $payload = jwt_verify($token);
    if (!$payload || empty($payload['id'])) return null;
    try {
        $st = db()->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
        $st->execute([$payload['id']]);
        $cache = $st->fetch() ?: null;
    } catch (Exception $e) {
        $cache = null;
    }
    return $cache;
}

function require_login() {
    $u = current_user();
    if (!$u) json_error('Login required', 401);
    return $u;
}

function require_role() {
    $roles = func_get_args();
    $u = require_login();
    if (!in_array($u['role'], $roles, true)) json_error('Not allowed for your role', 403);
    return $u;
}
