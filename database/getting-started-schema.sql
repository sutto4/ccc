-- Getting Started Schema
-- Single table approach for getting started checklist

CREATE TABLE IF NOT EXISTS getting_started (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP NULL,
  completion_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_guild (user_id, guild_id),
  INDEX idx_guild (guild_id),
  INDEX idx_user (user_id)
);