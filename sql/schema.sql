-- Northern Veterinary Service — MySQL schema for Node backend
-- Charset: utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Session store (express-mysql-session can also auto-create; this matches default shape)
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `practice_name` varchar(255) NOT NULL DEFAULT '',
  `account_type` enum('admin','practice','team_member') NOT NULL,
  `role` varchar(64) NOT NULL DEFAULT 'vet',
  `phone` varchar(64) NOT NULL DEFAULT '',
  `rcvs_registration_number` varchar(64) NOT NULL DEFAULT '',
  `profile_photo_path` varchar(512) DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_account_type` (`account_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `addresses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `line1` varchar(255) NOT NULL DEFAULT '',
  `line2` varchar(255) NOT NULL DEFAULT '',
  `city` varchar(128) NOT NULL DEFAULT '',
  `county` varchar(128) NOT NULL DEFAULT '',
  `postcode` varchar(32) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_addresses_user` (`user_id`),
  CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_services` (
  `user_id` bigint unsigned NOT NULL,
  `service_code` varchar(64) NOT NULL,
  PRIMARY KEY (`user_id`, `service_code`),
  CONSTRAINT `fk_user_services_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `site_calendar_overrides` (
  `calendar_date` date NOT NULL,
  `status` enum('available','limited','unavailable') NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`calendar_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_availability` (
  `user_id` bigint unsigned NOT NULL,
  `avail_date` date NOT NULL,
  `status` enum('available','limited','unavailable') NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `avail_date`),
  CONSTRAINT `fk_staff_availability_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `booking_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `submitter_user_id` bigint unsigned NOT NULL,
  `service_required` varchar(64) NOT NULL,
  `locum_role` varchar(64) DEFAULT NULL,
  `procedure_name` varchar(512) DEFAULT NULL,
  `history` text NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'new',
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_submitter` (`submitter_user_id`),
  CONSTRAINT `fk_booking_submitter` FOREIGN KEY (`submitter_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `booking_request_dates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_request_id` bigint unsigned NOT NULL,
  `preferred_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_brd_request` (`booking_request_id`),
  KEY `idx_brd_date` (`preferred_date`),
  CONSTRAINT `fk_brd_booking` FOREIGN KEY (`booking_request_id`) REFERENCES `booking_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `booking_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_request_id` bigint unsigned NOT NULL,
  `original_name` varchar(512) NOT NULL,
  `stored_name` varchar(256) NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `file_path` varchar(1024) NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ba_booking` (`booking_request_id`),
  CONSTRAINT `fk_ba_booking` FOREIGN KEY (`booking_request_id`) REFERENCES `booking_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
