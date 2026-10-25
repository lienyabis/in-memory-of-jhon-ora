<?php
// End-to-end API test for the memorial project (run: php api_test.php).
// Requires the local server: php -S localhost:8000 router.php
$BASE = 'http://localhost:8000/api';
$pass = 0; $fail = 0;

function req($method, $url, $data = null, $token = null, $multipart = false) {
    $ch = curl_init($url);
    $headers = [];
    if ($token) $headers[] = 'Authorization: Bearer ' . $token;
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    if ($multipart && is_array($data)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data); // curl builds multipart for arrays
    } elseif ($data !== null) {
        $json = json_encode($data);
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    }
    if ($headers) curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $out = json_decode((string)$body, true);
    return ['code' => $code, 'json' => $out, 'raw' => (string)$body];
}

function check($label, $cond, $detail = '') {
    global $pass, $fail;
    if ($cond) { $pass++; echo "PASS  $label\n"; }
    else { $fail++; echo "FAIL  $label  $detail\n"; }
}

// --- tiny PNG generator (GD) ---
function png($w = 40, $h = 30) {
    $im = imagecreatetruecolor($w, $h);
    $bg = imagecolorallocate($im, 200, 160, 60);
    imagefill($im, 0, 0, $bg);
    ob_start(); imagepng($im); $b = ob_get_clean();
    imagedestroy($im);
    return $b;
}
$tmpPng = tempnam(sys_get_temp_dir(), 'tst') . '.png';
file_put_contents($tmpPng, png());

echo "== 1. Health & login ==\n";
$r = req('GET', "$BASE/health");
check('health ok', $r['code'] === 200 && !empty($r['json']['ok']));

$r = req('POST', "$BASE/auth/login", ['email' => 'superadmin@jhonora.memorial', 'password' => 'JhonOra2024!']);
check('superadmin login', $r['code'] === 200 && !empty($r['json']['token']), $r['raw']);
$SA = $r['json']['token'] ?? '';
$saUser = $r['json']['user'] ?? [];

echo "== 2. Signup guest + admin notify on comment ==\n";
$gEmail = 'testguest' . time() . '@example.com';
$r = req('POST', "$BASE/auth/signup", ['name' => 'Test Guest', 'email' => $gEmail, 'password' => 'secret123', 'relation' => 'friend']);
check('guest signup', $r['code'] === 200 && !empty($r['json']['token']), $r['raw']);
$G = $r['json']['token'] ?? '';
$GID = $r['json']['user']['id'] ?? '';
check('public_user has avatar url', strpos($r['json']['user']['avatar'] ?? '', '/api/avatars/') === 0, $r['raw']);

$beforeLen = is_file(__DIR__ . '/mail.log') ? strlen(file_get_contents(__DIR__ . '/mail.log')) : 0;
$r = req('POST', "$BASE/comments", ['message' => 'A wonderful memory of Jhon.'], $G, false);
check('guest comment created (pending)', $r['code'] === 200 && ($r['json']['comment']['status'] ?? '') === 'pending', $r['raw']);
$C1 = $r['json']['comment']['id'] ?? '';
check('admin notify attempted', array_key_exists('adminNotified', $r['json']), $r['raw']);
$afterLen = is_file(__DIR__ . '/mail.log') ? strlen(file_get_contents(__DIR__ . '/mail.log')) : 0;
echo "  mail.log grew: before=$beforeLen after=$afterLen (smtp may send for real)\n";

$r = req('GET', "$BASE/comments");
$ids = [];
foreach (($r['json']['byYear'] ?? []) as $yr => $list) foreach ($list as $c) $ids[] = $c['id'];
check('pending comment NOT in public feed', !in_array($C1, $ids, true), $r['raw']);

echo "== 3. 500-char limit ==\n";
$long = str_repeat('Lorem ipsum dolor sit amet ', 30); // 780 chars
$r = req('POST', "$BASE/comments", ['message' => $long], $G);
check('create >500 chars rejected', $r['code'] === 400 && stripos($r['json']['error'] ?? '', 'too long') !== false, $r['raw']);
$r = req('POST', "$BASE/comments", ['message' => str_repeat('a', 500)], $G);
check('create exactly 500 chars accepted', $r['code'] === 200, $r['raw']);
$C500 = $r['json']['comment']['id'] ?? '';
req('DELETE', "$BASE/comments/$C500", null, $G); // cleanup

