<?php
// Comment routes: public feed / mine / create / update / delete (MySQL BLOB storage)
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../mappers.php';
require_once __DIR__ . '/../images_validate.php';
require_once __DIR__ . '/../images_store.php';
require_once __DIR__ . '/../mailer.php';

// Length check shared by create + edit (COMMENT_MAX_CHARS, default 500).
function validate_comment_message($message) {
    if ($message === '') json_error('Please write your memory/message');
    // Count Unicode CODE POINTS (matches the frontend counter and how users
    // perceive "characters"), never raw bytes: strlen() over-counts multibyte
    // characters (accents, emoji) and would reject valid messages on hosts
    // without the mbstring extension.
    if (function_exists('mb_strlen')) {
        $len = mb_strlen($message, 'UTF-8');
    } else {
        $len = preg_match_all('/./us', $message);
        if ($len === false) $len = strlen($message);
    }
    if ($len > COMMENT_MAX_CHARS) {
        json_error('Your comment is too long. Maximum ' . COMMENT_MAX_CHARS . ' characters (you used ' . $len . ').');
    }
}

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
    detect_post_overflow();
    $message = trim($_POST['message'] ?? '');
    if ($message === '' && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
        $b = body_input();
        $message = trim($b['message'] ?? '');
    }
    validate_comment_message($message);

    // Rule: each file must be a valid image FORMAT; the COMBINED total of all
    // selected photos must be <= UPLOAD_MAX_MB (default 8MB). One 3.2MB photo
    // passes. Stored as MySQL BLOB rows.
    $uploads = collect_comment_uploads();
    $validated = validate_upload_batch($uploads);

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
    // Task: notify every admin/superadmin so guest comments get reviewed promptly.
    $notify = null;
    if (!$isStaff) {
        $notify = notify_admins_new_comment($pdo, $u['name'], $message);
    }
    json_out([
        'message' => $isStaff ? 'Your memory was published.' : 'Thank you. Your memory was submitted and is waiting for review. Our admins have been notified.',
        'comment' => comment_row_to_admin($pdo, $row),
        'adminNotified' => $notify,
    ]);
}

// ------------------------------------------------------------
// PUT /api/comments/{id} — the author (or an admin) edits their comment text.
// JSON body {message}. (Photos are added via POST /api/comments/{id}/images
// because PHP only parses multipart bodies for POST requests.)
// A guest's edit returns the comment to `pending` for re-review.
// ------------------------------------------------------------
function route_comments_update($pdo, $method, $id) {
    if ($method !== 'PUT') json_error('Method not allowed', 405);
    $u = require_login();
    $st = $pdo->prepare('SELECT * FROM comments WHERE id=? LIMIT 1');
    $st->execute([$id]);
    $c = $st->fetch();
    if (!$c) json_error('Not found', 404);
    if (!can_modify_comment($u, $c)) json_error('You can only edit your own comments', 403);

    $b = body_input();
    $message = trim((string)($b['message'] ?? $c['message']));
    validate_comment_message($message);

    // Moderation: guest edits must be re-reviewed; staff edits keep their status.
    $isStaff = in_array($u['role'], ['admin', 'superadmin'], true);
    $status = $isStaff ? $c['status'] : 'pending';
    $reviewedBy = $isStaff ? $c['reviewed_by'] : null;
    $reviewedAt = $isStaff ? $c['reviewed_at'] : null;
    $pdo->prepare('UPDATE comments SET message=?, status=?, reviewed_by=?, reviewed_at=? WHERE id=?')
        ->execute([$message, $status, $reviewedBy, $reviewedAt, $c['id']]);
    $row = $pdo->query('SELECT * FROM comments WHERE id=' . $pdo->quote($c['id']))->fetch();
    // Task 3: a guest edit re-enters the review queue — admins must know.
    $notify = null;
    if (!$isStaff) {
        $notify = notify_admins_new_comment($pdo, $u['name'] . ' (edited comment)', $message);
    }
    json_out([
        'message' => $isStaff
            ? 'Comment updated.'
            : 'Comment updated. It is waiting for admin review again.',
        'comment' => comment_row_to_admin($pdo, $row),
        'adminNotified' => $notify,
    ]);
}

