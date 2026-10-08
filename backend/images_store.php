<?php
// BLOB photo storage + serving (pure PHP). Photos live in MySQL `photos`
// table; served via GET /api/photos/{id} with correct Content-Type.
require_once __DIR__ . '/db.php';

// Downscale huge photos to IMAGE_MAX_DIMENSION px (long edge) when GD is
// available, re-encoded at IMAGE_JPEG_QUALITY. Returns null to keep original.
function maybe_downscale_image($bytes, $mime, $width, $height) {
    $max = defined('IMAGE_MAX_DIMENSION') ? (int)IMAGE_MAX_DIMENSION : 1600;
    if ($max <= 0) return null;
    if (max($width, $height) <= $max) return null;
    if (!function_exists('imagecreatefromstring')) return null; // no GD: keep original
    $src = @imagecreatefromstring($bytes);
    if ($src === false) return null;
    $scale = $max / max($width, $height);
    $nw = max(1, (int)round($width * $scale));
    $nh = max(1, (int)round($height * $scale));
    $dst = imagecreatetruecolor($nw, $nh);
    if ($mime === 'image/png' || $mime === 'image/webp') {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }
    if (!imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $width, $height)) {
        imagedestroy($src); imagedestroy($dst);
        return null;
    }
    imagedestroy($src);
    ob_start();
    $outMime = $mime;
    if ($mime === 'image/png') imagepng($dst, null, 6);
    elseif ($mime === 'image/webp') imagewebp($dst, null, 85);
    elseif ($mime === 'image/gif') { imagejpeg($dst, null, (int)IMAGE_JPEG_QUALITY); $outMime = 'image/jpeg'; }
    else { imagejpeg($dst, null, (int)IMAGE_JPEG_QUALITY); $outMime = 'image/jpeg'; }
    $out = ob_get_clean();
    imagedestroy($dst);
    if ($out === false || strlen($out) === 0) return null;
    return ['data' => $out, 'mime' => $outMime, 'width' => $nw, 'height' => $nh];
}

// Persist a validated image as a BLOB row. Returns the photo id.
function store_photo_blob($pdo, $commentId, $validated) {
    $bytes = $validated['data'];
    $mime = $validated['mime'];
    $resized = maybe_downscale_image($bytes, $mime, $validated['width'], $validated['height']);
    if ($resized !== null) {
        $bytes = $resized['data'];
        $mime = $resized['mime'];
        $validated['width'] = $resized['width'];
        $validated['height'] = $resized['height'];
    }
    $id = new_id('p');
    $size = strlen($bytes);
    $st = $pdo->prepare('INSERT INTO photos (id, comment_id, mime, size_bytes, width, height, data) VALUES (?,?,?,?,?,?,?)');
    $st->bindParam(1, $id);
    $st->bindParam(2, $commentId);
    $st->bindParam(3, $mime);
    $st->bindParam(4, $size, PDO::PARAM_INT);
    $st->bindParam(5, $validated['width'], PDO::PARAM_INT);
    $st->bindParam(6, $validated['height'], PDO::PARAM_INT);
    $st->bindParam(7, $bytes, PDO::PARAM_LOB);
    $st->execute();
    return $id;
}

// URL served by this backend for a photo id, e.g. /api/photos/p_xxx
function photo_url($photoId) {
    return '/api/photos/' . $photoId;
}

// Collect display image URLs for a comment row:
// new BLOB photos -> /api/photos/{id}; legacy /uploads files -> as-is.
function comment_image_urls($pdo, $c) {
    $urls = [];
    try {
        $st = $pdo->prepare('SELECT id FROM photos WHERE comment_id=? ORDER BY created_at ASC, id ASC');
        $st->execute([$c['id']]);
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $pid) $urls[] = photo_url($pid);
    } catch (Exception $e) { /* table predates migration on odd hosts */ }
    if (!empty($urls)) return $urls;
    if (!empty($c['images_json'])) {
        $d = json_decode($c['images_json'], true);
        if (is_array($d) && count($d)) return array_values($d);
    }
    if (!empty($c['image'])) return [$c['image']];
    return [];
}

// Serve one photo's bytes with caching headers. Exits.
function serve_photo_blob($pdo, $photoId) {
    if (!preg_match('/^[A-Za-z0-9_-]{1,40}$/', (string)$photoId)) {
        json_error('Not found', 404);
    }
    $st = $pdo->prepare('SELECT mime, size_bytes, data FROM photos WHERE id=? LIMIT 1');
    $st->execute([$photoId]);
    $row = $st->fetch();
    if (!$row) json_error('Not found', 404);
    $allowed = ['image/jpeg' => 1, 'image/png' => 1, 'image/gif' => 1, 'image/webp' => 1];
    $mime = isset($allowed[$row['mime']]) ? $row['mime'] : 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (int)$row['size_bytes']);
    header('Cache-Control: public, max-age=31536000, immutable');
    header('X-Content-Type-Options: nosniff');
    echo $row['data'];
    exit;
}
