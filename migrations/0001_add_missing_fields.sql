-- Add missing fields to profiles table
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_complete" boolean NOT NULL DEFAULT false;

-- Add missing fields to jobs table
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "relevance_score" integer NOT NULL DEFAULT 0;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "raw_data" jsonb;
-- For existing rows, set scraped_at to NULL initially, then update to NOW() for non-null rows
-- This preserves the fact that we don't know the exact scraping time for existing data
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "scraped_at" timestamp;
-- Update existing rows to have a scraped_at value (using current time as best estimate)
UPDATE "jobs" SET "scraped_at" = NOW() WHERE "scraped_at" IS NULL;
-- Now make it NOT NULL for future inserts
ALTER TABLE "jobs" ALTER COLUMN "scraped_at" SET NOT NULL;
ALTER TABLE "jobs" ALTER COLUMN "scraped_at" SET DEFAULT NOW();
