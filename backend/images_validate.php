<?php
// Image upload validation (pure PHP, no framework).
// Rule: each file must be an allowed FORMAT (JPG/PNG/GIF/WEBP, verified by
// real magic bytes); the BATCH combined total must be <= UPLOAD_MAX_MB
// (default 8MB). A single 3.2MB photo therefore passes. No per-file MB cap.
require_once __DIR__ . '/db.php';

function allowed_image_mimes() {
    return [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];
}

function normalize_upload_files($files) {
    return flatten_upload_files($files);
}

// Recursively flatten PHP's $_FILES nesting into a plain file list.
// Handles: single file, images[], images, and doubly-nested variants.
function flatten_upload_files($files) {
    $list = [];
    if (empty($files) || !is_array($files) || !isset($files['name'])) return $list;
    $walk = function ($name, $type, $tmp, $error, $size) use (&$walk, &$list) {
        if (is_array($name)) {
            foreach ($name as $k => $n) {
                $walk($n,
                    is_array($type) ? ($type[$k] ?? '') : $type,
                    is_array($tmp) ? ($tmp[$k] ?? '') : $tmp,
                    is_array($error) ? ($error[$k] ?? 4) : $error,
                    is_array($size) ? ($size[$k] ?? 0) : $size);
            }
            return;
        }
        $list[] = ['name' => $name, 'type' => $type, 'tmp_name' => $tmp, 'error' => $error, 'size' => $size];
    };
    $walk($files['name'], $files['type'] ?? '', $files['tmp_name'] ?? '', $files['error'] ?? 4, $files['size'] ?? 0);
    return $list;
}

// Validate ONE file's FORMAT ONLY (no per-file MB cap — cap is batch total).
// Returns validated array or null (empty slot). Names offending file on error.
function validate_image_upload($f) {
    if (!is_array($f)) json_error('Upload failed. Please try again.');
    $orig = isset($f['name']) ? (string)$f['name'] : 'photo';
    if (is_array($orig)) $orig = 'photo';
    $err = $f['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($err === UPLOAD_ERR_NO_FILE) return null; // empty slot, skip
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
        $cap = defined('UPLOAD_MAX_MB') ? (int)UPLOAD_MAX_MB : 8;
        $srv = @ini_get('upload_max_filesize');
        json_error('"' . $orig . '" was blocked by the server upload limit (' . $srv . '). Raise upload_max_filesize/post_max_size to at least ' . $cap . 'M (see .user.ini), or use a smaller photo.');
    }
    if ($err !== UPLOAD_ERR_OK) json_error('Upload of "' . $orig . '" failed. Please try again.');
    $allowed = allowed_image_mimes();
    $clientMime = strtolower((string)($f['type'] ?? ''));
    // Some browsers send octet-stream for valid images — only reject a client
    // MIME that is clearly a NON-image type.
    if ($clientMime !== '' && $clientMime !== 'application/octet-stream'
        && strpos($clientMime, 'image/') === 0 && !isset($allowed[$clientMime])) {
        json_error('"' . $orig . '" is not an allowed image. Use JPG, PNG, GIF or WEBP.');
    }
    $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    $knownExts = array_values($allowed);
    $knownExts[] = 'jpeg';
    if ($ext !== '' && !in_array($ext, $knownExts, true)) {
        json_error('"' . $orig . '" is not an allowed image. Use JPG, PNG, GIF or WEBP.');
    }
    // NOTE: no per-file MB check here — the 8MB cap is on the batch TOTAL
    // (see validate_upload_batch()). A single 3.2MB photo must pass.
    $tmp = $f['tmp_name'] ?? '';
    if (!is_file($tmp)) {
        json_error('Upload of "' . $orig . '" failed. Please try again.');
    }
    // Magic-bytes check: getimagesize reads the real header, not the extension.
    $info = @getimagesize($tmp);
    if ($info === false || !isset($allowed[$info['mime']])) {
        json_error('"' . $orig . '" is not a valid image file. Use JPG, PNG, GIF or WEBP.');
    }
    $mime = $info['mime'];
    $width = (int)$info[0];
    $height = (int)$info[1];
    if ($width < 1 || $height < 1 || $width > 12000 || $height > 12000) {
        json_error('"' . $orig . '" has invalid image dimensions.');
    }
    $bytes = @file_get_contents($tmp);
    if ($bytes === false || strlen($bytes) === 0) {
        json_error('Could not read "' . $orig . '". Please try again.');
    }
    return ['data' => $bytes, 'mime' => $mime, 'ext' => $allowed[$mime], 'width' => $width, 'height' => $height, 'name' => $orig];
}

// Collect comment-photo uploads from BOTH field names without double-counting.
// Browsers send `images[]`; curl/tests may send `images`.
// Detect that so we report "total too large" instead of a confusing error.
function collect_comment_uploads() {
    $a = flatten_upload_files(isset($_FILES['images']) ? $_FILES['images'] : null);
    $b = flatten_upload_files(isset($_FILES['images[]']) ? $_FILES['images[]'] : null);
    $merged = array_merge($a, $b);
    $seen = [];
    $out = [];
    foreach ($merged as $f) {
        $err = $f['error'] ?? UPLOAD_ERR_NO_FILE;
        if ($err === UPLOAD_ERR_NO_FILE) continue;
        $key = ($f['tmp_name'] ?? '') . '|' . ($f['size'] ?? 0) . '|' . ($f['name'] ?? '');
        if (isset($seen[$key])) continue;
        $seen[$key] = true;
        $out[] = $f;
    }
    return $out;
}

// When the POST exceeds post_max_size, PHP empties $_POST + $_FILES.
function detect_post_overflow() {
    $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($len <= 0) return;
    $postMax = trim((string)@ini_get('post_max_size'));
    $bytes = 0;
    if (is_numeric($postMax)) $bytes = (int)$postMax;
    elseif (preg_match('/^([\d.]+)\s*([gmk])?/i', $postMax, $m)) {
        $bytes = (float)$m[1];
        $u = strtolower($m[2] ?? '');
        if ($u === 'g') $bytes *= 1024 * 1024 * 1024;
        elseif ($u === 'm') $bytes *= 1024 * 1024;
        elseif ($u === 'k') $bytes *= 1024;
        $bytes = (int)$bytes;
    }
    if ($bytes > 0 && $len > $bytes && empty($_FILES) && empty($_POST)) {
        $cap = defined('UPLOAD_MAX_MB') ? (int)UPLOAD_MAX_MB : 8;
        json_error('Those photos are too large in total (' . number_format($len / 1048576, 1) . 'MB). The combined total must be ' . $cap . 'MB or smaller. Please remove some photos or use smaller files.');
    }
}

// Validate a whole batch: format per file + COMBINED total size cap.
function validate_upload_batch($uploads) {
    $cap = defined('UPLOAD_MAX_MB') ? (int)UPLOAD_MAX_MB : 8;
    $maxFiles = defined('UPLOAD_MAX_FILES') ? (int)UPLOAD_MAX_FILES : 6;
    if (count($uploads) > $maxFiles) json_error('You can attach up to ' . $maxFiles . ' photos.');
    $validated = [];
    foreach ($uploads as $f) {
        $v = validate_image_upload($f);
        if ($v !== null) $validated[] = $v;
    }
    $total = 0;
    foreach ($validated as $v) $total += strlen($v['data']);
    if ($total > $cap * 1024 * 1024) {
        json_error('Those photos are too large in total (' . number_format($total / 1048576, 1) . 'MB). The combined total must be ' . $cap . 'MB or smaller. Please remove some photos or use smaller files.');
    }
    return $validated;
}
