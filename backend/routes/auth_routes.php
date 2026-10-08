<?php
// Auth routes: options / signup / login / me / me-notify
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../store.php';

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
    if (!in_array($rel, $validRels, true)) json_error('Please select your relation to Jhon Ora');
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