echo "== 4. Avatar upload / serve / remove ==\n";
$r = req('POST', "$BASE/auth/me/avatar", ['avatar' => new CURLFile($tmpPng, 'image/png', 'test.png')], $G, true);
check('avatar upload', $r['code'] === 200 && !empty($r['json']['ok']), $r['raw']);
$r = req('GET', "$BASE/avatars/$GID");
check('avatar served as png', $r['code'] === 200 && strpos($r['raw'], "\x89PNG") === 0, 'code=' . $r['code']);
$r = req('DELETE', "$BASE/auth/me/avatar", null, $G);
check('avatar removed', $r['code'] === 200, $r['raw']);
$r = req('GET', "$BASE/avatars/$GID");
check('avatar 404 after removal', $r['code'] === 404, 'code=' . $r['code']);

echo "== 5. Change password ==\n";
$r = req('PUT', "$BASE/auth/me/password", ['currentPassword' => 'wrong', 'newPassword' => 'newpass1'], $G);
check('wrong current password rejected', $r['code'] === 400, $r['raw']);
$r = req('PUT', "$BASE/auth/me/password", ['currentPassword' => 'secret123', 'newPassword' => 'newpass1'], $G);
check('password changed', $r['code'] === 200 && !empty($r['json']['ok']), $r['raw']);
$r = req('POST', "$BASE/auth/login", ['email' => $gEmail, 'password' => 'newpass1']);
check('login with new password', $r['code'] === 200, $r['raw']);
$G = $r['json']['token'] ?? $G;

echo "== 6. Change email ==\n";
$newEmail = 'changed' . time() . '@example.com';
$r = req('PUT', "$BASE/auth/me/email", ['newEmail' => $newEmail, 'password' => 'bad'], $G);
check('wrong password rejected', $r['code'] === 400, $r['raw']);
$r = req('PUT', "$BASE/auth/me/email", ['newEmail' => $newEmail, 'password' => 'newpass1'], $G);
check('email changed + token reissued', $r['code'] === 200 && !empty($r['json']['token']) && ($r['json']['user']['email'] ?? '') === $newEmail, $r['raw']);
$G = $r['json']['token'] ?? $G;
$r = req('POST', "$BASE/auth/login", ['email' => $newEmail, 'password' => 'newpass1']);
check('login with new email', $r['code'] === 200, $r['raw']);
$G = $r['json']['token'] ?? $G;

echo "== 7. Role change (admin/superadmin) ==\n";
$r = req('PUT', "$BASE/admin/users/$GID/role", ['role' => 'admin'], $SA);
check('promote guest -> admin', $r['code'] === 200 && ($r['json']['role'] ?? '') === 'admin', $r['raw']);
$r = req('PUT', "$BASE/admin/users/$GID/role", ['role' => 'superadmin'], $SA);
check('invalid role rejected', $r['code'] === 400, $r['raw']);
$r = req('PUT', "$BASE/admin/users/{$saUser['id']}/role", ['role' => 'guest'], $SA);
check('cannot change own role', $r['code'] === 400 && stripos($r['json']['error'] ?? '', 'your own role') !== false, $r['raw']);
$r = req('PUT', "$BASE/admin/users/$GID/role", ['role' => 'guest'], $SA);
check('demote admin -> guest', $r['code'] === 200 && ($r['json']['role'] ?? '') === 'guest', $r['raw']);
// A separate ADMIN account (created by superadmin) can also use the endpoint
$aEmail = 'roleadmin' . time() . '@example.com';
$r = req('POST', "$BASE/admin/users/admin", ['name' => 'Role Admin', 'email' => $aEmail, 'password' => 'secret123'], $SA);
check('superadmin creates admin account', $r['code'] === 200, $r['raw']);
$AID = $r['json']['id'] ?? '';
$r = req('POST', "$BASE/auth/login", ['email' => $aEmail, 'password' => 'secret123']);
$A = $r['json']['token'] ?? '';
$r = req('PUT', "$BASE/admin/users/$GID/role", ['role' => 'admin'], $A);
check('admin can promote another user', $r['code'] === 200 && ($r['json']['role'] ?? '') === 'admin', $r['raw']);
$r = req('PUT', "$BASE/admin/users/$GID/role", ['role' => 'guest'], $SA); // back to guest for edit tests
req('DELETE', "$BASE/admin/users/$AID", null, $SA); // cleanup admin account

