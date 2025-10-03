-- Add role-based permissions for AI features
-- This table stores which roles can use AI features in each guild

CREATE TABLE IF NOT EXISTS guild_ai_role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    role_id VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    can_use_ai BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_guild_role_ai (guild_id, role_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_role_id (role_id),
    INDEX idx_can_use_ai (can_use_ai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraint for guild_id
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_role_permissions' 
    AND CONSTRAINT_NAME = 'fk_guild_ai_role_permissions_guild_id'
);
SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE guild_ai_role_permissions ADD CONSTRAINT fk_guild_ai_role_permissions_guild_id FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE',
    'SELECT "Foreign key constraint already exists" as message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add role permissions column to guild_ai_config table
ALTER TABLE guild_ai_config 
ADD COLUMN IF NOT EXISTS require_role_permission BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for the new column
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guild_ai_config' 
    AND INDEX_NAME = 'idx_require_role_permission'
);
SET @sql = IF(@index_exists = 0, 
    'ALTER TABLE guild_ai_config ADD INDEX idx_require_role_permission (require_role_permission)',
    'SELECT "Index already exists" as message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
