-- ══════════════════════════════════════════
-- ATOMIC MATCHMAKING FIX
-- ══════════════════════════════════════════

-- This version prevents duplicate room creation and "ghost" connections
-- by locking both participants and checking for existing rooms first.

CREATE OR REPLACE FUNCTION attempt_match(p_session_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_room_id UUID;
  v_matched_session_id UUID;
  v_existing_room_id UUID;
  v_self_gender TEXT;
  v_desired_gender TEXT;
BEGIN
  -- 1. Check if we are already in an active room
  SELECT id INTO v_existing_room_id 
  FROM chat_rooms 
  WHERE (session_a = p_session_id OR session_b = p_session_id) 
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_room_id IS NOT NULL THEN
    -- If we matched, ensure we are NOT in the waiting pool anymore
    DELETE FROM waiting_pool WHERE session_id = p_session_id;
    RETURN v_existing_room_id;
  END IF;

  -- 2. Lock our own row in the waiting pool to prevent race conditions
  -- If we aren't in the pool, we can't match.
  SELECT self_gender, desired_gender INTO v_self_gender, v_desired_gender
  FROM waiting_pool
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 3. Find a partner and lock their row
  v_matched_session_id := (
    SELECT w.session_id
    FROM waiting_pool w
    WHERE w.session_id != p_session_id
    ORDER BY 
      -- Priority 1: Exact gender match
      CASE 
        WHEN (w.desired_gender = v_self_gender OR w.desired_gender = 'anyone') 
         AND (v_desired_gender = w.self_gender OR v_desired_gender = 'anyone') THEN 0
        ELSE 1
      END ASC,
      -- Priority 2: Wait time
      w.entered_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  );

  -- 4. If a match is found, create the room
  IF v_matched_session_id IS NOT NULL THEN
    -- Double check no room was created for the partner in the split second before locking
    SELECT id INTO v_existing_room_id 
    FROM chat_rooms 
    WHERE (session_a = v_matched_session_id OR session_b = v_matched_session_id) 
      AND status = 'active'
    LIMIT 1;

    IF v_existing_room_id IS NOT NULL THEN
       -- Partner is already busy! Release and try again later.
       RETURN NULL;
    END IF;

    -- Create room
    INSERT INTO chat_rooms (session_a, session_b)
    VALUES (p_session_id, v_matched_session_id)
    RETURNING id INTO v_new_room_id;

    -- Clean up pool
    DELETE FROM waiting_pool WHERE session_id IN (p_session_id, v_matched_session_id);

    RETURN v_new_room_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
