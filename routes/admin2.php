<?php
// Admin routes part 2: options + settings + notifications + stats + send-now
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../store.php';
require_once __DIR__ . '/../anniversary.php';

function admin_options_get($pdo, $me) { json_out(get_options()); }

function admin_options_add($pdo, $me) {
    $b = body_input();
    $type = $b['type'] ?? '';
    $value = trim((string)($b['value'] ?? ''));
    if (!in_array($type, ['relations', 'batchLevels'], true)) json_error('Invalid type');
    if ($value === '') json_error('Value required');
    $opts = get_options();
    foreach ($opts[$type] as $x) {
        if (strtolower($x) === strtolower($value)) json_error('Already exists');
    }
    $opts[$type][] = $value;
    set_options($type, $opts[$type]);
    json_out(get_options());
}

function admin_options_del($pdo, $me) {
    $b = body_input();
    $type = $b['type'] ?? '';
    $value = (string)($b['value'] ?? '');
    $opts = get_options();
    if (!isset($opts[$type])) json_error('Invalid type');
    $opts[$type] = array_values(array_filter($opts[$type], function ($x) use ($value) {
        return strtolower($x) !== strtolower($value);
    }));
    set_options($type, $opts[$type]);
    json_out(get_options());
}

function admin_settings_get($pdo, $me) { json_out(get_settings()); }

function admin_settings_put($pdo, $me) {
    $b = body_input();
    $cur = get_settings();
    $dm = isset($b['deathMonth']) ? max(1, min(12, (int)$b['deathMonth'])) : $cur['deathMonth'];
    $dd = isset($b['deathDay']) ? max(1, min(31, (int)$b['deathDay'])) : $cur['deathDay'];
    $su = (isset($b['siteUrl']) && $b['siteUrl'] !== '') ? trim((string)$b['siteUrl']) : $cur['siteUrl'];
    save_settings($dm, $dd, $su);
    json_out(get_settings());
}

function admin_notes($pdo, $me) {
    $rows = $pdo->query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100')->fetchAll();
    $out = array_map(function ($n) {
        return ['id' => $n['id'], 'year' => (int)$n['year'], 'sent' => (int)$n['sent'],
            'failed' => (int)$n['failed'], 'total' => (int)$n['total'],
            'forced' => (bool)$n['forced'], 'at' => $n['created_at']];
    }, $rows);
    json_out($out);
}

function admin_stats($pdo, $me) {
    $users = $pdo->query('SELECT role, COUNT(*) c FROM users GROUP BY role')->fetchAll();
    $g = 0; $a = 0; $total = 0;
    foreach ($users as $r) {
        $total += (int)$r['c'];
        if ($r['role'] === 'guest') $g = (int)$r['c'];
        if ($r['role'] === 'admin') $a = (int)$r['c'];
    }
    $comments = $pdo->query('SELECT status, COUNT(*) c FROM comments GROUP BY status')->fetchAll();
    $cc = ['pending' => 0, 'approved' => 0, 'rejected' => 0];
    foreach ($comments as $r) $cc[$r['status']] = (int)$r['c'];
    json_out(['totalUsers' => $total, 'guests' => $g, 'admins' => $a,
        'pending' => $cc['pending'], 'approved' => $cc['approved'], 'rejected' => $cc['rejected']]);
}

function admin_send_now($pdo, $me) {
    json_out(check_and_send_anniversary(true));
}
