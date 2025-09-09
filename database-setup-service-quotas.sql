-- Service Quota Tracking Database Schema
-- This file creates tables for tracking service provider quotas and usage

-- Table for storing service provider quota limits
CREATE TABLE IF NOT EXISTS `service_quotas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_name` varchar(50) NOT NULL,
  `quota_type` varchar(50) NOT NULL,
  `limit_value` bigint(20) NOT NULL,
  `window_seconds` int(11) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_service_quota` (`service_name`, `quota_type`),
  KEY `idx_service_name` (`service_name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing current quota usage
CREATE TABLE IF NOT EXISTS `service_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_name` varchar(50) NOT NULL,
  `quota_type` varchar(50) NOT NULL,
  `window_start` timestamp NOT NULL,
  `window_end` timestamp NOT NULL,
  `current_usage` bigint(20) NOT NULL DEFAULT 0,
  `limit_value` bigint(20) NOT NULL,
  `usage_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `is_rate_limited` tinyint(1) NOT NULL DEFAULT 0,
  `last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_service_window` (`service_name`, `quota_type`, `window_start`),
  KEY `idx_service_name` (`service_name`),
  KEY `idx_window_start` (`window_start`),
  KEY `idx_is_rate_limited` (`is_rate_limited`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing quota violation events
CREATE TABLE IF NOT EXISTS `quota_violations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_name` varchar(50) NOT NULL,
  `quota_type` varchar(50) NOT NULL,
  `violation_type` enum('rate_limit', 'quota_exceeded', 'burst_limit') NOT NULL,
  `requested_count` bigint(20) NOT NULL,
  `available_count` bigint(20) NOT NULL,
  `limit_value` bigint(20) NOT NULL,
  `window_start` timestamp NOT NULL,
  `window_end` timestamp NOT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `user_id` varchar(20) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_name` (`service_name`),
  KEY `idx_violation_type` (`violation_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Discord API quotas
INSERT INTO `service_quotas` (`service_name`, `quota_type`, `limit_value`, `window_seconds`, `description`) VALUES
('discord', 'global_rate_limit', 50, 1, 'Discord Global Rate Limit - 50 requests per second'),
('discord', 'per_route_rate_limit', 5, 1, 'Discord Per-Route Rate Limit - 5 requests per second per route'),
('discord', 'daily_requests', 1000000, 86400, 'Discord Daily Request Limit - 1M requests per day'),
('discord', 'guild_creation', 10, 3600, 'Discord Guild Creation Limit - 10 guilds per hour'),
('discord', 'channel_creation', 500, 3600, 'Discord Channel Creation Limit - 500 channels per hour'),
('discord', 'message_sending', 30, 60, 'Discord Message Sending Limit - 30 messages per minute'),
('discord', 'reaction_adding', 100, 60, 'Discord Reaction Adding Limit - 100 reactions per minute'),
('discord', 'file_upload', 100, 3600, 'Discord File Upload Limit - 100 files per hour'),
('discord', 'webhook_creation', 10, 3600, 'Discord Webhook Creation Limit - 10 webhooks per hour'),
('discord', 'ban_operations', 5, 60, 'Discord Ban Operations Limit - 5 bans per minute'),
('discord', 'kick_operations', 5, 60, 'Discord Kick Operations Limit - 5 kicks per minute'),
('discord', 'role_creation', 250, 3600, 'Discord Role Creation Limit - 250 roles per hour'),
('discord', 'emoji_creation', 50, 3600, 'Discord Emoji Creation Limit - 50 emojis per hour'),
('discord', 'invite_creation', 100, 3600, 'Discord Invite Creation Limit - 100 invites per hour'),
('discord', 'voice_channel_join', 5, 60, 'Discord Voice Channel Join Limit - 5 joins per minute');

-- Insert other service quotas
INSERT INTO `service_quotas` (`service_name`, `quota_type`, `limit_value`, `window_seconds`, `description`) VALUES
('mysql', 'connections', 100, 1, 'MySQL Connection Limit - 100 concurrent connections'),
('mysql', 'queries_per_second', 1000, 1, 'MySQL Query Rate Limit - 1000 queries per second'),
('mysql', 'slow_queries', 10, 60, 'MySQL Slow Query Limit - 10 slow queries per minute'),
('redis', 'commands_per_second', 10000, 1, 'Redis Command Rate Limit - 10K commands per second'),
('redis', 'memory_usage', 1073741824, 1, 'Redis Memory Limit - 1GB memory usage'),
('stripe', 'api_requests', 100, 1, 'Stripe API Rate Limit - 100 requests per second'),
('stripe', 'daily_requests', 100000, 86400, 'Stripe Daily Request Limit - 100K requests per day'),
('stripe', 'webhook_events', 1000, 3600, 'Stripe Webhook Event Limit - 1K events per hour'),
('email', 'smtp_connections', 10, 1, 'SMTP Connection Limit - 10 concurrent connections'),
('email', 'emails_per_minute', 100, 60, 'Email Sending Limit - 100 emails per minute'),
('email', 'daily_emails', 10000, 86400, 'Daily Email Limit - 10K emails per day');

-- Create indexes for better performance
CREATE INDEX `idx_service_quotas_active` ON `service_quotas` (`service_name`, `is_active`);
CREATE INDEX `idx_service_usage_window` ON `service_usage` (`service_name`, `window_start`, `window_end`);
CREATE INDEX `idx_quota_violations_service` ON `quota_violations` (`service_name`, `created_at`);

-- Create view for easy quota monitoring
CREATE OR REPLACE VIEW `quota_status` AS
SELECT 
  sq.service_name,
  sq.quota_type,
  sq.limit_value,
  sq.window_seconds,
  sq.description,
  COALESCE(su.current_usage, 0) as current_usage,
  COALESCE(su.usage_percentage, 0) as usage_percentage,
  COALESCE(su.is_rate_limited, 0) as is_rate_limited,
  CASE 
    WHEN COALESCE(su.usage_percentage, 0) >= 90 THEN 'critical'
    WHEN COALESCE(su.usage_percentage, 0) >= 75 THEN 'warning'
    WHEN COALESCE(su.usage_percentage, 0) >= 50 THEN 'moderate'
    ELSE 'good'
  END as status,
  su.last_updated
FROM service_quotas sq
LEFT JOIN service_usage su ON sq.service_name = su.service_name 
  AND sq.quota_type = su.quota_type 
  AND su.window_start <= NOW() 
  AND su.window_end >= NOW()
WHERE sq.is_active = 1;

-- Create procedure to update quota usage
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS UpdateQuotaUsage(
  IN p_service_name VARCHAR(50),
  IN p_quota_type VARCHAR(50),
  IN p_request_count INT
)
BEGIN
  DECLARE v_limit_value BIGINT;
  DECLARE v_window_seconds INT;
  DECLARE v_window_start TIMESTAMP;
  DECLARE v_window_end TIMESTAMP;
  DECLARE v_current_usage BIGINT;
  DECLARE v_usage_percentage DECIMAL(5,2);
  DECLARE v_is_rate_limited TINYINT(1);
  
  -- Get quota limits
  SELECT limit_value, window_seconds INTO v_limit_value, v_window_seconds
  FROM service_quotas 
  WHERE service_name = p_service_name 
    AND quota_type = p_quota_type 
    AND is_active = 1
  LIMIT 1;
  
  IF v_limit_value IS NOT NULL THEN
    -- Calculate current window
    SET v_window_start = DATE_SUB(NOW(), INTERVAL (UNIX_TIMESTAMP(NOW()) % v_window_seconds) SECOND);
    SET v_window_end = DATE_ADD(v_window_start, INTERVAL v_window_seconds SECOND);
    
    -- Get or create current usage record
    INSERT INTO service_usage (service_name, quota_type, window_start, window_end, current_usage, limit_value, usage_percentage, is_rate_limited)
    VALUES (p_service_name, p_quota_type, v_window_start, v_window_end, p_request_count, v_limit_value, 0, 0)
    ON DUPLICATE KEY UPDATE
      current_usage = current_usage + p_request_count,
      usage_percentage = ((current_usage + p_request_count) / limit_value) * 100,
      is_rate_limited = CASE WHEN ((current_usage + p_request_count) / limit_value) * 100 >= 100 THEN 1 ELSE 0 END,
      last_updated = NOW();
    
    -- Check if we exceeded the limit and log violation
    SELECT current_usage, usage_percentage, is_rate_limited 
    INTO v_current_usage, v_usage_percentage, v_is_rate_limited
    FROM service_usage 
    WHERE service_name = p_service_name 
      AND quota_type = p_quota_type 
      AND window_start = v_window_start;
    
    IF v_is_rate_limited = 1 THEN
      INSERT INTO quota_violations (service_name, quota_type, violation_type, requested_count, available_count, limit_value, window_start, window_end)
      VALUES (p_service_name, p_quota_type, 'rate_limit', p_request_count, GREATEST(0, v_limit_value - v_current_usage), v_limit_value, v_window_start, v_window_end);
    END IF;
  END IF;
END //
DELIMITER ;

-- Create procedure to get quota status
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS GetQuotaStatus(IN p_service_name VARCHAR(50))
BEGIN
  SELECT * FROM quota_status 
  WHERE service_name = p_service_name OR p_service_name IS NULL
  ORDER BY service_name, quota_type;
END //
DELIMITER ;
