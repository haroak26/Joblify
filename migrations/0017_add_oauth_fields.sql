-- Add OAuth provider fields to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS oauth_provider TEXT,
  ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT,
  ALTER COLUMN password DROP NOT NULL;

-- Add index for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider ON users(oauth_provider, oauth_provider_id);
