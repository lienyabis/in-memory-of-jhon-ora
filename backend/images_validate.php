<?php
// Image upload validation (pure PHP, no framework).
// Strict server-side validation runs BEFORE anything is stored:
//   1. PHP upload error code must be UPLOAD_ERR_OK
//   2. Size within UPLOAD_MAX_MB
//   3. Client MIME + extension must be an allowed image type
//   4. Real bytes verified via getimagesize() (magic bytes, not extension)
//   5. Extension normalized from the REAL mime, never trusted input
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

// Validate ONE uploaded file. Returns validated array or null (empty slot).
// Calls json_error() naming the offending file when invalid.
function validate_image_upload($f) {
    $orig = isset($f['name']) ? (string)$f['name'] : 'photo';
    $err = $f['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($err === UPLOAD_ERR_NO_FILE) return null; // empty slot, skip
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
        json_error('"' . $orig . '" is too large. Each photo must be ' . UPLOAD_MAX_MB . 'MB or smaller.');
    }
    if ($err !== UPLOAD_ERR_OK) json_error('Upload of "' . $orig . '" failed. Please try again.');
    $allowed = allowed_image_mimes();
    $clientMime = strtolower((string)($f['type'] ?? ''));
    $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    $knownExts = array_values($allowed);
    $knownExts[] = 'jpeg';
    if (($clientMime !== '' && !isset($allowed[$clientMime])) || ($ext !== '' && !in_array($ext, $knownExts, true))) {
        json_error('"' . $orig . '" is not an allowed image. Use JPG, PNG, GIF or WEBP.');
    }
    if (($f['size'] ?? 0) > UPLOAD_MAX_MB * 1024 * 1024) {
        json_error('"' . $orig . '" is too large. Each photo must be ' . UPLOAD_MAX_MB . 'MB or smaller.');
    }
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
    return ['data' => $bytes, 'mime' => $mime, 'ext' => $allowed[$mime], 'width' => $width, 'height' => $height];
}
