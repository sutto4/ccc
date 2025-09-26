-- Add icon_url column to server_groups table
ALTER TABLE `server_groups` 
ADD COLUMN `icon_url` VARCHAR(500) NULL COMMENT 'URL to the group icon image' 
AFTER `description`;

-- Update the existing groups to have null icon_url (they can be updated later)
UPDATE `server_groups` SET `icon_url` = NULL WHERE `icon_url` IS NULL;

