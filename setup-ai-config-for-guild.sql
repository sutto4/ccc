-- Setup AI configuration for a specific guild
-- Replace '1403257704222429224' with the actual guild ID

INSERT INTO guild_ai_config (
    guild_id, 
    enabled, 
    model, 
    max_tokens_per_request, 
    max_messages_per_summary,
    custom_prompt, 
    rate_limit_per_hour, 
    rate_limit_per_day
) VALUES (
    '1403257704222429224',  -- Replace with actual guild ID
    TRUE,                   -- Enable AI summarization
    'gpt-3.5-turbo',        -- Default model
    1000,                   -- Max tokens per request
    50,                     -- Max messages per summary
    NULL,                   -- No custom prompt (use default)
    10,                     -- 10 requests per hour
    100                     -- 100 requests per day
) ON DUPLICATE KEY UPDATE
    enabled = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the configuration was created
SELECT 'AI configuration created/updated' as status;
SELECT * FROM guild_ai_config WHERE guild_id = '1403257704222429224';
