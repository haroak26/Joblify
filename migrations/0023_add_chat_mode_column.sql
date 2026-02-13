-- Add mode column to chat_conversations to separate builder and enhancement chats
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS mode VARCHAR NOT NULL DEFAULT 'builder';

-- Add comment for documentation
COMMENT ON COLUMN chat_conversations.mode IS 'Chat mode: "builder" for AI Resume Builder or "enhancement" for AI Enhancement';
