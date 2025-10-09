-- Add owner_id column to guilds table if it doesn't exist
-- Check if column exists first, then add if needed

-- For MySQL, we need to check if column exists before adding
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'guilds' 
    AND COLUMN_NAME = 'owner_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE guilds ADD COLUMN owner_id VARCHAR(255) NULL AFTER icon_url, ADD INDEX idx_owner_id (owner_id)',
  'SELECT "Column owner_id already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the table structure to verify
DESCRIBE guilds;
