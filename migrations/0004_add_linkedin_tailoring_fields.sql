-- Add LinkedIn import fields to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS imported_from TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location TEXT;

-- Add tailoring fields to resumes table
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS target_job_id VARCHAR REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_tailored BOOLEAN NOT NULL DEFAULT false;

-- Add tailoring fields to cover_letters table
ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS target_job_id VARCHAR REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS is_tailored BOOLEAN NOT NULL DEFAULT false;
