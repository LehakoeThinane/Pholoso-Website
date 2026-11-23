-- Pholoso Parent Coach, Stage 2: sessions, messages and feedback (MySQL 5.7+ / MariaDB 10.3+).
-- Run once in cPanel > phpMyAdmin > (your database) > SQL. Safe to run again: it only creates
-- tables that do not exist yet. Times are Unix timestamps (seconds), so the same code works
-- with the SQLite database the tests use.
--
-- Privacy (POPIA): anonymous sessions are deleted 30 days after they start (expires_at).
-- Message text has ID numbers, phone numbers and email addresses removed before it is stored.

CREATE TABLE IF NOT EXISTS coach_parents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  created_at INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coach_children (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_id INT UNSIGNED NOT NULL,
  nickname VARCHAR(40) NOT NULL,
  age VARCHAR(2) NOT NULL DEFAULT '',
  differences TEXT NOT NULL,
  INDEX (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coach_sessions (
  uuid CHAR(36) NOT NULL PRIMARY KEY,
  parent_id INT UNSIGNED NULL,
  topic VARCHAR(40) NOT NULL,
  stage VARCHAR(20) NOT NULL,
  profile TEXT NOT NULL,
  child_index TINYINT UNSIGNED NOT NULL DEFAULT 0,
  memory TEXT NOT NULL,
  choices TEXT NOT NULL,
  placeholder VARCHAR(160) NOT NULL DEFAULT '',
  ended TINYINT UNSIGNED NOT NULL DEFAULT 0,
  rating TINYINT UNSIGNED NULL,
  turns SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  -- While a reply is being written: a second request for the same conversation is refused
  busy_until INT UNSIGNED NULL,
  created_at INT UNSIGNED NOT NULL,
  expires_at INT UNSIGNED NOT NULL,
  INDEX (expires_at),
  INDEX (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coach_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_uuid CHAR(36) NOT NULL,
  role VARCHAR(10) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  INDEX (session_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coach_feedback (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_uuid CHAR(36) NOT NULL,
  message_index SMALLINT UNSIGNED NOT NULL,
  value VARCHAR(10) NOT NULL,
  reason VARCHAR(80) NOT NULL DEFAULT '',
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_at INT UNSIGNED NOT NULL,
  INDEX (session_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
