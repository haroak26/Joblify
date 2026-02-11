-- Add onboarding tracking fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
