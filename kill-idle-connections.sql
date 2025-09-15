-- Query to find and kill idle connections for admin_user
-- First see what connections exist
SELECT 
  ID, 
  USER, 
  HOST, 
  DB, 
  COMMAND, 
  TIME, 
  STATE,
  LEFT(INFO, 50) as QUERY_PREVIEW
FROM information_schema.PROCESSLIST 
WHERE USER = 'admin_user' 
  AND COMMAND = 'Sleep' 
  AND TIME > 60  -- Idle for more than 60 seconds
ORDER BY TIME DESC;

-- Kill connections that have been idle for more than 5 minutes (300 seconds)
-- You would run these one by one, or create a stored procedure
-- KILL CONNECTION_ID;
