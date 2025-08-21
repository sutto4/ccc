-- Server Groups System
-- Allows grouping servers together under a single owner for easier management

-- Create server_groups table
CREATE TABLE IF NOT EXISTS `server_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Display name for the group',
  `description` text COMMENT 'Optional description of the group',
  `owner_user_id` varchar(255) NOT NULL COMMENT 'Discord user ID of the group owner',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `owner_user_id` (`owner_user_id`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create server_group_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS `server_group_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL COMMENT 'Reference to server_groups.id',
  `guild_id` varchar(255) NOT NULL COMMENT 'Discord guild ID',
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `added_by` varchar(255) NOT NULL COMMENT 'Discord user ID who added this server to the group',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_guild` (`group_id`, `guild_id`),
  KEY `group_id` (`group_id`),
  KEY `guild_id` (`guild_id`),
  KEY `added_at` (`added_at`),
  CONSTRAINT `fk_group_members_group` FOREIGN KEY (`group_id`) REFERENCES `server_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_members_guild` FOREIGN KEY (`guild_id`) REFERENCES `guilds` (`guild_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add group_id column to existing guilds table for easier querying
ALTER TABLE `guilds` ADD COLUMN `group_id` int(11) NULL COMMENT 'Reference to server_groups.id if this guild is part of a group';
ALTER TABLE `guilds` ADD KEY `group_id` (`group_id`);
ALTER TABLE `guilds` ADD CONSTRAINT `fk_guilds_group` FOREIGN KEY (`group_id`) REFERENCES `server_groups` (`id`) ON DELETE SET NULL;

-- Insert some sample data for testing (optional)
-- INSERT INTO `server_groups` (`name`, `description`, `owner_user_id`) VALUES 
-- ('My Gaming Community', 'Collection of gaming-related servers', '351321199059533826'),
-- ('Business Servers', 'Professional and business-focused servers', '351321199059533826');

-- Note: You'll need to populate server_group_members and update guilds.group_id after creating groups
