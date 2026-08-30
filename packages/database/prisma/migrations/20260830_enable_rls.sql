-- ==============================================================================
-- PRODUCTION HARDENING: ROW LEVEL SECURITY (RLS) POLICIES & SCOPED APP ROLE
-- ==============================================================================
-- 1. Blanket RLS Enforcement: Enable RLS across ALL tables in public schema
--    including "_prisma_migrations", sensitive tables, and operational tables.
--
-- 2. Sensitive Tables & Internal Tables: DENY all direct anonymous PostgREST access
--    - "Registration", "RegistrationPlayer", "RegistrationException",
--      "AdminAuditLog", "User", "Player", "_prisma_migrations"
--
-- 3. Public Read-Only Scoreboard Tables: ALLOW public SELECT to anon/authenticated,
--    DENY all anonymous INSERT, UPDATE, DELETE.
--    - "Match", "Innings", "BallEvent", "InningsBatter", "InningsBowler",
--      "Team", "TeamPlayer", "Tournament", "TournamentStage", "TournamentTeam",
--      "TournamentSquad", "Venue"
--
-- 4. Scoped Application Role (`cricket_app_role`):
--    - Explicit RLS policies (FOR ALL USING (true) WITH CHECK (true)) across app tables.
--    - "AdminAuditLog" is strictly APPEND-ONLY (SELECT & INSERT only, no UPDATE/DELETE).
--    - Includes ALTER DEFAULT PRIVILEGES for future migrations.
-- ==============================================================================

-- 1. Blanket RLS: Enable RLS on every table in the public schema
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END
$$;

-- 2. Explicitly lock down Prisma internal migrations table from PostgREST / anon
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;

-- 3. Sensitive tables: Ensure RLS is active
ALTER TABLE IF EXISTS "Registration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "RegistrationPlayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "RegistrationException" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Player" ENABLE ROW LEVEL SECURITY;

-- 4. Public read-only tables: Grant read-only policies for public/anon
ALTER TABLE IF EXISTS "Match" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for Match" ON "Match";
CREATE POLICY "Public read access for Match" ON "Match" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "Innings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for Innings" ON "Innings";
CREATE POLICY "Public read access for Innings" ON "Innings" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "BallEvent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for BallEvent" ON "BallEvent";
CREATE POLICY "Public read access for BallEvent" ON "BallEvent" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "InningsBatter" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for InningsBatter" ON "InningsBatter";
CREATE POLICY "Public read access for InningsBatter" ON "InningsBatter" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "InningsBowler" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for InningsBowler" ON "InningsBowler";
CREATE POLICY "Public read access for InningsBowler" ON "InningsBowler" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "Team" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for Team" ON "Team";
CREATE POLICY "Public read access for Team" ON "Team" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "TeamPlayer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for TeamPlayer" ON "TeamPlayer";
CREATE POLICY "Public read access for TeamPlayer" ON "TeamPlayer" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "Tournament" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for Tournament" ON "Tournament";
CREATE POLICY "Public read access for Tournament" ON "Tournament" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "TournamentStage" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for TournamentStage" ON "TournamentStage";
CREATE POLICY "Public read access for TournamentStage" ON "TournamentStage" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "TournamentTeam" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for TournamentTeam" ON "TournamentTeam";
CREATE POLICY "Public read access for TournamentTeam" ON "TournamentTeam" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "TournamentSquad" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for TournamentSquad" ON "TournamentSquad";
CREATE POLICY "Public read access for TournamentSquad" ON "TournamentSquad" FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE IF EXISTS "Venue" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for Venue" ON "Venue";
CREATE POLICY "Public read access for Venue" ON "Venue" FOR SELECT TO anon, authenticated USING (true);

-- Revoke all table-level write privileges from public / anon roles
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ==============================================================================
-- 5. Scoped Application Role (`cricket_app_role`)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cricket_app_role') THEN
    CREATE ROLE cricket_app_role WITH LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO cricket_app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cricket_app_role;

-- Grant CRUD on application operational tables
GRANT SELECT, INSERT, UPDATE, DELETE ON "Registration", "RegistrationPlayer", "RegistrationException",
  "User", "Player", "Match", "Innings", "BallEvent", "InningsBatter", "InningsBowler", "Team",
  "TeamPlayer", "Tournament", "TournamentStage", "TournamentTeam", "TournamentSquad", "Venue"
TO cricket_app_role;

-- Strictly Append-Only grant for AdminAuditLog (NO UPDATE, NO DELETE)
GRANT SELECT, INSERT ON "AdminAuditLog" TO cricket_app_role;
REVOKE UPDATE, DELETE ON "AdminAuditLog" FROM cricket_app_role;

-- Explicit RLS Policies for cricket_app_role to prevent self-inflicted lockout
DO $$
DECLARE
  tbl text;
  policy_name text;
  tables text[] := ARRAY[
    'Registration', 'RegistrationPlayer', 'RegistrationException',
    'User', 'Player', 'Match', 'Innings', 'BallEvent',
    'InningsBatter', 'InningsBowler', 'Team', 'TeamPlayer',
    'Tournament', 'TournamentStage', 'TournamentTeam', 'TournamentSquad',
    'Venue'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    policy_name := 'App full access for ' || tbl;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', policy_name, tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO cricket_app_role USING (true) WITH CHECK (true);', policy_name, tbl);
  END LOOP;
END
$$;

-- Explicit policies for AdminAuditLog (Strictly SELECT and INSERT only; no UPDATE/DELETE policies)
DROP POLICY IF EXISTS "App read insert access for AdminAuditLog" ON "AdminAuditLog";
DROP POLICY IF EXISTS "App read access for AdminAuditLog" ON "AdminAuditLog";
DROP POLICY IF EXISTS "App insert access for AdminAuditLog" ON "AdminAuditLog";

CREATE POLICY "App read access for AdminAuditLog" ON "AdminAuditLog"
  FOR SELECT TO cricket_app_role USING (true);

CREATE POLICY "App insert access for AdminAuditLog" ON "AdminAuditLog"
  FOR INSERT TO cricket_app_role WITH CHECK (true);

-- Future-proof default privileges for future migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO cricket_app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cricket_app_role;
