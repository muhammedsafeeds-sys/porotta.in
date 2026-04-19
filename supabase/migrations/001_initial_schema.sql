-- porotta.in Database Schema
-- Full production schema per Blueprint v2.0 §9

-- ══════════════════════════════════════════
-- Enable required extensions
-- ══════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════
-- CORE TABLES
-- ══════════════════════════════════════════

-- Anonymous sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  age_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  age_confirmed_at TIMESTAMPTZ,
  self_gender TEXT CHECK (self_gender IN ('man', 'woman', 'other')),
  desired_gender TEXT CHECK (desired_gender IN ('man', 'woman', 'anyone')),
  selected_tags TEXT[] DEFAULT '{}',
  safety_status TEXT NOT NULL DEFAULT 'clean' CHECK (safety_status IN ('clean', 'warned', 'throttled', 'banned')),
  cooldown_flags JSONB DEFAULT '{}',
  last_room_id UUID,
  queue_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  queue_eligible_reason TEXT,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_match_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_ip_hash ON sessions(ip_hash);
CREATE INDEX idx_sessions_safety ON sessions(safety_status);
CREATE INDEX idx_sessions_active ON sessions(last_active_at);

-- Waiting pool (queue)
CREATE TABLE waiting_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  self_gender TEXT NOT NULL,
  desired_gender TEXT NOT NULL,
  selected_tags TEXT[] DEFAULT '{}',
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  priority_score INT NOT NULL DEFAULT 0,
  UNIQUE(session_id)
);

CREATE INDEX idx_waiting_pool_gender ON waiting_pool(desired_gender, self_gender);
CREATE INDEX idx_waiting_pool_entered ON waiting_pool(entered_at);
CREATE INDEX idx_waiting_pool_priority ON waiting_pool(priority_score DESC, entered_at ASC);

-- Chat rooms
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_a UUID NOT NULL REFERENCES sessions(id),
  session_b UUID NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'reported', 'expired')),
  shared_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES sessions(id),
  end_reason TEXT CHECK (end_reason IN ('user_end', 'partner_end', 'report', 'timeout', 'disconnect'))
);

CREATE INDEX idx_rooms_status ON chat_rooms(status);
CREATE INDEX idx_rooms_sessions ON chat_rooms(session_a, session_b);
CREATE INDEX idx_rooms_created ON chat_rooms(created_at);

-- Messages (auto-deleted after 24h)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_session UUID NOT NULL REFERENCES sessions(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_room ON messages(room_id, sent_at);
CREATE INDEX idx_messages_expiry ON messages(sent_at);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id),
  reporter_session UUID NOT NULL REFERENCES sessions(id),
  reported_session UUID NOT NULL REFERENCES sessions(id),
  reason TEXT NOT NULL CHECK (reason IN ('harassment', 'sexual', 'hate', 'spam', 'minor', 'other')),
  evidence_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  severity_score INT DEFAULT 0,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status, created_at);
CREATE INDEX idx_reports_reported ON reports(reported_session);
CREATE INDEX idx_reports_room ON reports(room_id);

-- IP bans
CREATE TABLE ip_bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_hash TEXT NOT NULL,
  tier INT NOT NULL CHECK (tier BETWEEN 1 AND 6),
  reason TEXT NOT NULL,
  admin_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lifted_at TIMESTAMPTZ,
  lifted_by UUID
);

CREATE INDEX idx_ip_bans_hash ON ip_bans(ip_hash, expires_at);
CREATE INDEX idx_ip_bans_active ON ip_bans(ip_hash) WHERE lifted_at IS NULL;

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  category TEXT NOT NULL,
  session_id TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_type ON analytics_events(event_type, created_at);
CREATE INDEX idx_analytics_session ON analytics_events(session_id, created_at);

-- ══════════════════════════════════════════
-- ADDITIONAL TABLES
-- ══════════════════════════════════════════

-- Tag catalog
CREATE TABLE tag_catalog (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  seo_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tag usage daily aggregation
CREATE TABLE tag_usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_slug TEXT NOT NULL REFERENCES tag_catalog(slug),
  usage_date DATE NOT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  UNIQUE(tag_slug, usage_date)
);

