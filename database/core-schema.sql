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
    feature_name VARCHAR(100) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    minimum_package ENUM('free', 'premium') NOT NULL DEFAULT 'free',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_minimum_package (minimum_package),
    INDEX idx_is_active (is_active)
);

-- Table for storing guild-specific feature settings
CREATE TABLE IF NOT EXISTS guild_features (
    guild_id VARCHAR(255) NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Primary key
    PRIMARY KEY (guild_id, feature_name),
    
    -- Foreign key constraints
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (feature_name) REFERENCES features(feature_name) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_guild_id (guild_id),
    INDEX idx_feature_name (feature_name),
    INDEX idx_enabled (enabled)
);

-- Insert default features
INSERT IGNORE INTO features (feature_name, display_name, description, minimum_package) VALUES
('verification_system', 'Verification System', 'Automated user verification system', 'free'),
('feedback_system', 'Feedback System', 'Collect and manage user feedback', 'free'),
('moderation', 'Moderation Tools', 'Basic moderation commands and tools', 'free'),
('reaction_roles', 'Reaction Roles', 'Assign roles through reactions', 'free'),
('custom_commands', 'Custom Commands', 'Create custom bot commands', 'free'),
('embedded_messages', 'Embedded Messages', 'Create and manage embedded messages', 'free'),
('fdg_donator_sync', 'FDG Donator Sync', 'Sync with FDG donator system', 'premium'),
('custom_prefix', 'Custom Prefix', 'Set custom bot command prefix', 'premium'),
('fivem_esx', 'FiveM ESX Support', 'FiveM ESX framework integration', 'premium'),
('fivem_qbcore', 'FiveM QBCore Support', 'FiveM QBCore framework integration', 'premium'),
('creator_alerts', 'Creator Alerts', 'Get notified about creator activities', 'premium'),
('bot_customisation', 'Bot Customisation', 'Customize bot appearance and behavior', 'premium'),
('custom_groups', 'Custom Groups', 'Create and manage custom user groups', 'premium'),
('premium_members', 'Premium Members', 'Manage premium member benefits', 'premium');

-- Insert a sample guild (replace with actual data)
INSERT IGNORE INTO guilds (guild_id, name, owner_id, premium) VALUES
('1403257704222429224', 'Sample Server', 'sample-owner-id', FALSE);

-- Enable all free features for the sample guild
INSERT IGNORE INTO guild_features (guild_id, feature_name, enabled)
SELECT '1403257704222429224', feature_name, TRUE
FROM features 
WHERE minimum_package = 'free';
