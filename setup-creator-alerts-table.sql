-- Setup for Creator Alerts system
-- This table stores the rules for creator alerts

CREATE TABLE IF NOT EXISTS creator_alert_rules (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    guild_id VARCHAR(32) NOT NULL,
    platform ENUM('twitch','youtube','x','tiktok') NOT NULL,
    creator VARCHAR(255) NOT NULL,         -- channel name, handle, or id
    discord_user_id VARCHAR(32) NULL,      -- discord user id to assign role to (optional)
    role_id VARCHAR(32) NOT NULL,          -- discord role id to assign
    channel_id VARCHAR(32) NOT NULL,       -- discord channel id for notifications
    notes VARCHAR(255) NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_guild (guild_id),
    KEY idx_guild_platform (guild_id, platform),
    KEY idx_enabled (enabled),
    KEY idx_discord_user (discord_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example usage:
-- INSERT INTO creator_alert_rules (guild_id, platform, creator, discord_user_id, role_id, channel_id, notes) 
-- VALUES ('123456789012345678', 'twitch', 'shroud', '987654321098765432', '111111111111111111', '222222222222222222', 'Shroud goes live');

-- To get all enabled Twitch rules for a guild:
-- SELECT * FROM creator_alert_rules WHERE guild_id = '123456789012345678' AND platform = 'twitch' AND enabled = 1;
