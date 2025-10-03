-- Add feature role permissions system
-- This creates a scalable role-based permission system for any feature

-- Create feature_role_permissions table
CREATE TABLE IF NOT EXISTS feature_role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    feature_key VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    role_id VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    allowed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_guild_feature_role (guild_id, feature_key, role_id),
    INDEX idx_guild_feature (guild_id, feature_key),
    INDEX idx_guild_role (guild_id, role_id),
    INDEX idx_feature (feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraints (conditional)
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'feature_role_permissions' 
    AND CONSTRAINT_NAME = 'fk_feature_role_permissions_guild_id'
);
SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE feature_role_permissions ADD CONSTRAINT fk_feature_role_permissions_guild_id FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE',
    'SELECT "Foreign key constraint already exists" as message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add feature_key column to guild_ai_config to link with feature permissions
-- Check if column exists first
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_config' 
    AND COLUMN_NAME = 'feature_key'
);
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE guild_ai_config ADD COLUMN feature_key VARCHAR(255) NOT NULL DEFAULT ''ai_summarization'' COLLATE utf8mb4_unicode_ci',
    'SELECT "Column already exists" as message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Update existing AI configs to have the correct feature_key
UPDATE guild_ai_config SET feature_key = 'ai_summarization' WHERE feature_key = 'ai_summarization' OR feature_key IS NULL OR feature_key = '';

-- Add index for feature_key in guild_ai_config
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_config' 
    AND INDEX_NAME = 'idx_feature_key'
);
SET @sql = IF(@index_exists = 0, 
    'ALTER TABLE guild_ai_config ADD INDEX idx_feature_key (feature_key)',
    'SELECT "Index already exists" as message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create a view for easy querying of feature permissions
CREATE OR REPLACE VIEW feature_permissions_view AS
SELECT 
    frp.guild_id,
    frp.feature_key,
    frp.role_id,
    frp.allowed,
    f.feature_name,
    f.description,
    f.minimum_package,
    f.is_active
FROM feature_role_permissions frp
JOIN features f ON frp.feature_key = f.feature_key
WHERE f.is_active = 1;

-- Insert default permissions for AI summarization feature (allow all roles by default)
-- This will be populated when the feature is first enabled for a guild
-- The application logic will handle creating default permissions

-- Add comments for documentation
ALTER TABLE feature_role_permissions COMMENT = 'Role-based permissions for features. Controls which roles can use specific features.';
ALTER TABLE guild_ai_config COMMENT = 'AI configuration per guild. Linked to features via feature_key.';
