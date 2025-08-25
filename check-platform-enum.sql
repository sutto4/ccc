-- Check the current platform ENUM values in creator_alert_rules table
SHOW COLUMNS FROM creator_alert_rules LIKE 'platform';

-- Also check if there are any existing rules
SELECT id, platform, creator, enabled FROM creator_alert_rules LIMIT 5;
