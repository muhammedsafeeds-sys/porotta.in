-- ══════════════════════════════════════════
-- FIX: Allow system_config access for bot APIs
-- ══════════════════════════════════════════

-- Disable RLS on system_config so all API routes can read/write it
-- This table only stores non-sensitive config flags like bot_enabled
ALTER TABLE IF EXISTS system_config DISABLE ROW LEVEL SECURITY;

-- Re-insert default value if missing
INSERT INTO system_config (key, value, description)
VALUES ('bot_enabled', 'false', 'Enable/disable AI chat bots')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