// ------------------------------------------------------------
// POST /api/comments/{id}/images — append photos to an own comment
// (multipart, field `images[]`). Guest additions re-enter review.
// ------------------------------------------------------------
function route_comment_add_images($pdo, $method, $id) {
    if ($method !== 'POST') json_error('Method not allowed', 405);
    $u = require_login();
    $st = $pdo->prepare('SELECT * FROM comments WHERE id=? LIMIT 1');
    $st->execute([$id]);
    $c = $st->fetch();
    if (!$c) json_error('Not found', 404);
    if (!can_modify_comment($u, $c)) json_error('You can only manage photos on your own comments', 403);

    detect_post_overflow();
    $uploads = collect_comment_uploads();
    if (!count($uploads)) json_error('No photos selected.');
    $validated = validate_upload_batch($uploads);
    if (!count($validated)) json_error('No valid photos to add.');
    $st = $pdo->prepare('SELECT COUNT(*) FROM photos WHERE comment_id=?');
    $st->execute([$c['id']]);
    $existing = (int)$st->fetchColumn();
    if ($existing + count($validated) > UPLOAD_MAX_FILES) {
        json_error('You can attach up to ' . UPLOAD_MAX_FILES . ' photos per comment.');
    }
    foreach ($validated as $v) store_photo_blob($pdo, $c['id'], $v);

    $isStaff = in_array($u['role'], ['admin', 'superadmin'], true);
    $needsReview = (!$isStaff && $c['status'] !== 'pending');
    if ($needsReview) {
        $pdo->prepare('UPDATE comments SET status=?, reviewed_by=?, reviewed_at=? WHERE id=?')
            ->execute(['pending', null, null, $c['id']]);
    }
    $row = $pdo->query('SELECT * FROM comments WHERE id=' . $pdo->quote($c['id']))->fetch();
    // Task 3: keep admins in the loop when guest photo edits re-enter review.
    $notify = null;
    if ($needsReview) {
        $notify = notify_admins_new_comment($pdo, $u['name'] . ' (edited photos)', $row['message']);
    }
    json_out([
        'message' => $isStaff ? 'Photos added.' : 'Photos added. The comment is waiting for admin review again.',
        'comment' => comment_row_to_admin($pdo, $row),
        'adminNotified' => $notify,
    ]);
}

// ------------------------------------------------------------
// DELETE /api/comments/{id} — the author (or an admin) removes a comment
// together with every photo uploaded to it.
// ------------------------------------------------------------
function route_comments_delete($pdo, $method, $id) {
    if ($method !== 'DELETE') json_error('Method not allowed', 405);
    $u = require_login();
    $st = $pdo->prepare('SELECT * FROM comments WHERE id=? LIMIT 1');
    $st->execute([$id]);
    $c = $st->fetch();
    if (!$c) json_error('Not found', 404);
    if (!can_modify_comment($u, $c)) json_error('You can only delete your own comments', 403);
    delete_comment_row($pdo, $c);
    json_out(['ok' => true, 'message' => 'Comment deleted.']);
}

// ------------------------------------------------------------
// DELETE /api/photos/{id} — remove ONE uploaded picture from a comment.
// The comment must belong to the caller (or caller must be admin).
// ------------------------------------------------------------
function route_photo_delete($pdo, $method, $photoId) {
    if ($method !== 'DELETE') json_error('Method not allowed', 405);
    $u = require_login();
    if (!preg_match('/^[A-Za-z0-9_-]{1,40}$/', (string)$photoId)) json_error('Not found', 404);
    $st = $pdo->prepare('SELECT comment_id FROM photos WHERE id=? LIMIT 1');
    $st->execute([$photoId]);
    $photo = $st->fetch();
    if (!$photo) json_error('Not found', 404);
    $st = $pdo->prepare('SELECT * FROM comments WHERE id=? LIMIT 1');
    $st->execute([$photo['comment_id']]);
    $c = $st->fetch();
    if (!$c) { // orphan photo
        $pdo->prepare('DELETE FROM photos WHERE id=?')->execute([$photoId]);
        json_out(['ok' => true]);
    }
    if (!can_modify_comment($u, $c)) json_error('You can only manage photos on your own comments', 403);
    $pdo->prepare('DELETE FROM photos WHERE id=?')->execute([$photoId]);
    json_out(['ok' => true, 'message' => 'Photo removed.']);
}
