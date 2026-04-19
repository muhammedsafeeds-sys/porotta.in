-- ══════════════════════════════════════════════════════
-- POROTTA.IN — COMPLETE DATABASE RESET
-- ══════════════════════════════════════════════════════
-- Run this ONCE in Supabase SQL Editor to start fresh.
-- It drops all old tables/functions and recreates everything.
-- ══════════════════════════════════════════════════════

-- ── STEP 0: DROP EVERYTHING ──
DROP FUNCTION IF EXISTS attempt_match(UUID) CASCADE;
DROP FUNCTION IF EXISTS delete_expired_messages() CASCADE;

DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS moderation_cases CASCADE;
DROP TABLE IF EXISTS ip_bans CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS waiting_pool CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS match_attempts CASCADE;
DROP TABLE IF EXISTS room_events CASCADE;
DROP TABLE IF EXISTS tag_usage_daily CASCADE;
DROP TABLE IF EXISTS tag_catalog CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS ad_impressions_aggregated CASCADE;

-- ── STEP 1: EXTENSIONS ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── STEP 2: CORE TABLES ──

-- Sessions (anonymous users)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  self_gender TEXT CHECK (self_gender IN ('man', 'woman', 'other')),
  desired_gender TEXT CHECK (desired_gender IN ('man', 'woman', 'anyone')),
  selected_tags TEXT[] DEFAULT '{}',
  nickname TEXT,
  ip_hash TEXT NOT NULL DEFAULT 'anon',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Waiting pool (matchmaking queue)
CREATE TABLE waiting_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  self_gender TEXT NOT NULL,
  desired_gender TEXT NOT NULL,
  selected_tags TEXT[] DEFAULT '{}',
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id)
);

CREATE INDEX idx_waiting_pool_gender ON waiting_pool(desired_gender, self_gender);
CREATE INDEX idx_waiting_pool_entered ON waiting_pool(entered_at);

-- Chat rooms
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_a UUID NOT NULL REFERENCES sessions(id),
  session_b UUID NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'reported')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES sessions(id),
  end_reason TEXT CHECK (end_reason IN ('user_end', 'report', 'disconnect', 'report_after_end')),
  feedback_a TEXT,
  feedback_b TEXT
);

CREATE INDEX idx_rooms_status ON chat_rooms(status);
CREATE INDEX idx_rooms_sessions ON chat_rooms(session_a, session_b);
CREATE INDEX idx_rooms_created ON chat_rooms(created_at);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_session UUID NOT NULL REFERENCES sessions(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_room ON messages(room_id, sent_at);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id),
  reporter_session UUID NOT NULL REFERENCES sessions(id),
  reported_session UUID NOT NULL REFERENCES sessions(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  severity_score INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status, created_at);

-- ── STEP 3: RLS — ENABLE + OPEN POLICIES FOR ANON ──
-- Since we use the anon key and have no auth, we must allow all operations.

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Sessions: full access
CREATE POLICY "sessions_insert" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sessions_select" ON sessions FOR SELECT TO anon USING (true);
CREATE POLICY "sessions_update" ON sessions FOR UPDATE TO anon USING (true);

-- Waiting pool: full access
CREATE POLICY "pool_insert" ON waiting_pool FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "pool_select" ON waiting_pool FOR SELECT TO anon USING (true);
CREATE POLICY "pool_update" ON waiting_pool FOR UPDATE TO anon USING (true);
CREATE POLICY "pool_delete" ON waiting_pool FOR DELETE TO anon USING (true);

-- Chat rooms: full access
CREATE POLICY "rooms_insert" ON chat_rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "rooms_select" ON chat_rooms FOR SELECT TO anon USING (true);
CREATE POLICY "rooms_update" ON chat_rooms FOR UPDATE TO anon USING (true);

-- Messages: insert + read
CREATE POLICY "messages_insert" ON messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "messages_select" ON messages FOR SELECT TO anon USING (true);

-- Reports: insert + read
CREATE POLICY "reports_insert" ON reports FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "reports_select" ON reports FOR SELECT TO anon USING (true);
CREATE POLICY "reports_update" ON reports FOR UPDATE TO anon USING (true);

-- ── STEP 4: MATCHMAKING FUNCTION ──

CREATE OR REPLACE FUNCTION attempt_match(p_session_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_room_id UUID;
  v_matched_session_id UUID;
  v_existing_room_id UUID;
  v_self_gender TEXT;
  v_desired_gender TEXT;
BEGIN
  -- 1. Check if caller is already in an active room
  SELECT id INTO v_existing_room_id 
  FROM chat_rooms 
  WHERE (session_a = p_session_id OR session_b = p_session_id) 
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_room_id IS NOT NULL THEN
    DELETE FROM waiting_pool WHERE session_id = p_session_id;
    RETURN v_existing_room_id;
  END IF;

  -- 2. Lock our own row
  SELECT self_gender, desired_gender INTO v_self_gender, v_desired_gender
  FROM waiting_pool
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 3. Find best match and lock their row (SKIP LOCKED prevents race conditions)
  v_matched_session_id := (
    SELECT w.session_id
    FROM waiting_pool w
    WHERE w.session_id != p_session_id
    ORDER BY 
      CASE 
        WHEN (w.desired_gender = v_self_gender OR w.desired_gender = 'anyone') 
         AND (v_desired_gender = w.self_gender OR v_desired_gender = 'anyone') THEN 0
        ELSE 1
      END ASC,
      w.entered_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  );

  IF v_matched_session_id IS NOT NULL THEN
    -- 4. Double check partner isn't already in a room
    SELECT id INTO v_existing_room_id 
    FROM chat_rooms 
    WHERE (session_a = v_matched_session_id OR session_b = v_matched_session_id) 
      AND status = 'active'
    LIMIT 1;

    IF v_existing_room_id IS NOT NULL THEN
      RETURN NULL;
    END IF;

    -- 5. Create room
    INSERT INTO chat_rooms (session_a, session_b)
    VALUES (p_session_id, v_matched_session_id)
    RETURNING id INTO v_new_room_id;

    -- 6. Remove both from pool
    DELETE FROM waiting_pool WHERE session_id IN (p_session_id, v_matched_session_id);

    RETURN v_new_room_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant execution to anon role
GRANT EXECUTE ON FUNCTION attempt_match(UUID) TO anon;

-- ── STEP 5: ENABLE REALTIME ──
-- These tables need realtime for the chat to work

ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ── STEP 6: RELOAD SCHEMA CACHE ──
NOTIFY pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════
-- DONE. Your database is ready.
-- ══════════════════════════════════════════════════════