echo "== 8. Comment edit / delete by owner ==\n";
$r = req('PUT', "$BASE/comments/$C1", ['message' => str_repeat('x', 501)], $G);
check('edit >500 chars rejected', $r['code'] === 400, $r['raw']);
$r = req('PUT', "$BASE/comments/$C1", ['message' => 'Edited memory text'], $G);
check('owner edit ok (back to pending)', $r['code'] === 200 && ($r['json']['comment']['message'] ?? '') === 'Edited memory text' && ($r['json']['comment']['status'] ?? '') === 'pending', $r['raw']);

$r = req('POST', "$BASE/auth/signup", ['name' => 'Other', 'email' => 'other' . time() . '@example.com', 'password' => 'secret123', 'relation' => 'family']);
$G2 = $r['json']['token'] ?? '';
$r = req('PUT', "$BASE/comments/$C1", ['message' => 'hacked'], $G2);
check('other user edit forbidden', $r['code'] === 403, $r['raw']);
$r = req('DELETE', "$BASE/comments/$C1", null, $G2);
check('other user delete forbidden', $r['code'] === 403, $r['raw']);

echo "== 9. Photo upload + per-image delete ==\n";
$r = req('POST', "$BASE/comments", ['message' => 'With photos', 'images[]' => new CURLFile($tmpPng, 'image/png', 'p1.png')], $G, true);
check('comment with photo created', $r['code'] === 200 && count($r['json']['comment']['images'] ?? []) === 1, $r['raw']);
$C2 = $r['json']['comment']['id'] ?? '';
$photoUrl = $r['json']['comment']['images'][0] ?? '';
$photoId = basename($photoUrl);
$r = req('GET', 'http://localhost:8000' . $photoUrl);
check('photo served', $r['code'] === 200 && strpos($r['raw'], "\x89PNG") === 0, 'code=' . $r['code']);
$r = req('DELETE', "$BASE/photos/$photoId", null, $G2);
check('other user photo delete forbidden', $r['code'] === 403, $r['raw']);
$r = req('DELETE', "$BASE/photos/$photoId", null, $G);
check('owner photo delete ok', $r['code'] === 200, $r['raw']);
// append another photo while editing the comment (dedicated POST endpoint)
$r = req('POST', "$BASE/comments/$C2/images", ['message' => 'ignored'], $G, false);
check('add-images with no files rejected', $r['code'] === 400, $r['raw']);
$r = req('POST', "$BASE/comments/$C2/images", ['images[]' => new CURLFile($tmpPng, 'image/png', 'p2.png')], $G, true);
check('owner adds photo while editing', $r['code'] === 200 && count($r['json']['comment']['images'] ?? []) === 1, $r['raw']);
$r = req('POST', "$BASE/comments/$C2/images", ['images[]' => new CURLFile($tmpPng, 'image/png', 'p3.png')], $G2, true);
check('other user cannot add photos', $r['code'] === 403, $r['raw']);
$r = req('PUT', "$BASE/comments/$C2", ['message' => 'With photos (edited)'], $G, false);
check('edit without new files ok', $r['code'] === 200, $r['raw']);
$r = req('GET', "$BASE/comments/mine", null, $G);
check('my comments list contains comment', in_array($C2, array_column($r['json'] ?? [], 'id'), true), $r['raw']);

echo "== 10. Admin moderation still works ==\n";
$r = req('PUT', "$BASE/admin/comments/$C1", ['status' => 'approved'], $SA);
check('admin approve', $r['code'] === 200 && ($r['json']['status'] ?? '') === 'approved', $r['raw']);
$r = req('GET', "$BASE/comments");
$found = false; $hasUser = false;
foreach (($r['json']['byYear'] ?? []) as $yr => $list) foreach ($list as $c) {
    if ($c['id'] === $C1) { $found = true; $hasUser = array_key_exists('userId', $c); }
}
check('approved comment in public feed with userId', $found && $hasUser, $r['raw']);


// cleanup test rows
req('DELETE', "$BASE/admin/comments/$C1", null, $SA);
req('DELETE', "$BASE/admin/comments/$C2", null, $SA);
req('DELETE', "$BASE/admin/users/$GID", null, $SA);
@unlink($tmpPng);

echo "\nRESULT: $pass passed, $fail failed\n";
exit($fail > 0 ? 1 : 0);
