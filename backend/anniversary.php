<?php
// Anniversary send engine (replaces anniversary.js + node-cron).
// Triggered by: dashboard "Send email now" OR external cron hitting cron.php.
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/store.php';
require_once __DIR__ . '/mailer.php';

function check_and_send_anniversary($force = false) {
    $pdo = db();
    $settings = get_settings();
    $now = new DateTime('now');
    $m = (int)$now->format('n');
    $d = (int)$now->format('j');
    $y = (int)$now->format('Y');
    $sm = (int)$settings['deathMonth'];
    $sd = (int)$settings['deathDay'];
    $isToday = ($m === $sm && $d === $sd);
    if (!$isToday && !$force) return ['sent' => false, 'reason' => 'Not anniversary today'];
    $last = $settings['lastSentYear'];
    if (!$force && $last === $y) return ['sent' => false, 'reason' => 'Already sent this year'];

    $targets = $pdo->query('SELECT id, name, email FROM users WHERE notify=1 AND email IS NOT NULL AND email != ""')->fetchAll();
    $sent = 0;
    $failed = 0;
    foreach ($targets as $u) {
        try {
            send_mail(
                $u['email'],
                'In Loving Memory of Jhon Ora — ' . $y . ' Remembrance',
                anniversary_email_html($u['name'], $settings['siteUrl'], 1, $sm, $sd)
            );
            $sent++;
        } catch (Exception $e) {
            $failed++;
        }
    }
    $pdo->prepare('UPDATE settings SET last_sent_year=? WHERE id=1')->execute([$y]);
    $st = $pdo->prepare('INSERT INTO notifications (id, year, sent, failed, total, forced) VALUES (?,?,?,?,?,?)');
    $st->execute([new_id('n'), $y, $sent, $failed, count($targets), $force ? 1 : 0]);
    return ['sent' => true, 'year' => $y, 'emailed' => $sent, 'failed' => $failed, 'total' => count($targets)];
}
