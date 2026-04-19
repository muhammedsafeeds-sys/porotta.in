-- ══════════════════════════════════════════
-- MATCHMAKING RPC
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION attempt_match(p_session_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_room_id UUID;
  v_matched_session_id UUID;
BEGIN
  -- 1 & 2. Get preferences and find a match atomically
  v_matched_session_id := (
    SELECT w.session_id
    FROM waiting_pool w
    CROSS JOIN (
      SELECT self_gender, desired_gender 
      FROM waiting_pool 
      WHERE session_id = p_session_id
    ) m
    WHERE w.session_id != p_session_id
      AND (w.desired_gender = m.self_gender OR w.desired_gender = 'anyone')
      AND (m.desired_gender = w.self_gender OR m.desired_gender = 'anyone')
    ORDER BY w.entered_at ASC
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
