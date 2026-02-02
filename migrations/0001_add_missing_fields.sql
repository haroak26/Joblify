-- Add missing fields to profiles table
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_complete" boolean NOT NULL DEFAULT false;

-- Add missing fields to jobs table
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "relevance_score" integer NOT NULL DEFAULT 0;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "raw_data" jsonb;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "scraped_at" timestamp NOT NULL DEFAULT NOW();
