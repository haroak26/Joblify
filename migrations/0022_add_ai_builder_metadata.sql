-- Add AI Builder metadata fields to resumes table
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ai_builder_components JSONB;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ai_builder_completed BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN resumes.ai_builder_components IS 'Array of component IDs selected when starting AI Builder (e.g., ["experience", "education", "skills"])';
COMMENT ON COLUMN resumes.ai_builder_completed IS 'Whether the AI Builder session was fully completed';
