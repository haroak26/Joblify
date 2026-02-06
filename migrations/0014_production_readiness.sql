-- Migration: Production Readiness Schema Updates
-- Date: 2026-02-06

-- Add new usage tracking columns
ALTER TABLE usage ADD COLUMN IF NOT EXISTS imported_resumes_this_month INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE usage ADD COLUMN IF NOT EXISTS job_analyses_this_month INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE usage ADD COLUMN IF NOT EXISTS cover_letters_this_month INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE usage ADD COLUMN IF NOT EXISTS ats_scans_this_month INTEGER DEFAULT 0 NOT NULL;

-- Create deleted accounts tracker table for abuse prevention
CREATE TABLE IF NOT EXISTS deleted_accounts_tracker (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  deleted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS deleted_accounts_email_idx ON deleted_accounts_tracker(email);
CREATE INDEX IF NOT EXISTS deleted_accounts_expires_at_idx ON deleted_accounts_tracker(expires_at);

-- Remove tailoring-related columns from resumes table
ALTER TABLE resumes DROP COLUMN IF EXISTS target_job_id;
ALTER TABLE resumes DROP COLUMN IF EXISTS is_tailored;

-- Remove tailoring-related columns from cover_letters table
ALTER TABLE cover_letters DROP COLUMN IF EXISTS target_job_id;
ALTER TABLE cover_letters DROP COLUMN IF EXISTS is_tailored;
