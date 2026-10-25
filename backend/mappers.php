<?php
// Shared row mappers (DB snake_case -> API camelCase, matches old Node API).
// Images resolve to MySQL BLOB URLs (/api/photos/{id}); legacy /uploads
// file paths are returned as-is for backward compatibility.
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/images_store.php';

function comment_row_to_admin($pdo, $c) {
    $images = comment_image_urls($pdo, $c);
    return [
        'id' => $c['id'],
        'userId' => $c['user_id'],
        'name' => $c['name'],
        'email' => $c['email'],
        'relation' => $c['relation'],
        'batchLevel' => $c['batch_level'],
        'message' => $c['message'],
        'image' => $c['image'] ?: ($images[0] ?? ''),
        'images' => $images,
        'status' => $c['status'],
        'reviewedBy' => $c['reviewed_by'],
        'reviewedAt' => $c['reviewed_at'],
        'createdAt' => $c['created_at'],
    ];
}

function public_comment($pdo, $c) {
    $images = comment_image_urls($pdo, $c);
    return [
        'id' => $c['id'],
        // Owner id lets the frontend show Edit/Delete on the author's own cards
        'userId' => $c['user_id'],
        'name' => $c['name'],
        'relation' => $c['relation'],
        'batchLevel' => $c['batch_level'],
        'message' => $c['message'],
        'image' => $c['image'] ?: ($images[0] ?? ''),
        'images' => $images,
        'status' => $c['status'],
        'createdAt' => $c['created_at'],
        'year' => (int)date('Y', strtotime($c['created_at'])),
    ];
}

// Shared ownership check: the comment's author, or any admin/superadmin.
function can_modify_comment($user, $c) {
    if (!$user) return false;
    if (in_array($user['role'], ['admin', 'superadmin'], true)) return true;
    return !empty($c['user_id']) && $c['user_id'] === $user['id'];
}

// Shared delete: removes BLOB photos, the comment row and legacy /uploads files.
function delete_comment_row($pdo, $c) {
    // BLOB photos are child rows -> delete them with the comment.
    $pdo->prepare('DELETE FROM photos WHERE comment_id=?')->execute([$c['id']]);
    $pdo->prepare('DELETE FROM comments WHERE id=?')->execute([$c['id']]);
    // Legacy cleanup: if this comment predates BLOB storage, remove its files.
    $all = [];
    $d = json_decode($c['images_json'] ?? '[]', true);
    if (is_array($d)) $all = array_merge($all, $d);
    if (!empty($c['image'])) $all[] = $c['image'];
    foreach (array_unique($all) as $u) {
        $p = UPLOAD_DIR . '/' . basename((string)$u);
        if (is_file($p)) @unlink($p);
    }
}
