-- Check the actual schema of command_mappings table
DESCRIBE command_mappings;

-- Check if the table exists and what data types are used
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  CHARACTER_MAXIMUM_LENGTH,
  IS_NULLABLE,
  COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'command_mappings' 
AND TABLE_SCHEMA = DATABASE();
