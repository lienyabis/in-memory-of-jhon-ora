<?php
// Email: SMTP (raw sockets, no dependency) -> PHP mail() -> dev log file.
// On InfinityFree free hosting, outbound SMTP ports are often blocked,
// so we try SMTP first, then fall back to PHP mail(), then log.
require_once __DIR__ . '/config.php';

function anniversary_email_html($name, $siteUrl, $yearsSince, $deathMonth, $deathDay) {
    $n = htmlspecialchars($name ?: 'friend', ENT_QUOTES, 'UTF-8');
    $s = htmlspecialchars($siteUrl, ENT_QUOTES, 'UTF-8');
    $ys = (int)$yearsSince;
    $plural = ($ys === 1) ? '' : 's';
    return ''
    . '<div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#f8fafc;padding:24px;border-radius:12px">'
    . '<div style="text-align:center">'
    . '<div style="font-size:13px;letter-spacing:3px;color:#64748b">IN LOVING MEMORY</div>'
    . '<h1 style="color:#0f172a;margin:8px 0">Jhon Sollano Ora</h1>'
    . '<div style="color:#475569;font-style:italic">&ldquo;Princess John Ora&rdquo; &bull; BSICT Class 2020</div>'
    . '</div>'
    . "<p>Dear {$n},</p>"
    . "<p>Today marks <b>{$ys} year{$plural}</b> since Jhon passed away ({$deathMonth}/{$deathDay}). We remember his smile, kindness, and light that continues to live in all of us.</p>"
    . '<p>We invite you to visit his memorial, light a candle in prayer, and share a memory or photo:</p>'
    . '<div style="text-align:center;margin:24px 0">'
    . "<a href=\"{$s}\" style=\"background:#0f172a;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none\">Visit Memorial Website</a>"
    . '</div>'
    . '<p style="color:#64748b;font-size:13px">You receive this because you signed up to remember Jhon. Reply to this email if you wish to be removed.</p>'
    . '<p>With love and remembrance,<br/>Jhon Ora Memorial Family</p>'
    . '</div>';
}

function send_mail($to, $subject, $html) {
    // 1) Try SMTP if configured
    if (SMTP_HOST && SMTP_USER) {
        $r = smtp_send(SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, $to, $subject, $html);
        if ($r === true) return ['sent' => true, 'via' => 'smtp'];
    }
    // 2) Try PHP mail()
    if (function_exists('mail')) {
        $from = SMTP_FROM ?: 'no-reply@localhost';
        // extract plain address for headers
        $fromAddr = $from;
        if (preg_match('/<([^>]+)>/', $from, $m)) $fromAddr = $m[1];
        $headers = "MIME-Version: 1.0\r\nContent-type: text/html; charset=UTF-8\r\nFrom: {$from}\r\nReply-To: {$fromAddr}\r\nX-Mailer: PHP/" . phpversion();
        $ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, $headers);
        if ($ok) return ['sent' => true, 'via' => 'mail'];
    }
    // 3) Dev/log mode: append to backend/mail.log (works everywhere, proves cron runs)
    $log = __DIR__ . '/mail.log';
    $entry = '[' . date('c') . "] TO: {$to} | SUBJECT: {$subject}\n" . strip_tags($html) . "\n----\n";
    @file_put_contents($log, $entry, FILE_APPEND);
    return ['logged' => true, 'via' => 'log'];
}

// Minimal SMTP client supporting STARTTLS (587) and SMTPS (465), PLAIN/LOGIN auth.
function smtp_send($host, $port, $user, $pass, $from, $to, $subject, $html) {
    $fromAddr = $from;
    if (preg_match('/<([^>]+)>/', $from, $m)) $fromAddr = $m[1];
    $secure = ((int)$port === 465);
    $remote = ($secure ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
    $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) return false;
    stream_set_timeout($fp, 15);

    $read = function () use ($fp) {
        $out = '';
        while (($line = fgets($fp, 1024)) !== false) {
            $out .= $line;
            if (preg_match('/^\d{3} /', $line)) break;
        }
        return $out;
    };
    $cmd = function ($c) use ($fp, $read) {
        if ($c !== null) fwrite($fp, $c . "\r\n");
        return $read();
    };

    $greet = $read();
    if (strpos($greet, '220') !== 0) { fclose($fp); return false; }
    $ehlo = $cmd('EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    if (strpos($ehlo, '250') !== 0) { fclose($fp); return false; }

    // STARTTLS on port 587
    if (!$secure && stripos($ehlo, 'STARTTLS') !== false) {
        $r = $cmd('STARTTLS');
        if (strpos($r, '220') === 0) {
            if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) { fclose($fp); return false; }
            $ehlo = $cmd('EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
            if (strpos($ehlo, '250') !== 0) { fclose($fp); return false; }
        }
    }
    $r = $cmd('AUTH LOGIN');
    if (strpos($r, '334') !== 0) {
        // try plain
        $r = $cmd('AUTH PLAIN ' . base64_encode("\0" . $user . "\0" . $pass));
        if (strpos($r, '235') !== 0) { fclose($fp); return false; }
    } else {
        $r = $cmd(base64_encode($user));
        if (strpos($r, '334') !== 0) { fclose($fp); return false; }
        $r = $cmd(base64_encode($pass));
        if (strpos($r, '235') !== 0) { fclose($fp); return false; }
    }
    $r = $cmd('MAIL FROM:<' . $fromAddr . '>');
    if (strpos($r, '250') !== 0) { fclose($fp); return false; }
    $r = $cmd('RCPT TO:<' . $to . '>');
    if (strpos($r, '250') !== 0 && strpos($r, '251') !== 0) { fclose($fp); return false; }
    $r = $cmd('DATA');
    if (strpos($r, '354') !== 0) { fclose($fp); return false; }
    $headers = "From: {$from}\r\nTo: <{$to}>\r\nSubject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\nDate: " . date('r') . "\r\n";
    fwrite($fp, $headers . "\r\n" . $html . "\r\n.\r\n");
    $r = $read();
    $cmd('QUIT');
    fclose($fp);
    return (strpos($r, '250') === 0);
}
