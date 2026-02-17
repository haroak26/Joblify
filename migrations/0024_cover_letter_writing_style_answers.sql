ALTER TABLE "cover_letters"
ADD COLUMN IF NOT EXISTS "writing_style_answers" jsonb NOT NULL DEFAULT '[]'::jsonb;
