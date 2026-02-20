-- Add original import artifact metadata to resumes table
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_mime_type TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_storage_key TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_storage_url TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_page_count INTEGER;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP;

COMMENT ON COLUMN resumes.original_filename IS 'Original uploaded resume filename';
COMMENT ON COLUMN resumes.original_mime_type IS 'Original uploaded resume MIME type';
COMMENT ON COLUMN resumes.original_storage_key IS 'Durable storage key for uploaded artifact';
COMMENT ON COLUMN resumes.original_storage_url IS 'Application URL for accessing original uploaded artifact';
COMMENT ON COLUMN resumes.original_page_count IS 'Page count extracted from imported file when available';
COMMENT ON COLUMN resumes.imported_at IS 'Timestamp when resume was imported from an uploaded artifact';
