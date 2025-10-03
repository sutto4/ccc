-- Migrate existing AI features to have proper guild_ai_config entries
-- This script will create AI configurations for guilds that have the feature enabled
-- but don't have the corresponding guild_ai_config entry

INSERT INTO guild_ai_config (
    guild_id, 
    enabled, 
    model, 
    max_tokens_per_request, 
    max_messages_per_summary,
    custom_prompt, 
    rate_limit_per_hour, 
    rate_limit_per_day
)
SELECT 
    gf.guild_id,
    gf.enabled,
    'gpt-3.5-turbo' as model,
    1000 as max_tokens_per_request,
    50 as max_messages_per_summary,
    NULL as custom_prompt,
    10 as rate_limit_per_hour,
    100 as rate_limit_per_day
FROM guild_features gf
LEFT JOIN guild_ai_config gac ON gf.guild_id = gac.guild_id
WHERE gf.feature_key = 'ai_summarization' 
  AND gf.enabled = 1
  AND gac.guild_id IS NULL;

-- Verify the migration
SELECT 'Migration completed' as status;
SELECT 
    gf.guild_id,
    gf.enabled as feature_enabled,
    gac.enabled as config_enabled,
    gac.model
FROM guild_features gf
LEFT JOIN guild_ai_config gac ON gf.guild_id = gac.guild_id
WHERE gf.feature_key = 'ai_summarization';
