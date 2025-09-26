-- Check if role sync tables exist
SHOW TABLES LIKE 'role_mappings';
SHOW TABLES LIKE 'role_mapping_targets';
SHOW TABLES LIKE 'server_roles_cache';
SHOW TABLES LIKE 'role_sync_logs';

-- If any are missing, run the role-sync-schema.sql script

