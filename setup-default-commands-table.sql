-- Create table to store default command settings for new servers
CREATE TABLE IF NOT EXISTS default_commands (
  id INT PRIMARY KEY AUTO_INCREMENT,
  command_name VARCHAR(255) NOT NULL UNIQUE,
  enabled_by_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_command_name (command_name),
  INDEX idx_enabled (enabled_by_default)
);

-- Insert default settings for all existing commands
INSERT IGNORE INTO default_commands (command_name, enabled_by_default)
SELECT command_name, TRUE FROM command_mappings;

-- Verify the table was created
SELECT 'Default commands table created successfully' as status;
SELECT COUNT(*) as command_count FROM default_commands;
