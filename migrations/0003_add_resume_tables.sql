-- Migration: Add Resume Builder Tables
-- This migration adds the necessary tables for the resume builder functionality

-- Add ai_edits_this_month column to usage table
ALTER TABLE usage ADD COLUMN IF NOT EXISTS ai_edits_this_month INTEGER DEFAULT 0 NOT NULL;

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template VARCHAR DEFAULT 'modern' NOT NULL,
  resume_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS resumes_user_id_idx ON resumes(user_id);

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id VARCHAR REFERENCES resumes(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on user_id and resume_id for faster lookups
CREATE INDEX IF NOT EXISTS chat_conversations_user_id_idx ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS chat_conversations_resume_id_idx ON chat_conversations(resume_id);

-- Create cover_letters table
CREATE TABLE IF NOT EXISTS cover_letters (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id VARCHAR REFERENCES resumes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  job_description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on user_id and resume_id for faster lookups
CREATE INDEX IF NOT EXISTS cover_letters_user_id_idx ON cover_letters(user_id);
CREATE INDEX IF NOT EXISTS cover_letters_resume_id_idx ON cover_letters(resume_id);
