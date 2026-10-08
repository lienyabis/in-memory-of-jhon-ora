<?php
// Comment routes: public feed / mine / create-with-images (MySQL BLOB storage)
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../mappers.php';
require_once __DIR__ . '/../images_validate.php';
require_once __DIR__ . '/../images_store.php';

function route_comments_list($pdo, $method) {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    $rows = $pdo->query("SELECT * FROM comments WHERE status='approved' ORDER BY created_at DESC")->fetchAll();
    $byYear = [];
    foreach ($rows as $c) {
        $y = date('Y', strtotime($c['created_at']));
        if (!isset($byYear[$y])) $byYear[$y] = [];
        $byYear[$y][] = public_comment($pdo, $c);
    }
    $years = array_keys($byYear);
    rsort($years, SORT_NUMERIC);
    json_out(['years' => $years, 'byYear' => $byYear, 'total' => count($rows)]);
}

function route_comments_mine($pdo, $method) {
    if ($method !== 'GET') json_error('Method not allowed', 405);
    $u = require_login();
    $st = $pdo->prepare('SELECT * FROM comments WHERE user_id=? ORDER BY created_at DESC');
    $st->execute([$u['id']]);
    $rows = $st->fetchAll();
    json_out(array_map(function ($c) use ($pdo) { return comment_row_to_admin($pdo, $c); }, $rows));
}

function route_comments_create($pdo, $method) {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $u = require_login();
    if (!in_array($u['role'], ['guest', 'admin', 'superadmin'], true)) json_error('Not allowed', 403);
    $message = trim($_POST['message'] ?? '');
    if ($message === '' && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
        $b = body_input();
        $message = trim($b['message'] ?? '');
    }
    if ($message === '') json_error('Please write your memory/message');

    // Strict validation BEFORE storage: max files, real image bytes, allowed
    // formats (JPG/PNG/GIF/WEBP), size cap. Stored as MySQL BLOB rows.
    // Accept `images` and `images[]` field names (browser FormData vs curl).
    $uploads = flatten_upload_files(isset($_FILES['images']) ? $_FILES['images'] : null);
    $uploads = array_merge($uploads, flatten_upload_files(isset($_FILES['images[]']) ? $_FILES['images[]'] : null));
    if (count($uploads) > UPLOAD_MAX_FILES) json_error('You can attach up to 6 photos.');
    $validated = [];
    foreach ($uploads as $f) {
        $v = validate_image_upload($f);
        if ($v !== null) $validated[] = $v;
    }

    $isStaff = ($u['role'] === 'admin' || $u['role'] === 'superadmin');
    $status = $isStaff ? 'approved' : 'pending';
    $id = new_id('c');
    $st = $pdo->prepare('INSERT INTO comments (id,user_id,name,email,relation,batch_level,message,image,images_json,status,reviewed_by,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    $st->execute([$id, $u['id'], $u['name'], $u['email'], $u['relation'], $u['batch_level'] ?? '',
        $message, '', json_encode([], JSON_UNESCAPED_SLASHES),
        $status, $isStaff ? $u['email'] : null, $isStaff ? now_sql() : null]);
    $images = [];
    foreach ($validated as $v) {
        $images[] = photo_url(store_photo_blob($pdo, $id, $v));
    }
    $row = $pdo->query('SELECT * FROM comments WHERE id=' . $pdo->quote($id))->fetch();
    json_out([
        'message' => $isStaff ? 'Your memory was published.' : 'Thank you. Your memory was submitted and is waiting for review.',
        'comment' => comment_row_to_admin($pdo, $row),
    ]);
}
