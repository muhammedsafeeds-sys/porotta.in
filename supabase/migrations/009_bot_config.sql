-- ══════════════════════════════════════════
-- BOT SYSTEM CONFIG
-- ══════════════════════════════════════════

-- Create the system_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bot toggle (admin-controlled)
INSERT INTO system_config (key, value, description)
VALUES ('bot_enabled', 'false', 'Enable/disable AI chat bots that auto-join when users wait too long')
ON CONFLICT (key) DO NOTHING;

-- Reload the schema cache so PostgREST sees the new table
NOTIFY pgrst, 'reload schema';
