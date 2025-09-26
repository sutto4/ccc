-- Check what's in the server groups tables

-- Check server_groups table
SELECT 'server_groups' as table_name, id, name, description, owner_user_id, created_at FROM server_groups;

-- Check server_group_members table  
SELECT 'server_group_members' as table_name, id, group_id, guild_id, added_at, added_by FROM server_group_members;

-- Check guilds table for reference
SELECT 'guilds' as table_name, guild_id, guild_name, owner_id FROM guilds;

