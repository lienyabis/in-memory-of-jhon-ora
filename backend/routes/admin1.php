<?php
// Admin routes part 1: comments moderation + users
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../mappers.php';

function admin_comments_list($pdo, $me) {
    $status = $_GET['status'] ?? '';
    if ($status && in_array($status, ['pending', 'approved', 'rejected'], true)) {
        $st = $pdo->prepare('SELECT * FROM comments WHERE status=? ORDER BY created_at DESC');
        $st->execute([$status]);
        $rows = $st->fetchAll();
    } else {
        $rows = $pdo->query('SELECT * FROM comments ORDER BY created_at DESC')->fetchAll();
    }
    json_out(array_map(function ($c) use ($pdo) { return comment_row_to_admin($pdo, $c); }, $rows));
}

function admin_comment_review($pdo, $me, $id) {
    $st = $pdo->prepare('SELECT * FROM comments WHERE id=? LIMIT 1');
    $st->execute([$id]);
    $c = $st->fetch();
    if (!$c) json_error('Not found', 404);
    if ($c['status'] === 'approved' || $c['status'] === 'rejected') {
        json_error('This memory was already ' . $c['status'] . ' and is read-only. Delete it if you must remove it.');
    }
    $b = body_input();
    if (!in_array(($b['status'] ?? ''), ['approved', 'rejected', 'pending'], true)) json_error('Invalid status');
    $pdo->prepare('UPDATE comments SET status=?, reviewed_by=?, reviewed_at=? WHERE id=?')
        ->execute([$b['status'], $me['email'], now_sql(), $c['id']]);
    $row = $pdo->query('SELECT * FROM comments WHERE id=' . $pdo->quote($c['id']))->fetch();
    json_out(comment_row_to_admin($pdo, $row));
}

function admin_comment_delete($pdo, $me, $id) {
    $st = $pdo->prepare('SELECT * FROM comments WHERE id=? LIMIT 1');
    $st->execute([$id]);
    $c = $st->fetch();
    if (!$c) json_error('Not found', 404);
    delete_comment_row($pdo, $c);
    json_out(['ok' => true]);
}

function admin_users_list($pdo, $me) {
    $rows = $pdo->query('SELECT * FROM users ORDER BY created_at DESC')->fetchAll();
    json_out(array_map('public_user', $rows));
}

function admin_user_create($pdo, $me) {
    $b = body_input();
    if (empty($b['name']) || empty($b['email']) || empty($b['password'])) json_error('Name, email, password required');
    if (strlen((string)$b['password']) < 6) json_error('Password min 6 chars');
    $st = $pdo->prepare('SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1');
    $st->execute([trim($b['email'])]);
    if ($st->fetch()) json_error('Email exists');
    $id = new_id('u');
    $hash = password_hash((string)$b['password'], PASSWORD_BCRYPT, ['cost' => 10]);
    $pdo->prepare('INSERT INTO users (id,name,email,password_hash,role,relation,batch_level,notify) VALUES (?,?,?,?,?,?,?,1)')
        ->execute([$id, trim($b['name']), trim($b['email']), $hash, 'admin', 'family', '']);
    json_out(['id' => $id, 'name' => trim($b['name']), 'email' => trim($b['email']), 'role' => 'admin']);
}

function admin_user_delete($pdo, $me, $id) {
    $st = $pdo->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
    $st->execute([$id]);
    $t = $st->fetch();
    if (!$t) json_error('Not found', 404);
    if ($t['role'] === 'superadmin') {
        if ($me['role'] !== 'superadmin') json_error('Only superadmin can modify superadmin access', 403);
        json_error('Cannot delete the superadmin (only 1 allowed)');
    }
    if ($t['id'] === $me['id']) json_error('Cannot delete yourself');
    $pdo->prepare('DELETE FROM users WHERE id=?')->execute([$t['id']]);
    json_out(['ok' => true]);
}

// PUT /api/admin/users/{id}/role  { role: 'guest' | 'admin' }
// Admins & superadmins can switch any account between guest and admin.
// The superadmin account is protected, and nobody may change their own role.
function admin_user_role($pdo, $me, $id) {
    $st = $pdo->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
    $st->execute([$id]);
    $t = $st->fetch();
    if (!$t) json_error('Not found', 404);
    $b = body_input();
    $role = (string)($b['role'] ?? '');
    if (!in_array($role, ['guest', 'admin'], true)) {
        json_error('Invalid role. Only "guest" and "admin" can be assigned.');
    }
    if ($t['id'] === $me['id']) json_error('You cannot change your own role');
    if ($t['role'] === 'superadmin') json_error('The superadmin role cannot be changed');
    if ($t['role'] === $role) {
        $out = public_user($t);
        $out['message'] = 'Role unchanged (' . $role . ').';
        json_out($out);
    }
    $pdo->prepare('UPDATE users SET role=? WHERE id=?')->execute([$role, $t['id']]);
    $row = $pdo->query('SELECT * FROM users WHERE id=' . $pdo->quote($t['id']))->fetch();
    $out = public_user($row);
    $out['message'] = $row['name'] . ' is now ' . $role . '.';
    json_out($out);
}
