-- Sticky Messages Feature Database Setup
-- This table stores sticky messages for each guild/channel combination

CREATE TABLE IF NOT EXISTS sticky_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_by VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_guild_channel (guild_id, channel_id),
  INDEX idx_guild_id (guild_id),
  INDEX idx_channel_id (channel_id)
);

-- Add sticky messages feature to server_features table
INSERT IGNORE INTO server_features (guild_id, feature_name, enabled, created_at) 
SELECT 
  g.guild_id, 
  'sticky_messages', 
  1, 
  NOW() 
FROM guilds g 
WHERE NOT EXISTS (
  SELECT 1 FROM server_features sf 
  WHERE sf.guild_id = g.guild_id 
  AND sf.feature_name = 'sticky_messages'
);
