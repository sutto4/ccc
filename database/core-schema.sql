-- Core Database Schema for ServerMate
-- This file contains the SQL to create the necessary core tables

-- Table for storing guild/server information
CREATE TABLE IF NOT EXISTS guilds (
    guild_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon_url VARCHAR(500),
    owner_id VARCHAR(255) NOT NULL,
    premium BOOLEAN NOT NULL DEFAULT FALSE,
    premium_expires_at TIMESTAMP NULL,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_owner_id (owner_id),
    INDEX idx_premium (premium),
    INDEX idx_stripe_customer (stripe_customer_id)
);

-- Table for storing available features
CREATE TABLE IF NOT EXISTS features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature_key VARCHAR(50) NOT NULL UNIQUE,
    feature_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    minimum_package ENUM('free', 'premium') NOT NULL DEFAULT 'free',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_feature_key (feature_key),
    INDEX idx_minimum_package (minimum_package),
    INDEX idx_is_active (is_active)
);

-- Table for storing guild-specific feature settings
CREATE TABLE IF NOT EXISTS guild_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    feature_key VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE KEY unique_guild_feature (guild_id, feature_key),
    
    -- Foreign key constraints
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (feature_key) REFERENCES features(feature_key) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_guild_id (guild_id),
    INDEX idx_feature_key (feature_key),
    INDEX idx_enabled (enabled)
);

-- Insert default features
INSERT IGNORE INTO features (feature_key, feature_name, display_name, description, minimum_package) VALUES
('verification_system', 'verification_system', 'Verification System', 'Automated user verification system', 'free'),
('feedback_system', 'feedback_system', 'Feedback System', 'Collect and manage user feedback', 'free'),
('moderation', 'moderation', 'Moderation Tools', 'Basic moderation commands and tools', 'free'),
('reaction_roles', 'reaction_roles', 'Reaction Roles', 'Assign roles through reactions', 'free'),
('custom_commands', 'custom_commands', 'Custom Commands', 'Create custom bot commands', 'free'),
('embedded_messages', 'embedded_messages', 'Embedded Messages', 'Create and manage embedded messages', 'free'),
('fdg_donator_sync', 'fdg_donator_sync', 'FDG Donator Sync', 'Sync with FDG donator system', 'premium'),
('custom_prefix', 'custom_prefix', 'Custom Prefix', 'Set custom bot command prefix', 'premium'),
('fivem_esx', 'fivem_esx', 'FiveM ESX Support', 'FiveM ESX framework integration', 'premium'),
('fivem_qbcore', 'fivem_qbcore', 'FiveM QBCore Support', 'FiveM QBCore framework integration', 'premium'),
('creator_alerts', 'creator_alerts', 'Creator Alerts', 'Get notified about creator activities', 'premium'),
('bot_customisation', 'bot_customisation', 'Bot Customisation', 'Customize bot appearance and behavior', 'premium'),
('custom_groups', 'custom_groups', 'Custom Groups', 'Create and manage custom user groups', 'premium'),
('premium_members', 'premium_members', 'Premium Members', 'Manage premium member benefits', 'premium'),
('ai_summarization', 'ai_summarization', 'AI Message Summarization', 'Use AI to summarize Discord messages and conversations', 'premium');

-- Insert a sample guild (replace with actual data)
INSERT IGNORE INTO guilds (guild_id, name, owner_id, premium) VALUES
('1403257704222429224', 'Sample Server', 'sample-owner-id', FALSE);

-- Table for user login history (for admin analytics)
CREATE TABLE IF NOT EXISTS user_logins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discord_id VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    username VARCHAR(255),
    login_type ENUM('first_time', 'returning') NOT NULL DEFAULT 'returning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for performance
    INDEX idx_discord_id (discord_id),
    INDEX idx_email (email),
    INDEX idx_login_type (login_type),
    INDEX idx_created_at (created_at)
);

-- Table for user notifications (sounds, alerts, etc.)
CREATE TABLE IF NOT EXISTS user_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT,
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,

    -- Indexes for performance
    INDEX idx_user_type (user_id, type),
    INDEX idx_created_at (created_at),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_type_created (type, created_at),
    INDEX idx_read_status (user_id, read_at)
);

-- Table for moderation cases
CREATE TABLE IF NOT EXISTS moderation_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    case_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_user_id VARCHAR(20) NOT NULL,
    target_username VARCHAR(255) NOT NULL,
    moderator_user_id VARCHAR(20) NOT NULL,
    moderator_username VARCHAR(255) NOT NULL,
    reason TEXT,
    duration_ms BIGINT NULL,
    duration_label VARCHAR(100) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes for performance
    INDEX idx_guild_id (guild_id),
    INDEX idx_case_id (case_id),
    INDEX idx_target_user (target_user_id),
    INDEX idx_moderator_user (moderator_user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_active (active),
    INDEX idx_created_at (created_at),
    UNIQUE KEY unique_guild_case (guild_id, case_id)
);

-- Table for moderation action logs
CREATE TABLE IF NOT EXISTS moderation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    case_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(255) NOT NULL,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for performance
    INDEX idx_guild_id (guild_id),
    INDEX idx_case_id (case_id),
    INDEX idx_action (action),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),

    -- Foreign key constraint
    FOREIGN KEY (case_id) REFERENCES moderation_cases(id) ON DELETE CASCADE
);

-- Table for moderation evidence
CREATE TABLE IF NOT EXISTS moderation_evidence (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    guild_id VARCHAR(255) NOT NULL,
    evidence_type VARCHAR(50) NOT NULL,
    content TEXT,
    uploaded_by VARCHAR(20) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for performance
    INDEX idx_case_id (case_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_evidence_type (evidence_type),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_uploaded_at (uploaded_at),

    -- Foreign key constraint
    FOREIGN KEY (case_id) REFERENCES moderation_cases(id) ON DELETE CASCADE
);

-- Table for slash command permissions
CREATE TABLE IF NOT EXISTS slash_command_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    command_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes for performance
    INDEX idx_guild_id (guild_id),
    INDEX idx_command_name (command_name),
    UNIQUE KEY unique_guild_command (guild_id, command_name)
);

-- Enable all free features for the sample guild
INSERT IGNORE INTO guild_features (guild_id, feature_key, enabled)
SELECT '1403257704222429224', feature_key, TRUE
FROM features
WHERE minimum_package = 'free';
