<?php
// Auth routes: options / signup / login / me / me-notify / account settings
// (password, email, avatar — see routes/README in the API reference)
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../store.php';
require_once __DIR__ . '/../images_validate.php';
require_once __DIR__ . '/../images_store.php';

function route_auth_options($pdo, $method) {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    json_out(get_options());
}

function route_auth_signup($pdo, $method) {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $b = body_input();
    $name = trim($b['name'] ?? '');
    $email = trim($b['email'] ?? '');
    $password = $b['password'] ?? '';
    $relation = $b['relation'] ?? '';
    $batchLevel = $b['batchLevel'] ?? '';
    if ($name === '') json_error('Please enter your name');
    if (!is_email($email)) json_error('Please enter an active email address');
    if (!is_string($password) || strlen($password) < 6) json_error('Password must be at least 6 characters');
    $opts = get_options();
    $rel = strtolower(trim($relation));
    $validRels = array_map('strtolower', $opts['relations']);
    if (!in_array($rel, $validRels, true)) json_error('Please select your relation to John Paul Ora');
    if ($rel === 'batchmate') {
        $levels = array_map('strtolower', $opts['batchLevels']);
        if (!$batchLevel || !in_array(strtolower((string)$batchLevel), $levels, true)) {
            json_error('Please select batch level: College, Highschool, Elementary, Others');
        }
    }
    $st = $pdo->prepare('SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1');
    $st->execute([$email]);
    if ($st->fetch()) json_error('Email already registered. Please sign in.');
    $id = new_id('u');
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    $st = $pdo->prepare('INSERT INTO users (id,name,email,password_hash,role,relation,batch_level,notify) VALUES (?,?,?,?,?,?,?,1)');
    $st->execute([$id, $name, $email, $hash, 'guest', $rel, $rel === 'batchmate' ? $batchLevel : '']);
    $row = $pdo->query('SELECT * FROM users WHERE id=' . $pdo->quote($id))->fetch();
    json_out(['token' => jwt_sign($row), 'user' => public_user($row)]);
}

function route_auth_login($pdo, $method) {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $b = body_input();
    $st = $pdo->prepare('SELECT * FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1');
    $st->execute([trim($b['email'] ?? '')]);
    $user = $st->fetch();
    if (!$user) json_error('Account not found for this email');
    if (!password_verify((string)($b['password'] ?? ''), $user['password_hash'])) json_error('Wrong password');
    json_out(['token' => jwt_sign($user), 'user' => public_user($user)]);
}

function route_auth_me($pdo, $method) {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    json_out(['user' => public_user(require_login())]);
}

function route_auth_notify($pdo, $method) {
    if ($method !== 'PUT') json_error('Method not allowed', 405);
    $u = require_login();
    $b = body_input();
    $v = $b['notify'] ?? true;
    $notify = ($v === false || $v === 0 || $v === 'false' || $v === '0') ? 0 : 1;
    $pdo->prepare('UPDATE users SET notify=? WHERE id=?')->execute([$notify, $u['id']]);
    $row = $pdo->query('SELECT * FROM users WHERE id=' . $pdo->quote($u['id']))->fetch();
    json_out(['user' => public_user($row)]);
}

// ------------------------------------------------------------
// Account settings: change password
// PUT /api/auth/me/password  { currentPassword, newPassword }
// ------------------------------------------------------------
function route_auth_password($pdo, $method) {
    if ($method !== 'PUT') json_error('Method not allowed', 405);
    $u = require_login();
    $b = body_input();
    $current = (string)($b['currentPassword'] ?? '');
    $new = (string)($b['newPassword'] ?? '');
    if ($current === '' || $new === '') json_error('Current and new password are required');
    if (!password_verify($current, $u['password_hash'])) json_error('Current password is wrong');
    if (strlen($new) < 6) json_error('New password must be at least 6 characters');
    if ($new === $current) json_error('New password must be different from the current one');
    $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 10]);
    $pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([$hash, $u['id']]);
    json_out(['ok' => true, 'message' => 'Password updated successfully.']);
}

// ------------------------------------------------------------
// Account settings: change email
// PUT /api/auth/me/email  { newEmail, password }
// Re-issues the JWT so the stored token carries the new address.
// ------------------------------------------------------------
function route_auth_email($pdo, $method) {
    if ($method !== 'PUT') json_error('Method not allowed', 405);
    $u = require_login();
    $b = body_input();
    $newEmail = trim((string)($b['newEmail'] ?? ''));
    $password = (string)($b['password'] ?? '');
    if (!is_email($newEmail)) json_error('Please enter a valid email address');
    if ($password === '') json_error('Enter your password to confirm the email change');
    if (!password_verify($password, $u['password_hash'])) json_error('Password is wrong');
    if (strcasecmp($newEmail, $u['email']) === 0) json_error('This is already your email address');
    $st = $pdo->prepare('SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND id<>? LIMIT 1');
    $st->execute([$newEmail, $u['id']]);
    if ($st->fetch()) json_error('That email is already used by another account');
    $pdo->prepare('UPDATE users SET email=? WHERE id=?')->execute([$newEmail, $u['id']]);
    $row = $pdo->query('SELECT * FROM users WHERE id=' . $pdo->quote($u['id']))->fetch();
    json_out([
        'ok' => true,
        'message' => 'Email address updated successfully.',
        'token' => jwt_sign($row),
        'user' => public_user($row),
    ]);
}

