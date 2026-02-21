ALTER TABLE usage
ADD COLUMN IF NOT EXISTS ai_builder_actions_this_month integer NOT NULL DEFAULT 0;
