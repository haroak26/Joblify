ALTER TABLE "usage"
ADD COLUMN IF NOT EXISTS "resume_reviews_this_month" integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "job_match_jobs_this_month" integer NOT NULL DEFAULT 0;
