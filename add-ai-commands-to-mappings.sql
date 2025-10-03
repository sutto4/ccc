-- Add AI commands to command_mappings table
-- Run this if the command_mappings table already exists

INSERT IGNORE INTO command_mappings (command_name, feature_key, description) VALUES
('summarise', 'ai_summarization', 'Summarize messages using AI with LAST or FROM subcommands');

-- Verify the commands were added
SELECT 'AI commands added to command mappings' as status;
SELECT command_name, feature_key, description FROM command_mappings WHERE feature_key = 'ai_summarization';
