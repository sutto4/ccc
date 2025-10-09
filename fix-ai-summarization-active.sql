-- Fix ai_summarization feature to be active
UPDATE features 
SET is_active = 1 
WHERE feature_key = 'ai_summarization';

-- Verify the fix
SELECT feature_key, feature_name, description, minimum_package, is_active 
FROM features 
WHERE feature_key = 'ai_summarization';


