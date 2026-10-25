-- ============================================================
-- John Paul Ora Memorial — MySQL schema (split project)
-- NOTE: the backend auto-creates all tables + seed rows on its
-- first request (see backend/db.php ensure_schema/ensure_seed),
-- so importing this file is OPTIONAL. Use it if you prefer to
-- create the schema manually or inspect the table structure.
-- ============================================================

CREATE DATABASE IF NOT EXISTS `memorial`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `memorial`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(40) PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('guest','admin','superadmin') NOT NULL DEFAULT 'guest',
  `relation` VARCHAR(60) NOT NULL DEFAULT '',
  `batch_level` VARCHAR(60) NOT NULL DEFAULT '',
  `notify` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `comments` (
  `id` VARCHAR(40) PRIMARY KEY,
  `user_id` VARCHAR(40) NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL DEFAULT '',
  `relation` VARCHAR(60) NOT NULL DEFAULT '',
  `batch_level` VARCHAR(60) NOT NULL DEFAULT '',
  `message` TEXT NOT NULL,
  `image` VARCHAR(255) NOT NULL DEFAULT '',
  `images_json` TEXT NULL,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` VARCHAR(190) NULL,
  `reviewed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_status_created` (`status`, `created_at`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `options_store` (
  `okey` VARCHAR(40) PRIMARY KEY,
  `ovalue` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` TINYINT PRIMARY KEY DEFAULT 1,
  `death_month` TINYINT NOT NULL DEFAULT 09,
  `death_day` TINYINT NOT NULL DEFAULT 29,
  `site_url` VARCHAR(255) NOT NULL DEFAULT '',
  `honoree_name` VARCHAR(120) NOT NULL DEFAULT 'John Paul Sollano Ora',
  `aka` VARCHAR(120) NOT NULL DEFAULT 'Princess John Ora',
  `class_info` VARCHAR(160) NOT NULL DEFAULT 'BSICT Students Class 2020',
  `last_sent_year` INT NULL,
  CONSTRAINT `one_row` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(40) PRIMARY KEY,
  `year` INT NOT NULL,
  `sent` INT NOT NULL DEFAULT 0,
  `failed` INT NOT NULL DEFAULT 0,
  `total` INT NOT NULL DEFAULT 0,
  `forced` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comment photos (stored as MySQL BLOBs)
CREATE TABLE IF NOT EXISTS `photos` (
  `id` VARCHAR(40) PRIMARY KEY,
  `comment_id` VARCHAR(40) NOT NULL,
  `mime` VARCHAR(40) NOT NULL,
  `size_bytes` INT UNSIGNED NOT NULL,
  `width` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `height` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `data` LONGBLOB NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_comment` (`comment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profile pictures (one per user, cropped client-side before upload)
CREATE TABLE IF NOT EXISTS `avatars` (
  `user_id` VARCHAR(40) PRIMARY KEY,
  `mime` VARCHAR(40) NOT NULL,
  `size_bytes` INT UNSIGNED NOT NULL,
  `width` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `height` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `data` LONGBLOB NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password-reset links (forgot password): one row per emailed token.
-- The emailed raw token is never stored — only its SHA-256 hash.
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `token_hash` VARCHAR(64) PRIMARY KEY,
  `user_id` VARCHAR(40) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_prt_user` (`user_id`),
  INDEX `idx_prt_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default rows (same as backend auto-seed)
INSERT IGNORE INTO `settings` (`id`, `death_month`, `death_day`, `site_url`) VALUES (1, 9, 29, 'http://localhost:8000');
INSERT IGNORE INTO `options_store` (`okey`, `ovalue`) VALUES
  ('relations', '["friend","family","batchmate","relatives"]'),
  ('batchLevels', '["College","Highschool","Elementary","Others"]');

-- The superadmin account is created automatically by the backend
-- on first request (email/password come from backend/.env —
-- SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD).