// ------------------------------------------------------------
// Account settings: profile picture (upload / remove)
// POST   /api/auth/me/avatar  multipart field `avatar`
//         (the picture is cropped on a canvas before upload)
// DELETE /api/auth/me/avatar
// ------------------------------------------------------------
function route_auth_avatar($pdo, $method) {
    if ($method === 'DELETE') {
        $u = require_login();
        delete_avatar($pdo, $u['id']);
        json_out(['ok' => true, 'message' => 'Profile picture removed.']);
    }
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $u = require_login();
    if (empty($_FILES['avatar'])) json_error('No picture selected. Choose a photo first.');
    $file = $_FILES['avatar'];
    // Reuse the strict image validator (magic bytes, size, allowed formats).
    $validated = validate_image_upload($file);
    if ($validated === null) json_error('No picture selected. Choose a photo first.');
    store_avatar_blob($pdo, $u['id'], $validated);
    $row = $pdo->query('SELECT * FROM users WHERE id=' . $pdo->quote($u['id']))->fetch();
    json_out([
        'ok' => true,
        'message' => 'Profile picture updated.',
        'user' => public_user($row),
        'avatar' => '/api/avatars/' . $u['id'],
    ]);
}

// ------------------------------------------------------------
// Forgot password: POST /api/auth/forgot  { email }
// Always replies with the same generic message (accounts cannot
// be probed). When the address exists, a one-time link is emailed:
//   {FRONTEND_URL}/reset-password?token=...
// A resend is skipped for 60s after the last send (anti-spam).
// ------------------------------------------------------------
function route_auth_forgot($pdo, $method) {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $b = body_input();
    $email = trim((string)($b['email'] ?? ''));
    if (!is_email($email)) json_error('Please enter a valid email address');
    $generic = 'If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.';
    try {
        $st = $pdo->prepare('SELECT * FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1');
        $st->execute([$email]);
        $user = $st->fetch();
        if ($user) {
            // Cooldown: do not re-send within 60 seconds of the last link.
            $st = $pdo->prepare('SELECT token_hash FROM password_reset_tokens WHERE user_id=? AND used=0 AND created_at>=? ORDER BY created_at DESC LIMIT 1');
            $st->execute([$user['id'], date('Y-m-d H:i:s', time() - 60)]);
            if (!$st->fetch()) {
                $token = bin2hex(random_bytes(32));
                $hash = hash('sha256', $token);
                $pdo->prepare('INSERT INTO password_reset_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)')
                    ->execute([$hash, $user['id'], date('Y-m-d H:i:s', time() + 3600)]);
                $front = trim(explode(',', FRONTEND_URL)[0]);
                $base = rtrim($front !== '' ? $front : SITE_URL, '/');
                $resetUrl = $base . '/reset-password?token=' . $token;
                if (!function_exists('send_mail')) require_once __DIR__ . '/../mailer.php';
                @set_time_limit(60);
                send_mail($user['email'], 'Reset your memorial password', password_reset_email_html($user['name'], $resetUrl));
            }
        }
    } catch (Exception $e) {
        // Answer generically even on DB trouble — never reveal accounts.
    }
    json_out(['ok' => true, 'message' => $generic]);
}

// ------------------------------------------------------------
// Reset password: POST /api/auth/reset  { token, password }
// Validates the one-time token (exists / unused / not expired),
// then swaps in the new bcrypt hash and burns every open link.
// ------------------------------------------------------------
function route_auth_reset($pdo, $method) {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $b = body_input();
    $token = strtolower(trim((string)($b['token'] ?? '')));
    $password = (string)($b['password'] ?? '');
    if ($token === '' || !preg_match('/^[a-f0-9]{64}$/', $token)) {
        json_error('This reset link is invalid or incomplete. Please request a new one.');
    }
    if (strlen($password) < 6) json_error('Password must be at least 6 characters');
    $st = $pdo->prepare('SELECT * FROM password_reset_tokens WHERE token_hash=? LIMIT 1');
    $st->execute([hash('sha256', $token)]);
    $row = $st->fetch();
    if (!$row || (int)$row['used'] === 1) {
        json_error('This reset link is invalid or has already been used. Please request a new one.');
    }
    if (strtotime($row['expires_at']) < time()) {
        $pdo->prepare('UPDATE password_reset_tokens SET used=1 WHERE token_hash=?')->execute([hash('sha256', $token)]);
        json_error('This reset link has expired. Please request a new one.');
    }
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    $pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([$hash, $row['user_id']]);
    // Burn every outstanding link for this account.
    $pdo->prepare('UPDATE password_reset_tokens SET used=1 WHERE user_id=?')->execute([$row['user_id']]);
    json_out(['ok' => true, 'message' => 'Password updated. You can now sign in with your new password.']);
}
