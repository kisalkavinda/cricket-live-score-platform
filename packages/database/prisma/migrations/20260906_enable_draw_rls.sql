-- ==============================================================================
-- PRODUCTION HARDENING: ROW LEVEL SECURITY (RLS) ON TOURNAMENT DRAW TABLES
-- ==============================================================================
-- 1. Enable RLS on all four TournamentDraw tables.
-- 2. Revoke all direct anonymous and authenticated PostgREST permissions.
-- 3. Grant full CRUD access exclusively to the internal scoped application role
--    (`cricket_app_role`), while preserving superuser / postgres bypass.
-- ==============================================================================

-- 1. Enable RLS on all four TournamentDraw tables
ALTER TABLE IF EXISTS "TournamentDraw" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "TournamentDrawChit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "TournamentDrawCaptainOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "TournamentDrawAudit" ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all table-level access from anon and authenticated PostgREST roles
REVOKE ALL ON TABLE "TournamentDraw" FROM anon, authenticated;
REVOKE ALL ON TABLE "TournamentDrawChit" FROM anon, authenticated;
REVOKE ALL ON TABLE "TournamentDrawCaptainOrder" FROM anon, authenticated;
REVOKE ALL ON TABLE "TournamentDrawAudit" FROM anon, authenticated;

-- 3. Ensure no public policies exist for anon/authenticated
DROP POLICY IF EXISTS "Public read access for TournamentDraw" ON "TournamentDraw";
DROP POLICY IF EXISTS "Public read access for TournamentDrawChit" ON "TournamentDrawChit";
DROP POLICY IF EXISTS "Public read access for TournamentDrawCaptainOrder" ON "TournamentDrawCaptainOrder";
DROP POLICY IF EXISTS "Public read access for TournamentDrawAudit" ON "TournamentDrawAudit";

-- 4. Grant CRUD privileges to scoped application role (`cricket_app_role`)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cricket_app_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "TournamentDraw", "TournamentDrawChit", "TournamentDrawCaptainOrder", "TournamentDrawAudit" TO cricket_app_role;
    
    -- Explicit RLS policies for cricket_app_role
    DROP POLICY IF EXISTS "App full access for TournamentDraw" ON "TournamentDraw";
    CREATE POLICY "App full access for TournamentDraw" ON "TournamentDraw" FOR ALL TO cricket_app_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "App full access for TournamentDrawChit" ON "TournamentDrawChit";
    CREATE POLICY "App full access for TournamentDrawChit" ON "TournamentDrawChit" FOR ALL TO cricket_app_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "App full access for TournamentDrawCaptainOrder" ON "TournamentDrawCaptainOrder";
    CREATE POLICY "App full access for TournamentDrawCaptainOrder" ON "TournamentDrawCaptainOrder" FOR ALL TO cricket_app_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "App full access for TournamentDrawAudit" ON "TournamentDrawAudit";
    CREATE POLICY "App full access for TournamentDrawAudit" ON "TournamentDrawAudit" FOR ALL TO cricket_app_role USING (true) WITH CHECK (true);
  END IF;
END
$$;
