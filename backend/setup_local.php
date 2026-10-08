<?php
// One-shot local setup: create DB + tables if missing (run: php backend/setup_local.php)
$host = '127.0.0.1'; $port = '3306'; $user = 'root'; $pass = ''; $db = 'memorial';
try {
    $pdo = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "database `$db` ready\n";
} catch (Exception $e) {
    echo "SETUP FAIL: " . $e->getMessage() . "\n";
    echo "If access denied, create DB `memorial` manually (phpMyAdmin) and set backend/.env DB_* accordingly.\n";
    exit(1);
}
