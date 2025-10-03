-- Create command_mappings table
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

-- Insert default command mappings
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
('embed', 'embedded_messages', 'Send embedded messages'),

-- AI commands
('summarise', 'ai_summarization', 'Summarize messages using AI with LAST or FROM subcommands');

-- Verify the table was created
SELECT 'Command mappings table created successfully' as status;
SELECT COUNT(*) as command_count FROM command_mappings;
