-- Setup missing tables for admin management
-- Run this script to create the missing tables needed for the admin management page

-- Create command_mappings table if it doesn't exist
CREATE TABLE IF NOT EXISTS command_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  command_name VARCHAR(50) NOT NULL UNIQUE,
  feature_key VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_command_name (command_name),
  INDEX idx_feature_key (feature_key),
  FOREIGN KEY (feature_key) REFERENCES features(feature_key) ON DELETE CASCADE
);

-- Create guild_commands table if it doesn't exist
CREATE TABLE IF NOT EXISTS guild_commands (
  id INT PRIMARY KEY AUTO_INCREMENT,
  guild_id VARCHAR(255) NOT NULL,
  command_name VARCHAR(50) NOT NULL,
  feature_key VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_guild_command (guild_id, command_name),
  INDEX idx_guild_id (guild_id),
  INDEX idx_command_name (command_name),
  INDEX idx_feature_key (feature_key),
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (command_name) REFERENCES command_mappings(command_name) ON DELETE CASCADE,
  FOREIGN KEY (feature_key) REFERENCES features(feature_key) ON DELETE CASCADE
);

-- Insert default command mappings if they don't exist
INSERT IGNORE INTO command_mappings (command_name, feature_key, description) VALUES
-- Moderation commands
('warn', 'moderation', 'Warn a user for breaking rules'),
('kick', 'moderation', 'Kick a user from the server'),
('ban', 'moderation', 'Ban a user from the server'),
('mute', 'moderation', 'Mute a user in the server'),
('unmute', 'moderation', 'Unmute a user in the server'),
('role', 'moderation', 'Manage user roles'),
('setmodlog', 'moderation', 'Set moderation log channel'),
('sticky', 'moderation', 'Create a sticky message in this channel'),
('unsticky', 'moderation', 'Remove the sticky message from this channel'),
('prune', 'moderation', 'Delete messages from the channel with various options'),

-- Utility commands
('custom', 'custom_commands', 'Execute custom commands'),
('sendverify', 'verification_system', 'Send verification message'),
('setverifylog', 'verification_system', 'Set verification log channel'),
('feedback', 'feedback_system', 'Submit feedback'),
('embed', 'embedded_messages', 'Send embedded messages');

-- Create sticky_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS sticky_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  guild_id VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  message_content TEXT NOT NULL,
  message_id VARCHAR(255),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_guild_channel (guild_id, channel_id),
  INDEX idx_guild_id (guild_id),
  INDEX idx_channel_id (channel_id),
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Verify tables were created
SELECT 'Tables created successfully' as status;
SELECT COUNT(*) as command_mappings_count FROM command_mappings;
SELECT COUNT(*) as guild_commands_count FROM guild_commands;
SELECT COUNT(*) as sticky_messages_count FROM sticky_messages;
