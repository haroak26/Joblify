-- Add AI Interviewer tables
CREATE TABLE IF NOT EXISTS "interview_sessions" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "job_description" TEXT NOT NULL,
  "skills" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "custom_questions" TEXT,
  "company_type" TEXT,
  "industry" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'overall',
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "overall_feedback" TEXT,
  "overall_score" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "interview_sessions_user_id_idx" ON "interview_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "interview_sessions_status_idx" ON "interview_sessions" ("status");

CREATE TABLE IF NOT EXISTS "interview_questions" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" VARCHAR NOT NULL REFERENCES "interview_sessions"("id") ON DELETE CASCADE,
  "question_text" TEXT NOT NULL,
  "question_type" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "difficulty" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "interview_questions_session_id_idx" ON "interview_questions" ("session_id");

CREATE TABLE IF NOT EXISTS "interview_responses" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "question_id" VARCHAR NOT NULL REFERENCES "interview_questions"("id") ON DELETE CASCADE,
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "answer_text" TEXT NOT NULL,
  "feedback" TEXT,
  "score" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "interview_responses_question_id_idx" ON "interview_responses" ("question_id");
CREATE INDEX IF NOT EXISTS "interview_responses_user_id_idx" ON "interview_responses" ("user_id");

-- Add Redeemable Code System tables
CREATE TABLE IF NOT EXISTS "perks" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "perk_type" TEXT NOT NULL,
  "value" INTEGER,
  "description" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "redeemable_codes" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL UNIQUE,
  "perk_id" VARCHAR NOT NULL REFERENCES "perks"("id"),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "max_redemptions" INTEGER DEFAULT 1,
  "current_redemptions" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_by" VARCHAR
);

CREATE UNIQUE INDEX IF NOT EXISTS "redeemable_codes_code_idx" ON "redeemable_codes" ("code");

CREATE TABLE IF NOT EXISTS "user_perks" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "perk_id" VARCHAR NOT NULL REFERENCES "perks"("id"),
  "code_id" VARCHAR NOT NULL REFERENCES "redeemable_codes"("id"),
  "redeemed_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "remaining_value" INTEGER
);

CREATE INDEX IF NOT EXISTS "user_perks_user_id_idx" ON "user_perks" ("user_id");
CREATE INDEX IF NOT EXISTS "user_perks_is_active_idx" ON "user_perks" ("is_active");

-- Insert pre-defined perks
INSERT INTO "perks" ("name", "perk_type", "value", "description") VALUES
  ('Free Practice Interview', 'interview_credit', 1, 'One free AI-powered practice interview session with detailed feedback'),
  ('3 Free Practice Interviews', 'interview_credit', 3, 'Three free AI-powered practice interview sessions with detailed feedback'),
  ('5 Additional ATS Scans', 'ats_scan_credit', 5, 'Five additional ATS resume scans'),
  ('10 Additional ATS Scans', 'ats_scan_credit', 10, 'Ten additional ATS resume scans'),
  ('7 Days Pro Access', 'temp_pro_access', 7, 'Temporary Pro plan access for 7 days'),
  ('30 Days Pro Access', 'temp_pro_access', 30, 'Temporary Pro plan access for 30 days'),
  ('7 Days Ultra Access', 'temp_ultra_access', 7, 'Temporary Ultra plan access for 7 days'),
  ('30 Days Ultra Access', 'temp_ultra_access', 30, 'Temporary Ultra plan access for 30 days')
ON CONFLICT DO NOTHING;
