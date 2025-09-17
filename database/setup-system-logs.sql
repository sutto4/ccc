-- System Logs Table - Efficient design with proper indexing
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGINT AUTO_INCREMENT,
    
    -- Core identifiers (indexed)
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    
    -- Rich user context (avoid joins)
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(255),
    user_role ENUM('admin', 'owner', 'viewer', 'moderator') DEFAULT 'viewer',
    
    -- Action details
    action_type ENUM(
        'feature_toggle', 'feature_config', 'command_toggle', 'role_permission', 'user_management',
        'bot_config', 'channel_config', 'message_config', 'creator_alert',
        'moderation_action', 'system_setting', 'data_export', 'api_access',
        'login', 'logout', 'other'
    ) NOT NULL,
    action_name VARCHAR(100) NOT NULL, -- e.g., "enable_feature", "update_role_permissions"
    
    -- Context data (JSON for flexibility)
    target_type ENUM('guild', 'user', 'role', 'channel', 'feature', 'command', 'setting', 'system') DEFAULT 'system',
    target_id VARCHAR(50), -- ID of the thing being modified
    target_name VARCHAR(200), -- Name of the thing being modified
    
    -- Change details
    old_value JSON, -- Previous state
    new_value JSON, -- New state
    metadata JSON, -- Additional context (IP, user agent, etc.)
    
    -- Status and result
    status ENUM('success', 'failed', 'pending') DEFAULT 'success',
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary key must include partitioning column
    PRIMARY KEY (id, created_at),
    
    -- Indexes for efficient querying
    INDEX idx_guild_time (guild_id, created_at DESC),
    INDEX idx_user_time (user_id, created_at DESC),
    INDEX idx_action_time (action_type, created_at DESC),
    INDEX idx_target_time (target_type, target_id, created_at DESC),
    INDEX idx_status_time (status, created_at DESC),
    INDEX idx_search_time (guild_id, action_type, user_id, created_at DESC)
    
    -- Note: Foreign keys not supported with partitioned tables
    -- We'll handle referential integrity in application logic
) 
ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
    PARTITION p_2025_q1 VALUES LESS THAN (UNIX_TIMESTAMP('2025-04-01')),
    PARTITION p_2025_q2 VALUES LESS THAN (UNIX_TIMESTAMP('2025-07-01')),
    PARTITION p_2025_q3 VALUES LESS THAN (UNIX_TIMESTAMP('2025-10-01')),
    PARTITION p_2025_q4 VALUES LESS THAN (UNIX_TIMESTAMP('2026-01-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Create summary table for analytics (optional - for performance)
CREATE TABLE IF NOT EXISTS system_log_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_key DATE NOT NULL,
    guild_id VARCHAR(20),
    action_type VARCHAR(50),
    total_actions INT DEFAULT 0,
    unique_users INT DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    
    UNIQUE KEY unique_stat (date_key, guild_id, action_type),
    INDEX idx_date_guild (date_key, guild_id)
);
