-- Ensure that in any draw, a team can hold at most one selected chit
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentDrawChit_draw_team_unique" 
ON "TournamentDrawChit" ("drawId", "selectedByTeamId") 
WHERE "selectedByTeamId" IS NOT NULL;
