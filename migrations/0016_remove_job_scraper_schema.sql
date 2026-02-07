-- ============================================
-- Migration: Remove Job Scraper Schema
-- Description: Remove all job scraping related tables and columns
-- This migration removes:
-- - jobs table (job scraping/tracking)
-- - job_applications table
-- - jobs_scraped_this_month column from usage table
-- ============================================

-- Drop job_applications table first (has foreign key to jobs)
DROP TABLE IF EXISTS job_applications CASCADE;

-- Drop jobs table
DROP TABLE IF EXISTS jobs CASCADE;

-- Remove jobs_scraped_this_month column from usage table
ALTER TABLE usage DROP COLUMN IF EXISTS jobs_scraped_this_month;

-- Note: This migration is safe because:
-- 1. Job scraping functionality was already removed in previous PRs
-- 2. No active job scraping is happening
-- 3. The application has been transformed to an AI resume builder
