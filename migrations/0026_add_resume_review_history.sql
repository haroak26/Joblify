CREATE TABLE IF NOT EXISTS "resume_review_history" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "resume_id" varchar REFERENCES "resumes"("id") ON DELETE set null,
  "ideal_job" text NOT NULL,
  "concerns" text,
  "review_result" jsonb NOT NULL,
  "created_at" timestamp DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "resume_review_history_user_id_idx" ON "resume_review_history" ("user_id");
CREATE INDEX IF NOT EXISTS "resume_review_history_resume_id_idx" ON "resume_review_history" ("resume_id");
CREATE INDEX IF NOT EXISTS "resume_review_history_created_at_idx" ON "resume_review_history" ("created_at");
