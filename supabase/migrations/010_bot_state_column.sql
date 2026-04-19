-- ══════════════════════════════════════════
-- BOT STATE COLUMN
-- ══════════════════════════════════════════

-- Add bot_state column to sessions to track AI behavior without breaking existing schema
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS bot_state JSONB DEFAULT '{}';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
