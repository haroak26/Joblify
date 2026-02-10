-- Drop orphaned chat tables that are not being used in the application
-- These tables were created from shared/models/chat.ts but the routes are not registered

DROP TABLE IF EXISTS "messages";
DROP TABLE IF EXISTS "conversations";
