/**
 * CPL 6-TEAM OFFICIAL TOURNAMENT FULL 13-MATCH LIFECYCLE SIMULATION TEST
 * 
 * Rules verified:
 * 1. Exactly 6 teams: Group A (A1, A2, A3) and Group B (B1, B2, B3).
 * 2. Stage 1: Group Stage (6 matches: M1-M6).
 *    Group A: A1-A2, A2-A3, A1-A3.
 *    Group B: B1-B2, B2-B3, B1-B3.
 *    Ranked by Points -> NRR.
 * 3. Stage 2: Wildcard Stage (3 matches: M7-M9).
 *    M7 (WC1): A2 vs B2 (Winner -> Seed 3, Loser -> M9 / WC3).
 *    M8 (WC2): B3 vs A3 (Winner -> M9 / WC3, Loser -> OUT).
 *    M9 (WC3): WC1 Loser vs WC2 Winner (Winner -> Seed 4, Loser -> OUT).
 * 4. Stage 3: Playoffs (3 matches: M10-M12).
 *    M10 (P1): A1 vs B1 (Winner -> Grand Final M13, Loser -> P3 M12).
 *    M11 (P2): Seed 3 (WC1 Winner) vs Seed 4 (WC3 Winner) (Winner -> P3 M12, Loser -> OUT).
 *    M12 (P3): P1 Loser vs P2 Winner (Winner -> Grand Final M13, Loser -> OUT).
 * 5. Stage 4: Grand Final (1 match: M13).
 *    M13: P1 Winner vs P3 Winner (Winner -> Champion, Loser -> Runner-up).
 * 6. Exact total matches: TOTAL MATCHES === 13.
 * 
 * CLEANUP RULE:
 * Temporary test teams and records are prefixed with "TEST_CPL6_" and completely deleted in finally block.
 */

import assert from 'assert';
import { prisma } from 'database';
import {
  assignTeamsToGroups,
  generateGroupStageFixtures,
  checkAndAdvanceTournament,
  recalculateTournamentStandings,
  getTournamentOverview,
} from '../lib/tournament/tournament-service';

const TEST_PREFIX = 'TEST_CPL6_';

