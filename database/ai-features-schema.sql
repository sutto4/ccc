-- AI Features Database Schema for ServerMate
-- This file contains the SQL to create the necessary tables for AI integration

-- Set consistent collation for all tables
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Table for AI feature configuration per guild
CREATE TABLE IF NOT EXISTS guild_ai_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    model VARCHAR(50) NOT NULL DEFAULT 'gpt-3.5-turbo' COLLATE utf8mb4_unicode_ci,
    max_tokens_per_request INT NOT NULL DEFAULT 1000,
    max_messages_per_summary INT NOT NULL DEFAULT 50,
    custom_prompt TEXT COLLATE utf8mb4_unicode_ci,
    rate_limit_per_hour INT NOT NULL DEFAULT 10,
    rate_limit_per_day INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE KEY unique_guild_ai (guild_id),
    
    -- Indexes for performance
    INDEX idx_guild_id (guild_id),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraint after table creation (if it doesn't exist)
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_config' 
    AND CONSTRAINT_NAME = 'fk_guild_ai_config_guild_id'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE guild_ai_config ADD CONSTRAINT fk_guild_ai_config_guild_id FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE',
    'SELECT "Foreign key constraint already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Table for tracking AI usage per guild
CREATE TABLE IF NOT EXISTS guild_ai_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    user_id VARCHAR(20) NOT NULL COLLATE utf8mb4_unicode_ci,
    command_type ENUM('summarise', 'summary') NOT NULL COLLATE utf8mb4_unicode_ci,
    channel_id VARCHAR(20) NOT NULL COLLATE utf8mb4_unicode_ci,
    message_count INT NOT NULL DEFAULT 0,
    tokens_used INT NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0.00,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT NULL COLLATE utf8mb4_unicode_ci,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_guild_id (guild_id),
    INDEX idx_user_id (user_id),
    INDEX idx_command_type (command_type),
    INDEX idx_channel_id (channel_id),
    INDEX idx_created_at (created_at),
    INDEX idx_guild_created (guild_id, created_at),
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraint after table creation (if it doesn't exist)
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_usage' 
    AND CONSTRAINT_NAME = 'fk_guild_ai_usage_guild_id'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE guild_ai_usage ADD CONSTRAINT fk_guild_ai_usage_guild_id FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE',
    'SELECT "Foreign key constraint already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Table for AI rate limiting per guild
CREATE TABLE IF NOT EXISTS guild_ai_rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    user_id VARCHAR(20) NOT NULL COLLATE utf8mb4_unicode_ci,
    request_count_hour INT NOT NULL DEFAULT 0,
    request_count_day INT NOT NULL DEFAULT 0,
    last_request_hour TIMESTAMP NULL,
    last_request_day TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE KEY unique_guild_user (guild_id, user_id),
    
    -- Indexes for performance
    INDEX idx_guild_id (guild_id),
    INDEX idx_user_id (user_id),
    INDEX idx_last_request_hour (last_request_hour),
    INDEX idx_last_request_day (last_request_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraint after table creation (if it doesn't exist)
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_rate_limits' 
    AND CONSTRAINT_NAME = 'fk_guild_ai_rate_limits_guild_id'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE guild_ai_rate_limits ADD CONSTRAINT fk_guild_ai_rate_limits_guild_id FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE',
    'SELECT "Foreign key constraint already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Table for AI feature settings (global defaults)
CREATE TABLE IF NOT EXISTS ai_feature_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,
    setting_value TEXT NOT NULL COLLATE utf8mb4_unicode_ci,
    description TEXT COLLATE utf8mb4_unicode_ci,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default AI feature settings
INSERT IGNORE INTO ai_feature_settings (setting_key, setting_value, description) VALUES
('default_model', 'gpt-3.5-turbo', 'Default OpenAI model to use'),
('default_max_tokens', '1000', 'Default maximum tokens per request'),
('default_max_messages', '50', 'Default maximum messages per summary'),
('default_rate_limit_hour', '10', 'Default rate limit per hour per user'),
('default_rate_limit_day', '100', 'Default rate limit per day per user'),
('openai_api_key', '', 'OpenAI API key (encrypted)'),
('cost_per_1k_tokens_gpt35', '0.002', 'Cost per 1k tokens for GPT-3.5-turbo'),
('cost_per_1k_tokens_gpt4', '0.03', 'Cost per 1k tokens for GPT-4'),
('max_message_length', '4000', 'Maximum message length to process'),
('default_summary_prompt', 'Summarize the following Discord messages in a clear, concise way. Focus on the main topics, decisions, and key points discussed. Keep the summary under 500 words.', 'Default prompt for message summarization');

-- Add AI feature to the features table
INSERT IGNORE INTO features (feature_key, feature_name, description, minimum_package) VALUES
('ai_summarization', 'AI Message Summarization', 'Use AI to summarize Discord messages and conversations', 'premium');

-- Create indexes for better performance on usage queries
-- Note: MySQL doesn't support function-based indexes, so we create regular indexes
-- Using conditional logic to avoid duplicate index errors
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_usage' 
    AND INDEX_NAME = 'idx_usage_guild_created'
);

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_usage_guild_created ON guild_ai_usage (guild_id, created_at)',
    'SELECT "Index already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_usage' 
    AND INDEX_NAME = 'idx_usage_user_created'
);

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_usage_user_created ON guild_ai_usage (user_id, created_at)',
    'SELECT "Index already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_usage' 
    AND INDEX_NAME = 'idx_usage_success_created'
);

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_usage_success_created ON guild_ai_usage (success, created_at)',
    'SELECT "Index already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
