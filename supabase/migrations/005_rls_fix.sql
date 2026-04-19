-- ══════════════════════════════════════════
-- FIX WAITING POOL RLS
-- ══════════════════════════════════════════

-- The queue page uses 'upsert' which requires UPDATE permissions. 
-- Adding this missing policy prevents the 401 Unauthorized error.
CREATE POLICY "Enable update for anonymous users" ON waiting_pool FOR UPDATE TO anon USING (true);
