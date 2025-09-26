-- Check old group system (guilds.group_id)
SELECT 'OLD SYSTEM' as system_type, g.guild_id, g.guild_name, g.group_id, sg.name as group_name 
FROM guilds g 
LEFT JOIN server_groups sg ON g.group_id = sg.id 
WHERE g.group_id IS NOT NULL;

-- Check new group system (server_group_members)
SELECT 'NEW SYSTEM' as system_type, sgm.guild_id, g.guild_name, sgm.group_id, sg.name as group_name
FROM server_group_members sgm
LEFT JOIN guilds g ON sgm.guild_id = g.guild_id
LEFT JOIN server_groups sg ON sgm.group_id = sg.id;

-- Check what's in server_groups table
SELECT 'SERVER_GROUPS' as system_type, id, name, description, owner_user_id, created_at
FROM server_groups;

