-- Custom Commands Database Schema
-- This file contains the SQL to create the necessary tables for the custom commands system

-- Table for storing custom commands
CREATE TABLE IF NOT EXISTS custom_commands (
    id VARCHAR(255) PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    aliases JSON, -- Array of alias strings
    prefix VARCHAR(10) NOT NULL DEFAULT '!',
    description TEXT,
    response_type ENUM('message', 'embed', 'dm') NOT NULL DEFAULT 'message',
    
    -- Response content (varies by type)
    message_content TEXT, -- For regular messages
    embed_data JSON, -- For embed messages (stores the full embed structure)
    
    -- Restrictions
    channels JSON, -- Array of channel IDs or 'all'
    allowed_roles JSON, -- Array of role IDs (empty = all roles)
    
    -- Interactive options
    interactive_options JSON, -- {buttons: boolean, dropdowns: boolean, modals: boolean}
    
    -- Status and metadata
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    
    -- Indexes for performance
    INDEX idx_guild_id (guild_id),
    INDEX idx_name (name),
    INDEX idx_enabled (enabled),
    INDEX idx_created_by (created_by),
    
    -- Foreign key constraints
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Table for storing command usage statistics (optional)
CREATE TABLE IF NOT EXISTS command_usage_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    command_id VARCHAR(255) NOT NULL,
    guild_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_command_id (command_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_user_id (user_id),
    INDEX idx_used_at (used_at),
    
    -- Foreign key constraints
    FOREIGN KEY (command_id) REFERENCES custom_commands(id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Table for storing interactive components (buttons, dropdowns, modals)
CREATE TABLE IF NOT EXISTS command_interactive_components (
    id VARCHAR(255) PRIMARY KEY,
    command_id VARCHAR(255) NOT NULL,
    component_type ENUM('button', 'dropdown', 'modal') NOT NULL,
    component_data JSON NOT NULL, -- Stores the component configuration
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_command_id (command_id),
    INDEX idx_component_type (component_type),
    INDEX idx_order_index (order_index),
    
    -- Foreign key constraints
    FOREIGN KEY (command_id) REFERENCES custom_commands(id) ON DELETE CASCADE
);

-- Insert some sample data for testing
INSERT INTO custom_commands (
    id, 
    guild_id, 
    name, 
    aliases, 
    prefix, 
    description, 
    response_type, 
    message_content, 
    channels, 
    allowed_roles, 
    interactive_options, 
    enabled, 
    created_by
) VALUES (
    'sample-command-1',
    'your-guild-id-here', -- Replace with actual guild ID
    'welcome',
    '["w", "hi", "hello"]',
    '!',
    'Welcome new members to the server',
    'embed',
    NULL,
    'all',
    '[]',
    '{"buttons": false, "dropdowns": false, "modals": false}',
    TRUE,
    'sample-user-id'
);

-- Note: Replace 'your-guild-id-here' with an actual guild ID from your guilds table
-- before running this insert statement
