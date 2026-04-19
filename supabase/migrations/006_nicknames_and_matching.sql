-- ══════════════════════════════════════════
-- ADD NICKNAMES & RELAXED MATCHING
-- ══════════════════════════════════════════

-- 1. Add nickname column to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 2. Update the attempt_match RPC to fallback to ANY online user if gender preference isn't met
CREATE OR REPLACE FUNCTION attempt_match(p_session_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_room_id UUID;
  v_matched_session_id UUID;
BEGIN
  -- Find a match atomically
  v_matched_session_id := (
    SELECT w.session_id
    FROM waiting_pool w
    CROSS JOIN (
      SELECT self_gender, desired_gender 
      FROM waiting_pool 
      WHERE session_id = p_session_id
    ) m
    WHERE w.session_id != p_session_id
    ORDER BY 
      -- Priority 1: Exact gender match (0 if true, 1 if false)
      CASE 
        WHEN (w.desired_gender = m.self_gender OR w.desired_gender = 'anyone') 
         AND (m.desired_gender = w.self_gender OR m.desired_gender = 'anyone') THEN 0
        ELSE 1
      END ASC,
      -- Priority 2: Wait time (longest waiting first)
      w.entered_at ASC
    LIMIT 1
    FOR UPDATE OF w SKIP LOCKED
  );

  -- 3. If a match is found, create room and remove from pool
  IF v_matched_session_id IS NOT NULL THEN
    INSERT INTO chat_rooms (session_a, session_b)
    VALUES (p_session_id, v_matched_session_id)
    RETURNING id INTO v_new_room_id;

    DELETE FROM waiting_pool WHERE session_id IN (p_session_id, v_matched_session_id);

    RETURN v_new_room_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
