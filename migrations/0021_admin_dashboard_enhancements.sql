-- Add admin role and enhanced blocking fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_access_blocked_by" VARCHAR REFERENCES "users"("id");
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_blocked_by" VARCHAR REFERENCES "users"("id");

-- Update existing user_perks table to support admin awards
ALTER TABLE "user_perks" ALTER COLUMN "code_id" DROP NOT NULL;
ALTER TABLE "user_perks" ADD COLUMN IF NOT EXISTS "awarded_by" VARCHAR REFERENCES "users"("id");
ALTER TABLE "user_perks" ADD COLUMN IF NOT EXISTS "awarded_at" TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE "user_perks" RENAME COLUMN "redeemed_at" TO "temp_redeemed_at";
ALTER TABLE "user_perks" ADD COLUMN IF NOT EXISTS "redeemed_at" TIMESTAMP;
UPDATE "user_perks" SET "redeemed_at" = "temp_redeemed_at" WHERE "temp_redeemed_at" IS NOT NULL;
ALTER TABLE "user_perks" DROP COLUMN "temp_redeemed_at";
ALTER TABLE "user_perks" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';

-- Update existing records to have 'redeemed' status if they have a redeemed_at timestamp
UPDATE "user_perks" SET "status" = 'redeemed' WHERE "redeemed_at" IS NOT NULL;

-- Add index for status column
CREATE INDEX IF NOT EXISTS "user_perks_status_idx" ON "user_perks" ("status");

-- Insert 10 pre-defined perks
INSERT INTO "perks" ("name", "perk_type", "value", "description") VALUES
  ('Free Interview Practice - 5 Questions', 'interview_credit', 5, 'Practice answering 5 interview questions with AI feedback to improve your interview skills.'),
  ('Free ATS Resume Review', 'ats_scan_credit', 1, 'Get your resume analyzed by our ATS scanner to see how it performs with applicant tracking systems.'),
  ('1 Week Pro Access', 'temp_pro_access', 7, 'Unlock Pro features for 7 days including unlimited AI edits and advanced resume templates.'),
  ('1 Month Pro Access', 'temp_pro_access', 30, 'Get full Pro access for 1 month with all premium features unlocked.'),
  ('3 Months Pro Access', 'temp_pro_access', 90, 'Enjoy 3 months of Pro access to supercharge your job search with all premium features.'),
  ('Resume AI Enhancement Credits', 'ai_enhancement_credit', 10, 'Get 10 AI enhancement credits to improve your resume with intelligent suggestions.'),
  ('Cover Letter Generation Credits', 'cover_letter_credit', 5, 'Generate 5 tailored cover letters for different job applications using AI.'),
  ('LinkedIn Profile Optimization', 'linkedin_optimization', 1, 'Get AI-powered suggestions to optimize your LinkedIn profile for better visibility.'),
  ('Job Application Analysis Credits', 'job_analysis_credit', 10, 'Analyze 10 job postings to see how well your resume matches and get improvement tips.'),
  ('1 Month Ultra Access', 'temp_ultra_access', 30, 'Experience our highest tier with Ultra access for 1 month including all features and priority support.')
ON CONFLICT DO NOTHING;