async function run6TeamSimulation() {
  console.log('\n============================================================');
  console.log(' CPL 6-TEAM TOURNAMENT FULL 13-MATCH LIFECYCLE SIMULATION');
  console.log('============================================================\n');

  let initialTeamsCount = 0;
  let initialPlayersCount = 0;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      initialTeamsCount = await prisma.team.count();
      initialPlayersCount = await prisma.player.count();
      break;
    } catch (connErr: any) {
      if (attempt === 4) throw connErr;
      console.log(`[DB Connect] Attempt ${attempt} failed. Retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.log(`[Baseline] Real Teams in DB: ${initialTeamsCount} | Real Players in DB: ${initialPlayersCount}`);

  let testTournament: any = null;
  const createdTeamIds: string[] = [];

  try {
    // 1. Create a 6-Team Test Tournament
    testTournament = await (prisma as any).tournament.create({
      data: {
        name: `${TEST_PREFIX}CHAMPIONSHIP_2026`,
        season: '2026',
        format: 'SOFTBALL_4_OVER',
        tournamentFormat: '6_TEAM',
        status: 'REGISTRATION',
      },
    });
    console.log(`\n1. Created 6-team test tournament: ${testTournament.name} (${testTournament.id})`);
    assert.strictEqual(testTournament.tournamentFormat, '6_TEAM', 'tournamentFormat stored as 6_TEAM');

    // 2. Create 6 dedicated Test Teams (3 for Group A, 3 for Group B)
    const teamConfigs = [
      { name: `${TEST_PREFIX}Titans_A1`, shortName: '6A1' },
      { name: `${TEST_PREFIX}Warriors_A2`, shortName: '6A2' },
      { name: `${TEST_PREFIX}Knights_A3`, shortName: '6A3' },
      { name: `${TEST_PREFIX}Royals_B1`, shortName: '6B1' },
      { name: `${TEST_PREFIX}Kings_B2`, shortName: '6B2' },
      { name: `${TEST_PREFIX}Hawks_B3`, shortName: '6B3' },
    ];

    const testTeams: any[] = [];
    for (const tc of teamConfigs) {
      const team = await prisma.team.create({
        data: {
          name: tc.name,
          shortName: tc.shortName,
        },
      });
      testTeams.push(team);
      createdTeamIds.push(team.id);
    }
    assert.strictEqual(testTeams.length, 6, 'Exactly 6 test teams created');
    console.log(`2. Created 6 test teams: ${testTeams.map((t) => t.shortName).join(', ')}`);

    // 3. Assign 6 teams: 3 in Group A (A1..A3), 3 in Group B (B1..B3)
    const groupAssignments: Record<string, 'GROUP_A' | 'GROUP_B'> = {};
    const seedPositions: Record<string, number> = {};

    testTeams.slice(0, 3).forEach((t, idx) => {
      groupAssignments[t.id] = 'GROUP_A';
      seedPositions[t.id] = idx + 1;
    });
    testTeams.slice(3, 6).forEach((t, idx) => {
      groupAssignments[t.id] = 'GROUP_B';
      seedPositions[t.id] = idx + 1;
    });

    const assignRes = await assignTeamsToGroups(testTournament.id, groupAssignments, seedPositions);
    assert.strictEqual(assignRes.success, true, 'Group assignment successful for 3+3 teams');
    console.log('3. Teams assigned: 3 in Group A, 3 in Group B');

    // 4. Generate Group Stage Fixtures (should generate exactly 6 matches: M1-M6)
    const fixtureRes = await generateGroupStageFixtures(testTournament.id, {
      ballsPerOver: 1,
      groupOvers: 1,
      qualificationOvers: 1,
      playoffOvers: 1,
      finalOvers: 1,
    });
    assert.strictEqual(fixtureRes.success, true, 'Group fixtures generated');
    assert.strictEqual(fixtureRes.createdCount, 6, 'Exactly 6 group stage matches created for 6-team format');
    console.log(`4. Generated ${fixtureRes.createdCount} group matches (M1–M6)`);

    // Helper to simulate completing a match fast using minimum overs (1) and balls (1 ball/over)
    const completeMatch = async (matchId: string, winnerTeamId: string, teamAScore: number, teamBScore: number) => {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });
      if (!match) throw new Error(`Match ${matchId} not found`);

      const teamAId = match.teamAId!;
      const teamBId = match.teamBId!;

      await prisma.innings.createMany({
        data: [
          {
            matchId: match.id,
            inningsNumber: 1,
            battingTeamId: teamAId,
            bowlingTeamId: teamBId,
            runs: teamAScore,
            wickets: 2,
            overs: 1,
            balls: 0,
          },
          {
            matchId: match.id,
            inningsNumber: 2,
            battingTeamId: teamBId,
            bowlingTeamId: teamAId,
            runs: teamBScore,
            wickets: 3,
            overs: 1,
            balls: 0,
          },
        ],
      });

      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'COMPLETED',
          winnerTeam: { connect: { id: winnerTeamId } },
          resultNote: `Team ${winnerTeamId === teamAId ? 'A' : 'B'} won`,
        },
      });
    };

    // 5. Simulate Group Stage (Matches 1–6)
    // Standings planned:
    // Group A: A1 (4 pts, 2-0), A2 (2 pts, 1-1), A3 (0 pts, 0-2)
    // Group B: B1 (4 pts, 2-0), B2 (2 pts, 1-1), B3 (0 pts, 0-2)
    const tA1 = testTeams[0].id;
    const tA2 = testTeams[1].id;
    const tA3 = testTeams[2].id;
    const tB1 = testTeams[3].id;
    const tB2 = testTeams[4].id;
    const tB3 = testTeams[5].id;

    const groupMatches = await prisma.match.findMany({
      where: { tournamentId: testTournament.id },
      orderBy: { matchNumber: 'asc' },
    });
    assert.strictEqual(groupMatches.length, 6, '6 group matches exist');

    for (const gm of groupMatches) {
      const a = gm.teamAId;
      const b = gm.teamBId;

      if ((a === tA1 && b === tA2) || (a === tA2 && b === tA1)) {
        // A1 beats A2
        await completeMatch(gm.id, tA1, 45, 30);
      } else if ((a === tA2 && b === tA3) || (a === tA3 && b === tA2)) {
        // A2 beats A3
        await completeMatch(gm.id, tA2, 40, 25);
      } else if ((a === tA1 && b === tA3) || (a === tA3 && b === tA1)) {
        // A1 beats A3
        await completeMatch(gm.id, tA1, 50, 20);
      } else if ((a === tB1 && b === tB2) || (a === tB2 && b === tB1)) {
        // B1 beats B2
        await completeMatch(gm.id, tB1, 48, 35);
      } else if ((a === tB2 && b === tB3) || (a === tB3 && b === tB2)) {
        // B2 beats B3
        await completeMatch(gm.id, tB2, 42, 28);
      } else if ((a === tB1 && b === tB3) || (a === tB3 && b === tB1)) {
        // B1 beats B3
        await completeMatch(gm.id, tB1, 52, 22);
      }
    }

    await recalculateTournamentStandings(testTournament.id);

    // Advance tournament: should trigger advance6TeamTournament Stage 1 -> Stage 2 (Wildcard M7, M8)
    const adv1 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(adv1.advanced, true, 'Advanced to Wildcard Stage');
    console.log(`5. Group Stage concluded. Advanced: ${adv1.message}`);

    // Verify Wildcard fixtures M7 and M8
    const m7 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 7 },
    });
    const m8 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 8 },
    });

    assert.ok(m7, 'Match 7 (WC1) created');
    assert.ok(m8, 'Match 8 (WC2) created');

    // Rule: M7 (WC1) is A2 vs B2
    const m7Teams = [m7.teamAId, m7.teamBId];
    assert.ok(m7Teams.includes(tA2) && m7Teams.includes(tB2), 'M7 (WC1) is A2 vs B2');
    console.log('6. Verified Match 7 (WC1): A2 vs B2');

    // Rule: M8 (WC2) is B3 vs A3
    const m8Teams = [m8.teamAId, m8.teamBId];
    assert.ok(m8Teams.includes(tB3) && m8Teams.includes(tA3), 'M8 (WC2) is B3 vs A3');
    console.log('7. Verified Match 8 (WC2): B3 vs A3');

    // 6. Simulate Wildcard Stage (WC1 & WC2)
    // WC1: A2 beats B2 -> A2 becomes Seed 3; B2 drops to WC3
    await completeMatch(m7.id, tA2, 44, 38);

    // WC2: B3 beats A3 -> B3 advances to WC3; A3 is eliminated
    await completeMatch(m8.id, tB3, 39, 30);

    // Advance tournament: should generate Match 9 (WC3: WC1 Loser [B2] vs WC2 Winner [B3])
    const adv2 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(adv2.advanced, true, 'Advanced to WC3');
    console.log(`8. WC1 & WC2 concluded. Advanced: ${adv2.message}`);

    const m9 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 9 },
    });
    assert.ok(m9, 'Match 9 (WC3) created');
    const m9Teams = [m9.teamAId, m9.teamBId];
    assert.ok(m9Teams.includes(tB2) && m9Teams.includes(tB3), 'Match 9 is WC1 Loser (B2) vs WC2 Winner (B3)');
    console.log('9. Verified Match 9 (WC3): WC1 Loser (B2) vs WC2 Winner (B3)');

    // 7. Simulate Match 9 (WC3)
    // B2 beats B3 -> B2 becomes Seed 4; B3 is eliminated
    await completeMatch(m9.id, tB2, 45, 35);

    // Advance tournament: should transition to Playoff Stage (generating M10 [P1: A1 vs B1] and M11 [P2: Seed 3 vs Seed 4])
    const adv3 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(adv3.advanced, true, 'Advanced to Playoffs Stage');
    console.log(`10. Wildcard Stage concluded. Advanced: ${adv3.message}`);

    const m10 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 10 },
    });
    const m11 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 11 },
    });
    assert.ok(m10, 'Match 10 (P1) created');
    assert.ok(m11, 'Match 11 (P2) created');

    // Rule: M10 (P1) is A1 vs B1
    const m10Teams = [m10.teamAId, m10.teamBId];
    assert.ok(m10Teams.includes(tA1) && m10Teams.includes(tB1), 'M10 (P1) is A1 vs B1');
    console.log('11. Verified Match 10 (P1): A1 vs B1');

    // Rule: M11 (P2) is Seed 3 (A2) vs Seed 4 (B2)
    const m11Teams = [m11.teamAId, m11.teamBId];
    assert.ok(m11Teams.includes(tA2) && m11Teams.includes(tB2), 'M11 (P2) is Seed 3 (A2) vs Seed 4 (B2)');
    console.log('12. Verified Match 11 (P2): Seed 3 (A2) vs Seed 4 (B2)');

    // 8. Simulate P1 (M10) and P2 (M11)
    // M10: A1 beats B1 -> A1 advances to Grand Final (M13); B1 drops to P3 (M12)
    await completeMatch(m10.id, tA1, 55, 40);

    // M11: A2 beats B2 -> A2 advances to P3 (M12); B2 is eliminated
    await completeMatch(m11.id, tA2, 48, 41);

    // Advance tournament: should generate M12 (P3: P1 Loser [B1] vs P2 Winner [A2])
    const adv4 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(adv4.advanced, true, 'Advanced to P3 (M12)');
    console.log(`13. P1 & P2 concluded. Advanced: ${adv4.message}`);

    const m12 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 12 },
    });
    assert.ok(m12, 'Match 12 (P3) created');
    const m12Teams = [m12.teamAId, m12.teamBId];
    assert.ok(m12Teams.includes(tB1) && m12Teams.includes(tA2), 'Match 12 is P1 Loser (B1) vs P2 Winner (A2)');
    console.log('14. Verified Match 12 (P3): P1 Loser (B1) vs P2 Winner (A2)');

    // 9. Simulate P3 (M12)
    // B1 beats A2 -> B1 advances to Grand Final (M13); A2 is eliminated
    await completeMatch(m12.id, tB1, 50, 42);

    // Advance tournament: should generate Match 13 (Grand Final: P1 Winner [A1] vs P3 Winner [B1])
    const adv5 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(adv5.advanced, true, 'Advanced to Grand Final (M13)');
    console.log(`15. P3 concluded. Advanced: ${adv5.message}`);

    const m13 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 13 },
    });
    assert.ok(m13, 'Match 13 (Grand Final) created');
    const m13Teams = [m13.teamAId, m13.teamBId];
    assert.ok(m13Teams.includes(tA1) && m13Teams.includes(tB1), 'Match 13 is P1 Winner (A1) vs P3 Winner (B1)');
    console.log('16. Verified Match 13 (Grand Final): P1 Winner (A1) vs P3 Winner (B1)');

    // 10. Simulate Grand Final (M13)
    // A1 beats B1 -> A1 is Champion!
    await completeMatch(m13.id, tA1, 60, 48);

    // Advance tournament: should complete tournament and crown Champion
    const advFinal = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advFinal.advanced, true, 'Tournament finalized');
    console.log(`17. Grand Final concluded. Advanced: ${advFinal.message}`);

    // Verify Overview
    const overview = await getTournamentOverview(testTournament.id);
    assert.ok(overview, 'Tournament overview retrieved');
    assert.strictEqual(overview.tournamentFormat, '6_TEAM', 'Overview format is 6_TEAM');
    assert.strictEqual(overview.progress.totalMatches, 13, 'Overview totalMatches is exactly 13');
    assert.strictEqual(overview.progress.completedMatches, 13, 'Overview completedMatches is 13');
    assert.strictEqual(overview.progress.currentStage, 'COMPLETED', 'Current stage is COMPLETED');
    assert.strictEqual(overview.crownedChampion?.id, tA1, 'Champion crowned correctly as A1');

    console.log('\n============================================================');
    console.log(` 🏆 6-TEAM CHAMPION CROWNED: ${overview.crownedChampion?.name}`);
    console.log(' TOTAL MATCHES VERIFIED: EXACTLY 13 MATCHES (M1–M13)');
    console.log('============================================================\n');

  } finally {
    // Clean up test tournament and teams
    if (testTournament) {
      const testMatches = await prisma.match.findMany({
        where: { tournamentId: testTournament.id },
        select: { id: true },
      });
      const matchIds = testMatches.map((m: any) => m.id);
      if (matchIds.length > 0) {
        await prisma.ballEvent.deleteMany({ where: { innings: { matchId: { in: matchIds } } } });
        await prisma.innings.deleteMany({ where: { matchId: { in: matchIds } } });
      }

      await prisma.match.deleteMany({ where: { tournamentId: testTournament.id } });
      await prisma.tournamentSquad.deleteMany({ where: { tournamentId: testTournament.id } });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId: testTournament.id } });
      await prisma.tournamentStage.deleteMany({ where: { tournamentId: testTournament.id } });
      await prisma.tournament.delete({ where: { id: testTournament.id } });
    }

    if (createdTeamIds.length > 0) {
      await prisma.team.deleteMany({
        where: {
          id: { in: createdTeamIds },
          name: { startsWith: TEST_PREFIX },
        },
      });
    }

    const finalTeamsCount = await prisma.team.count();
    const finalPlayersCount = await prisma.player.count();
    assert.strictEqual(finalTeamsCount, initialTeamsCount, 'Real teams count preserved');
    assert.strictEqual(finalPlayersCount, initialPlayersCount, 'Real players count preserved');
    console.log('Clean-up verified: ZERO impact on real teams and players! 🛡️\n');
  }

  console.log('============================================================');
  console.log(' ALL 6-TEAM CPL TOURNAMENT LIFECYCLE CHECKS PASSED! ✅');
  console.log('============================================================\n');
}

run6TeamSimulation()
  .catch((err) => {
    console.error('SIMULATION ERROR:', err);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
