-- Add is_primary column to server_group_members table
ALTER TABLE `server_group_members` 
ADD COLUMN `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether this server is the primary server for the group' 
AFTER `added_by`;

-- Set the first server added to each group as primary
-- Create a temporary table with the first server for each group
CREATE TEMPORARY TABLE temp_primary_servers AS
SELECT group_id, MIN(added_at) as min_added_at
FROM server_group_members
GROUP BY group_id;

-- Update the primary servers
UPDATE server_group_members sgm
JOIN temp_primary_servers tps ON sgm.group_id = tps.group_id AND sgm.added_at = tps.min_added_at
SET sgm.is_primary = 1;

-- Drop the temporary table
DROP TEMPORARY TABLE temp_primary_servers;

-- Add index for better performance
ALTER TABLE `server_group_members` 
ADD INDEX `idx_group_primary` (`group_id`, `is_primary`);
