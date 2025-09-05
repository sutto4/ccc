-- Fix inconsistent feature names in guild_features table
-- Convert display names to feature keys for consistency

-- Step 1: Remove any existing duplicates first (same guild_id + feature_name)
DELETE gf1 FROM guild_features gf1
INNER JOIN guild_features gf2
WHERE gf1.id < gf2.id
  AND gf1.guild_id = gf2.guild_id
  AND gf1.feature_name = gf2.feature_name;

-- Step 2: Update each display name to feature key individually to avoid conflicts
-- FiveM QBcore Integration -> fivem_qbcore
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'fivem_qbcore', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'FiveM QBcore Integration'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'FiveM QBcore Integration';

-- FiveM ESX Integration -> fivem_esx
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'fivem_esx', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'FiveM ESX Integration'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'FiveM ESX Integration';

-- FDG Donator Sync -> fdg_donator_sync
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'fdg_donator_sync', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'FDG Donator Sync'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'FDG Donator Sync';

-- Custom Commands -> custom_commands
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'custom_commands', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Custom Commands'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Custom Commands';

-- Ban Syncing -> ban_sync
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'ban_sync', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Ban Syncing'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Ban Syncing';

-- Bot Customisation -> bot_customisation
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'bot_customisation', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Bot Customisation'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Bot Customisation';

-- Creator Alerts -> creator_alerts
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'creator_alerts', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Creator Alerts'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Creator Alerts';

-- Custom Dot Command Prefix -> custom_prefix
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'custom_prefix', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Custom Dot Command Prefix'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Custom Dot Command Prefix';

-- Custom Groups -> custom_groups
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'custom_groups', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Custom Groups'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Custom Groups';

-- Embedded Messages -> embedded_messages
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'embedded_messages', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Embedded Messages'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Embedded Messages';

-- Feedback Collection -> feedback_system
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'feedback_system', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Feedback Collection'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Feedback Collection';

-- Moderation Tools -> moderation
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'moderation', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Moderation Tools'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Moderation Tools';

-- Reaction Roles -> reaction_roles
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'reaction_roles', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Reaction Roles'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Reaction Roles';

-- User Verification System -> verification_system
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'verification_system', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'User Verification System'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'User Verification System';

-- Utilities -> utilities
INSERT INTO guild_features (guild_id, feature_name, enabled, created_at, updated_at)
SELECT guild_id, 'utilities', enabled, created_at, updated_at
FROM guild_features
WHERE feature_name = 'Utilities'
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  updated_at = VALUES(updated_at);

DELETE FROM guild_features WHERE feature_name = 'Utilities';

-- Verify the fixes
SELECT
    guild_id,
    feature_name,
    enabled,
    created_at
FROM guild_features
WHERE feature_name IN (
    'fivem_qbcore',
    'fivem_esx',
    'fdg_donator_sync',
    'custom_commands',
    'ban_sync',
    'bot_customisation',
    'creator_alerts',
    'custom_prefix',
    'custom_groups',
    'embedded_messages',
    'feedback_system',
    'moderation',
    'reaction_roles',
    'verification_system',
    'utilities'
)
ORDER BY guild_id, feature_name;
