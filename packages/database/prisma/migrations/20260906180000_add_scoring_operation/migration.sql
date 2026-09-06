-- CreateTable
CREATE TABLE IF NOT EXISTS "ScoringOperation" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "inningsId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "result" JSONB,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ScoringOperation_operationId_key" ON "ScoringOperation"("operationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScoringOperation_matchId_idx" ON "ScoringOperation"("matchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScoringOperation_inningsId_idx" ON "ScoringOperation"("inningsId");

-- RLS Enforcement
ALTER TABLE "ScoringOperation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ScoringOperation" FROM anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cricket_app_role') THEN
    GRANT ALL ON TABLE "ScoringOperation" TO cricket_app_role;
    DROP POLICY IF EXISTS "Full access for cricket_app_role on ScoringOperation" ON "ScoringOperation";
    CREATE POLICY "Full access for cricket_app_role on ScoringOperation" ON "ScoringOperation" FOR ALL TO cricket_app_role USING (true) WITH CHECK (true);
  END IF;
END
$$;
