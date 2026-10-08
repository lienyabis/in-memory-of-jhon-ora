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
        'name' => $c['name'],
        'relation' => $c['relation'],
        'batchLevel' => $c['batch_level'],
        'message' => $c['message'],
        'image' => $c['image'] ?: ($images[0] ?? ''),
        'images' => $images,
        'createdAt' => $c['created_at'],
        'year' => (int)date('Y', strtotime($c['created_at'])),
    ];
}
