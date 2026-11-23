-- Pholoso Parent Coach, Stage 3: optional accounts (passwordless), reminders.
-- Run once in phpMyAdmin after 001_coach.sql. Safe to run again.
--
-- No passwords are stored. A parent signs in with a link sent by email (WCAG 3.3.8,
-- Accessible Authentication). Links and sign-ins are stored only as SHA-256 hashes.

CREATE TABLE IF NOT EXISTS coach_magic_links (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  session_uuid CHAR(36) NULL,
  created_at INT UNSIGNED NOT NULL,
  expires_at INT UNSIGNED NOT NULL,
  used_at INT UNSIGNED NULL,
  INDEX (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coach_logins (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  parent_id INT UNSIGNED NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  expires_at INT UNSIGNED NOT NULL,
  INDEX (parent_id),
  INDEX (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coach_reminders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_uuid CHAR(36) NOT NULL,
  parent_id INT UNSIGNED NOT NULL,
  send_at INT UNSIGNED NOT NULL,
  sent_at INT UNSIGNED NULL,
  INDEX (send_at),
  INDEX (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Each parent can stop all reminders with one click: a secret only they receive by email
CREATE TABLE IF NOT EXISTS coach_unsubscribe (
  parent_id INT UNSIGNED NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
