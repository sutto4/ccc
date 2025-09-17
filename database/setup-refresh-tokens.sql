-- Create table for storing refresh tokens securely
CREATE TABLE IF NOT EXISTS user_refresh_tokens (
    discord_id VARCHAR(32) PRIMARY KEY,
    refresh_token_encrypted TEXT NOT NULL,
    expires_at DATETIME NULL
    -- optional: updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clean up expired tokens (run this periodically)
-- DELETE FROM user_refresh_tokens WHERE expires_at IS NOT NULL AND expires_at < NOW();
