-- Create table for tracking feature usage
CREATE TABLE IF NOT EXISTS "user_feature_usage" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "feature_name" text NOT NULL,
  "first_used_at" timestamp DEFAULT NOW() NOT NULL,
  "last_used_at" timestamp DEFAULT NOW() NOT NULL,
  "usage_count" integer DEFAULT 1 NOT NULL
);

-- Create table for scheduled emails
CREATE TABLE IF NOT EXISTS "scheduled_emails" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email_type" text NOT NULL,
  "feature_name" text,
  "scheduled_for" timestamp NOT NULL,
  "sent_at" timestamp,
  "status" text DEFAULT 'pending' NOT NULL,
  "error" text,
  "created_at" timestamp DEFAULT NOW() NOT NULL
);

-- Create indexes for user_feature_usage
CREATE INDEX IF NOT EXISTS "user_feature_usage_user_id_idx" ON "user_feature_usage" ("user_id");
CREATE INDEX IF NOT EXISTS "user_feature_usage_feature_name_idx" ON "user_feature_usage" ("feature_name");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_feature" ON "user_feature_usage" ("user_id", "feature_name");

-- Create indexes for scheduled_emails
CREATE INDEX IF NOT EXISTS "scheduled_emails_user_id_idx" ON "scheduled_emails" ("user_id");
CREATE INDEX IF NOT EXISTS "scheduled_emails_status_idx" ON "scheduled_emails" ("status");
CREATE INDEX IF NOT EXISTS "scheduled_emails_scheduled_for_idx" ON "scheduled_emails" ("scheduled_for");
