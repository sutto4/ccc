-- Fix Orphaned Server Groups
-- This script will create server groups for any memberships that don't have corresponding groups

-- Step 1: Find all orphaned group memberships
SELECT 
    sgm.group_id,
    sgm.added_by,
    MIN(sgm.added_at) as first_added,
    COUNT(sgm.guild_id) as server_count
FROM server_group_members sgm
LEFT JOIN server_groups sg ON sgm.group_id = sg.id
WHERE sg.id IS NULL
GROUP BY sgm.group_id, sgm.added_by;

-- Step 2: Create missing server groups
INSERT INTO server_groups (id, name, description, owner_user_id, created_at, updated_at)
SELECT 
    sgm.group_id,
    CONCAT('Server Group ', sgm.group_id) as name,
    CONCAT('Auto-created group with ', COUNT(sgm.guild_id), ' servers') as description,
    sgm.added_by as owner_user_id,
    MIN(sgm.added_at) as created_at,
    NOW() as updated_at
FROM server_group_members sgm
LEFT JOIN server_groups sg ON sgm.group_id = sg.id
WHERE sg.id IS NULL
GROUP BY sgm.group_id, sgm.added_by;

-- Step 3: Verify the fix
SELECT 
    sg.id,
    sg.name,
    sg.description,
    sg.owner_user_id,
    COUNT(sgm.guild_id) as server_count
FROM server_groups sg
LEFT JOIN server_group_members sgm ON sg.id = sgm.group_id
GROUP BY sg.id, sg.name, sg.description, sg.owner_user_id
ORDER BY sg.id;

