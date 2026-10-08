<?php
// Options + settings store (MySQL-backed, replaces db.json options/settings).
require_once __DIR__ . '/db.php';

function get_options() {
    $pdo = db();
    $out = ['relations' => ['friend', 'family', 'batchmate', 'relatives'], 'batchLevels' => ['College', 'Highschool', 'Elementary', 'Others']];
    try {
        $rows = $pdo->query('SELECT okey, ovalue FROM options_store')->fetchAll();
        foreach ($rows as $r) {
            $v = json_decode($r['ovalue'], true);
            if (is_array($v)) $out[$r['okey']] = $v;
        }
    } catch (Exception $e) {}
    return $out;
}

function set_options($type, $values) {
    $pdo = db();
    $st = $pdo->prepare('INSERT INTO options_store (okey, ovalue) VALUES (?, ?) ON DUPLICATE KEY UPDATE ovalue=VALUES(ovalue)');
    $st->execute([$type, json_encode(array_values($values), JSON_UNESCAPED_UNICODE)]);
}

function get_settings() {
    $pdo = db();
    $row = $pdo->query('SELECT * FROM settings WHERE id=1 LIMIT 1')->fetch();
    if (!$row) return ['deathMonth' => DEATH_MONTH, 'deathDay' => DEATH_DAY, 'siteUrl' => SITE_URL];
    return [
        'deathMonth' => (int)$row['death_month'],
        'deathDay' => (int)$row['death_day'],
        'siteUrl' => $row['site_url'] ?: SITE_URL,
        'honoreeName' => $row['honoree_name'],
        'aka' => $row['aka'],
        'classInfo' => $row['class_info'],
        'lastSentYear' => $row['last_sent_year'] === null ? null : (int)$row['last_sent_year'],
    ];
}

function save_settings($deathMonth, $deathDay, $siteUrl) {
    $pdo = db();
    $st = $pdo->prepare('UPDATE settings SET death_month=?, death_day=?, site_url=? WHERE id=1');
    $st->execute([(int)$deathMonth, (int)$deathDay, (string)$siteUrl]);
}
