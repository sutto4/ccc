-- Fix Server Groups: Create missing groups based on existing memberships
-- This script will create server groups for the orphaned memberships

-- First, let's see what groups we need to create
SELECT DISTINCT group_id, added_by FROM server_group_members WHERE group_id NOT IN (SELECT id FROM server_groups);

-- Create the missing server groups
-- Group ID 3 (most common)
INSERT IGNORE INTO server_groups (id, name, description, owner_user_id, created_at, updated_at)
VALUES (3, 'My Gaming Community', 'Collection of gaming servers', '351321199059533826', '2025-08-21 11:17:19', NOW());

-- Group ID 5
INSERT IGNORE INTO server_groups (id, name, description, owner_user_id, created_at, updated_at)
VALUES (5, 'My Business Servers', 'Professional and business servers', '351321199059533826', '2025-08-21 12:48:51', NOW());

-- Verify the groups were created
SELECT * FROM server_groups ORDER BY id;