CREATE INDEX idx_tag_usage_date ON tag_usage_daily(usage_date, usage_count DESC);

-- Match attempts (for analytics/debugging)
CREATE TABLE match_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  desired_gender TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  bucket TEXT CHECK (bucket IN ('A', 'B', 'C')),
  matched BOOLEAN NOT NULL DEFAULT FALSE,
  matched_session_id UUID REFERENCES sessions(id),
  room_id UUID REFERENCES chat_rooms(id),
  wait_duration_sec INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Room events (granular lifecycle)
CREATE TABLE room_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('join', 'message', 'typing', 'skip', 'report', 'end', 'disconnect', 'reconnect')),
  session_id UUID REFERENCES sessions(id),
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_events_room ON room_events(room_id, created_at);

-- Moderation cases
CREATE TABLE moderation_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id),
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved')),
  action_taken TEXT,
  ban_id UUID REFERENCES ip_bans(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Admin users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'moderator', 'analyst', 'support_viewer')),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Admin audit log (immutable, append-only)
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES admin_users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_id, created_at);
CREATE INDEX idx_audit_log_action ON admin_audit_log(action, created_at);

-- Revoke DELETE on audit log to enforce append-only
-- REVOKE DELETE ON admin_audit_log FROM authenticated;
-- REVOKE UPDATE ON admin_audit_log FROM authenticated;

-- Feature flags
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- System config
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- Ad impressions aggregated
CREATE TABLE ad_impressions_aggregated (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_name TEXT NOT NULL,
  impression_date DATE NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  impressions INT NOT NULL DEFAULT 0,
  fills INT NOT NULL DEFAULT 0,
  viewable INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  revenue_cents INT NOT NULL DEFAULT 0,
  UNIQUE(slot_name, impression_date, device_type)
);

CREATE INDEX idx_ad_impressions_date ON ad_impressions_aggregated(impression_date);

-- ══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Room isolation: users can only read their own room's messages
-- (Policies would reference auth.uid() in production)

-- ══════════════════════════════════════════
-- MESSAGE EXPIRY FUNCTION
-- ══════════════════════════════════════════

-- Delete messages older than 24h, but check for pending moderation first
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages
  WHERE sent_at < NOW() - INTERVAL '24 hours'
  AND room_id NOT IN (
    SELECT DISTINCT room_id FROM reports
    WHERE status IN ('pending', 'reviewed')
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule: pg_cron or Supabase scheduled function
-- SELECT cron.schedule('delete-expired-messages', '*/15 * * * *', 'SELECT delete_expired_messages()');

-- ══════════════════════════════════════════
-- SEED: Default feature flags and config
-- ══════════════════════════════════════════

INSERT INTO feature_flags (key, label, enabled, description) VALUES
  ('tag_relaxation_enabled', 'Tag relaxation at 30s', TRUE, 'Show option to broaden match after 30s'),
  ('starter_prompts_enabled', 'Show starter prompts in room', TRUE, 'Display conversation starters before first message'),
  ('url_detection_disabled', 'Disable URL rendering in messages', TRUE, 'Render URLs as inert text'),
  ('ad_below_composer', 'Below-composer ad slot', FALSE, 'Enable the below-composer rectangle ad'),
  ('reconnect_enabled', 'Room reconnect recovery', TRUE, '30-second reconnect window on disconnect'),
  ('skip_cooldown_enabled', 'Skip cooldown enforcement', TRUE, 'Server-side skip cooldown');

INSERT INTO system_config (key, value, description) VALUES
  ('queue_timeout_sec', '300', 'Max seconds in queue before timeout'),
  ('skip_cooldown_sec', '10', 'Cooldown after skipping a chat'),
  ('message_rate_limit_per_min', '20', 'Max messages per minute per user'),
  ('max_message_length', '500', 'Max character length per message'),
  ('reconnect_window_sec', '30', 'Seconds to attempt reconnect'),
  ('repeat_pairing_cooldown_min', '15', 'Minutes before same pair can match again');
