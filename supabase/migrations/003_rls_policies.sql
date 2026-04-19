-- ══════════════════════════════════════════
-- RLS POLICIES & PERMISSIONS
-- ══════════════════════════════════════════

-- Ensure anon role can execute the match function
GRANT EXECUTE ON FUNCTION attempt_match(UUID) TO anon;

-- Sessions
CREATE POLICY "Enable insert for anonymous users" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Enable select for anonymous users" ON sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Enable update for anonymous users" ON sessions FOR UPDATE TO anon USING (true);

-- Waiting pool
ALTER TABLE waiting_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable insert for anonymous users" ON waiting_pool FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Enable select for anonymous users" ON waiting_pool FOR SELECT TO anon USING (true);
CREATE POLICY "Enable delete for anonymous users" ON waiting_pool FOR DELETE TO anon USING (true);

-- Chat rooms
CREATE POLICY "Enable insert for anonymous users" ON chat_rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Enable select for anonymous users" ON chat_rooms FOR SELECT TO anon USING (true);
CREATE POLICY "Enable update for anonymous users" ON chat_rooms FOR UPDATE TO anon USING (true);

-- Messages
CREATE POLICY "Enable insert for anonymous users" ON messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Enable select for anonymous users" ON messages FOR SELECT TO anon USING (true);

-- Reports
CREATE POLICY "Enable insert for anonymous users" ON reports FOR INSERT TO anon WITH CHECK (true);

-- Force Supabase PostgREST to reload the schema cache so the new function is visible
NOTIFY pgrst, 'reload schema';
