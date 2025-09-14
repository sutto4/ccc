-- Migration script to update database schema from feature_name to feature_key
-- Run this script to update your existing database to the new schema

-- Step 1: Add new columns to features table
ALTER TABLE features 
ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST,
ADD COLUMN feature_key VARCHAR(50) NOT NULL UNIQUE AFTER id;

-- Step 2: Populate feature_key with existing feature_name values
UPDATE features SET feature_key = feature_name;

-- Step 3: Add new columns to guild_features table
ALTER TABLE guild_features 
ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST,
ADD COLUMN feature_key VARCHAR(50) NOT NULL AFTER id;

-- Step 4: Populate feature_key in guild_features with corresponding feature_key from features
UPDATE guild_features gf 
JOIN features f ON gf.feature_name = f.feature_name 
SET gf.feature_key = f.feature_key;

-- Step 5: Add new columns to command_mappings table
ALTER TABLE command_mappings 
ADD COLUMN feature_key VARCHAR(50) NOT NULL AFTER command_name;

-- Step 6: Populate feature_key in command_mappings with corresponding feature_key from features
UPDATE command_mappings cm 
JOIN features f ON cm.feature_name = f.feature_name 
SET cm.feature_key = f.feature_key;

-- Step 7: Add feature_key to guild_commands table
ALTER TABLE guild_commands 
ADD COLUMN feature_key VARCHAR(50) NOT NULL AFTER command_name;

-- Step 8: Populate feature_key in guild_commands with corresponding feature_key from command_mappings
UPDATE guild_commands gc 
JOIN command_mappings cm ON gc.command_name = cm.command_name 
SET gc.feature_key = cm.feature_key;

-- Step 9: Add unique constraint to guild_features
ALTER TABLE guild_features 
ADD UNIQUE KEY unique_guild_feature (guild_id, feature_key);

-- Step 10: Add indexes
ALTER TABLE features ADD INDEX idx_feature_key (feature_key);
ALTER TABLE guild_features ADD INDEX idx_feature_key (feature_key);
ALTER TABLE command_mappings ADD INDEX idx_feature_key (feature_key);
ALTER TABLE guild_commands ADD INDEX idx_feature_key (feature_key);

-- Step 11: Remove old columns (optional - comment out if you want to keep them for backup)
-- ALTER TABLE features DROP COLUMN feature_name;
-- ALTER TABLE guild_features DROP COLUMN feature_name;
-- ALTER TABLE command_mappings DROP COLUMN feature_name;

-- Verify the migration
SELECT 'Migration completed successfully' as status;
SELECT COUNT(*) as features_count FROM features;
SELECT COUNT(*) as guild_features_count FROM guild_features;
SELECT COUNT(*) as command_mappings_count FROM command_mappings;
SELECT COUNT(*) as guild_commands_count FROM guild_commands;

