-- ══════════════════════════════════════════
-- ENABLE REALTIME
-- ══════════════════════════════════════════

-- Enable Supabase Realtime for the required tables
-- Without this, the browser will never receive the WebSocket events!
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
