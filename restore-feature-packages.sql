-- Restore correct minimum_package values for features
-- This fixes the issue where the defaults API was incorrectly modifying the features table

-- First, reset all to premium (as the broken API did the opposite)
UPDATE features SET minimum_package = 'premium';

-- Then set the correct free features based on the original schema
UPDATE features SET minimum_package = 'free' WHERE feature_key IN (
    'verification_system',
    'feedback_system', 
    'moderation',
    'reaction_roles',
    'custom_commands',
    'embedded_messages'
);

-- Premium features should remain premium (these are the correct premium features)
UPDATE features SET minimum_package = 'premium' WHERE feature_key IN (
    'fdg_donator_sync',
    'custom_prefix',
    'fivem_esx',
    'fivem_qbcore', 
    'creator_alerts',
    'bot_customisation',
    'custom_groups',
    'premium_members'
);

-- Verify the changes
SELECT feature_key, feature_name, minimum_package FROM features ORDER BY minimum_package, feature_name;
