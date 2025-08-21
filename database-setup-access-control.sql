-- Database setup for access control system
-- Run this script to create the necessary tables

-- Table to store which users have access to which guilds
CREATE TABLE IF NOT EXISTS `server_access_control` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `guild_id` varchar(20) NOT NULL,
  `user_id` varchar(20) NOT NULL,
  `has_access` tinyint(1) NOT NULL DEFAULT 1,
  `granted_by` varchar(20) DEFAULT NULL,
  `granted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `guild_user_unique` (`guild_id`, `user_id`),
  KEY `guild_id` (`guild_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to store which roles grant access to the app
CREATE TABLE IF NOT EXISTS `server_role_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `guild_id` varchar(20) NOT NULL,
  `role_id` varchar(20) NOT NULL,
  `can_use_app` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `guild_role_unique` (`guild_id`, `role_id`),
  KEY `guild_id` (`guild_id`),
  KEY `role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some sample data for testing
-- Replace these with actual guild IDs and user IDs from your system

-- Example: Grant access to a bot inviter (replace with actual IDs)
-- INSERT INTO `server_access_control` (`guild_id`, `user_id`, `has_access`, `granted_by`, `notes`) 
-- VALUES ('YOUR_GUILD_ID', 'BOT_INVITER_USER_ID', 1, 'SYSTEM', 'Bot inviter - automatic access');

-- Example: Grant access to server owner (replace with actual IDs)
-- INSERT INTO `server_access_control` (`guild_id`, `user_id`, `has_access`, `granted_by`, `notes`) 
-- VALUES ('YOUR_GUILD_ID', 'SERVER_OWNER_USER_ID', 1, 'SYSTEM', 'Server owner - automatic access');

-- Example: Grant role-based access (replace with actual IDs)
-- INSERT INTO `server_role_permissions` (`guild_id`, `role_id`, `can_use_app`) 
-- VALUES ('YOUR_GUILD_ID', 'ADMIN_ROLE_ID', 1);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS `idx_server_access_control_guild` ON `server_access_control` (`guild_id`);
CREATE INDEX IF NOT EXISTS `idx_server_access_control_user` ON `server_access_control` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_server_role_permissions_guild` ON `server_role_permissions` (`guild_id`);
CREATE INDEX IF NOT EXISTS `idx_server_role_permissions_role` ON `server_role_permissions` (`role_id`);
