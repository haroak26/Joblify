-- Add mailing lists system for marketing emails
CREATE TABLE IF NOT EXISTS "mailing_lists" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL,
  "default_subscribed" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert the 3 mailing lists
INSERT INTO "mailing_lists" ("name", "description", "default_subscribed") VALUES
  ('marketing', 'Marketing emails about new features, promotions, and special offers', FALSE),
  ('newsletter', 'Monthly newsletter with job search tips, career advice, and platform updates', TRUE),
  ('announcements', 'Important announcements and platform updates', FALSE)
ON CONFLICT (name) DO NOTHING;

-- User mailing list subscriptions
CREATE TABLE IF NOT EXISTS "user_mailing_lists" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "list_id" VARCHAR NOT NULL REFERENCES "mailing_lists"("id") ON DELETE CASCADE,
  "subscribed" BOOLEAN NOT NULL DEFAULT TRUE,
  "subscribed_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "unsubscribed_at" TIMESTAMP,
  UNIQUE ("user_id", "list_id")
);

CREATE INDEX IF NOT EXISTS "user_mailing_lists_user_id_idx" ON "user_mailing_lists" ("user_id");
CREATE INDEX IF NOT EXISTS "user_mailing_lists_list_id_idx" ON "user_mailing_lists" ("list_id");
CREATE INDEX IF NOT EXISTS "user_mailing_lists_subscribed_idx" ON "user_mailing_lists" ("subscribed");

-- AI usage logs for admin dashboard analytics
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "feature_name" TEXT NOT NULL,
  "tokens_used" INTEGER,
  "success" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ai_usage_logs_user_id_idx" ON "ai_usage_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_feature_name_idx" ON "ai_usage_logs" ("feature_name");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_created_at_idx" ON "ai_usage_logs" ("created_at");

-- User activity logs for admin dashboard and security
CREATE TABLE IF NOT EXISTS "user_activity_logs" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "activity_type" TEXT NOT NULL,
  "ip_address_hash" TEXT,
  "user_agent" TEXT,
  "device_info" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "user_activity_logs_user_id_idx" ON "user_activity_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "user_activity_logs_activity_type_idx" ON "user_activity_logs" ("activity_type");
CREATE INDEX IF NOT EXISTS "user_activity_logs_created_at_idx" ON "user_activity_logs" ("created_at");

-- Add fields to users table for 2FA and admin features
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_access_blocked" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_access_blocked_at" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_access_blocked_reason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_blocked" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_blocked_at" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_blocked_reason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_ip_hash" TEXT;

-- Trusted devices for 2FA
CREATE TABLE IF NOT EXISTS "trusted_devices" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "device_fingerprint" TEXT NOT NULL,
  "device_name" TEXT,
  "user_agent" TEXT,
  "ip_address_hash" TEXT,
  "trusted_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_used_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL,
  UNIQUE ("user_id", "device_fingerprint")
);

CREATE INDEX IF NOT EXISTS "trusted_devices_user_id_idx" ON "trusted_devices" ("user_id");
CREATE INDEX IF NOT EXISTS "trusted_devices_expires_at_idx" ON "trusted_devices" ("expires_at");

-- 2FA verification codes (for email-based 2FA)
CREATE TABLE IF NOT EXISTS "verification_codes" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL,
  "code_type" TEXT NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "verification_codes_user_id_idx" ON "verification_codes" ("user_id");
CREATE INDEX IF NOT EXISTS "verification_codes_code_idx" ON "verification_codes" ("code");
CREATE INDEX IF NOT EXISTS "verification_codes_expires_at_idx" ON "verification_codes" ("expires_at");

-- System admin logs for security audit trail
CREATE TABLE IF NOT EXISTS "system_admin_logs" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_user_id" VARCHAR NOT NULL REFERENCES "users"("id"),
  "action" TEXT NOT NULL,
  "target_user_id" VARCHAR REFERENCES "users"("id") ON DELETE SET NULL,
  "details" JSONB,
  "ip_address_hash" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "system_admin_logs_admin_user_id_idx" ON "system_admin_logs" ("admin_user_id");
CREATE INDEX IF NOT EXISTS "system_admin_logs_target_user_id_idx" ON "system_admin_logs" ("target_user_id");
CREATE INDEX IF NOT EXISTS "system_admin_logs_created_at_idx" ON "system_admin_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "system_admin_logs_action_idx" ON "system_admin_logs" ("action");
