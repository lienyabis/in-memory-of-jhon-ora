<?php
// PDO MySQL connection + auto-migrate (creates tables if missing) + seed.
require_once __DIR__ . '/config.php';

function db() {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    // Ensure tables exist (safe to run on every request; cheap on MySQL)
    ensure_schema($pdo);
    ensure_seed($pdo);
    return $pdo;
}

function ensure_schema(PDO $pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(40) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('guest','admin','superadmin') NOT NULL DEFAULT 'guest',
        relation VARCHAR(60) NOT NULL DEFAULT '',
        batch_level VARCHAR(60) NOT NULL DEFAULT '',
        notify TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(40) PRIMARY KEY,
        user_id VARCHAR(40) NULL,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(190) NOT NULL DEFAULT '',
        relation VARCHAR(60) NOT NULL DEFAULT '',
        batch_level VARCHAR(60) NOT NULL DEFAULT '',
        message TEXT NOT NULL,
        image VARCHAR(255) NOT NULL DEFAULT '',
        images_json TEXT NULL,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reviewed_by VARCHAR(190) NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status_created (status, created_at),
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS options_store (
        okey VARCHAR(40) PRIMARY KEY,
        ovalue TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        id TINYINT PRIMARY KEY DEFAULT 1,
        death_month TINYINT NOT NULL DEFAULT 09,
        death_day TINYINT NOT NULL DEFAULT 29,
        site_url VARCHAR(255) NOT NULL DEFAULT '',
        honoree_name VARCHAR(120) NOT NULL DEFAULT 'Jhon Sollano Ora',
        aka VARCHAR(120) NOT NULL DEFAULT 'Princess John Ora',
        class_info VARCHAR(160) NOT NULL DEFAULT 'BSICT Students Class 2020',
        last_sent_year INT NULL,
        CONSTRAINT one_row CHECK (id = 1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(40) PRIMARY KEY,
        year INT NOT NULL,
        sent INT NOT NULL DEFAULT 0,
        failed INT NOT NULL DEFAULT 0,
        total INT NOT NULL DEFAULT 0,
        forced TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS photos (
        id VARCHAR(40) PRIMARY KEY,
        comment_id VARCHAR(40) NOT NULL,
        mime VARCHAR(40) NOT NULL,
        size_bytes INT UNSIGNED NOT NULL,
        width SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        height SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        data LONGBLOB NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_comment (comment_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Default rows
    $pdo->exec("INSERT IGNORE INTO settings (id, death_month, death_day, site_url) VALUES (1, "
        . (int)DEATH_MONTH . ", " . (int)DEATH_DAY . ", " . $pdo->quote(SITE_URL) . ")");
    $pdo->exec("INSERT IGNORE INTO options_store (okey, ovalue) VALUES
        ('relations', '[\"friend\",\"family\",\"batchmate\",\"relatives\"]'),
        ('batchLevels', '[\"College\",\"Highschool\",\"Elementary\",\"Others\"]')");
}

function new_id($prefix) {
    return $prefix . '_' . base_convert((string)(int)(microtime(true) * 1000), 10, 36) . substr(md5(uniqid((string)mt_rand(), true)), 0, 6);
}

function ensure_seed(PDO $pdo) {
    // Create the ONE superadmin if none exists (from config/.env)
    $count = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='superadmin'")->fetchColumn();
    if ($count > 0) return;
    $email = strtolower(SUPERADMIN_EMAIL);
    $existing = null;
    try {
        $st = $pdo->prepare("SELECT * FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1");
        $st->execute([$email]);
        $existing = $st->fetch();
    } catch (Exception $e) { $existing = null; }
    $hash = password_hash(SUPERADMIN_PASSWORD, PASSWORD_BCRYPT, ['cost' => 10]);
    if ($existing) {
        $st = $pdo->prepare("UPDATE users SET role='superadmin', password_hash=?, notify=1 WHERE id=?");
        $st->execute([$hash, $existing['id']]);
    } else {
        $st = $pdo->prepare("INSERT INTO users (id,name,email,password_hash,role,relation,batch_level,notify) VALUES (?,?,?,?,?,?,?,1)");
        $st->execute([new_id('u'), SUPERADMIN_NAME, $email, $hash, 'superadmin', 'family', '']);
    }
}
