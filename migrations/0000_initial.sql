CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" text NOT NULL UNIQUE,
  "email" text NOT NULL UNIQUE,
  "password" text NOT NULL,
  "email_verified" boolean NOT NULL DEFAULT false,
  "verification_token" text,
  "password_reset_token" text,
  "password_reset_expires_at" timestamp
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "plan" text NOT NULL DEFAULT 'free',
  "status" text NOT NULL DEFAULT 'active',
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "current_period_end" timestamp
);

CREATE TABLE IF NOT EXISTS "usage" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "jobs_scraped_this_month" integer NOT NULL DEFAULT 0,
  "month_reset_date" timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "intro" text NOT NULL DEFAULT '',
  "skills" jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS "jobs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "source" text NOT NULL,
  "source_url" text NOT NULL,
  "author" text NOT NULL,
  "author_handle" text,
  "posted_at" text NOT NULL,
  "matched_skills" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "budget" text,
  "is_remote" boolean NOT NULL DEFAULT true,
  "saved" boolean NOT NULL DEFAULT false,
  "applied" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "schedules" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "frequency" text NOT NULL DEFAULT 'daily',
  "time" text NOT NULL DEFAULT '09:00',
  "days" jsonb DEFAULT '[]'::jsonb,
  "platforms" jsonb NOT NULL DEFAULT '["reddit","x","facebook"]'::jsonb,
  "enabled" boolean NOT NULL DEFAULT true,
  "last_run" timestamp,
  "next_run" timestamp
);

CREATE TABLE IF NOT EXISTS "seen_jobs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "source_url" text NOT NULL,
  "seen_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "seen_jobs_user_source_idx" ON "seen_jobs" ("user_id", "source_url");

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY,
  "conversation_id" integer NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
