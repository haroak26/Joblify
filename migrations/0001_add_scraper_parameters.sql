-- Migration: Add scraper parameters to profiles table
-- Add scraper_parameters and parameters_updated_at columns to profiles table

ALTER TABLE "profiles" ADD COLUMN "scraper_parameters" jsonb;
ALTER TABLE "profiles" ADD COLUMN "parameters_updated_at" timestamp;
