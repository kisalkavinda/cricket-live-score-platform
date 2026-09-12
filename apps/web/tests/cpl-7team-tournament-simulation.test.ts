/**
 * CPL 7-TEAM OFFICIAL TOURNAMENT FULL 11-MATCH LIFECYCLE SIMULATION TEST
 * 
 * Rules verified:
 * 1. Exactly 7 teams: Group A (A1, A2, A3, A4) and Group B (B1, B2, B3).
 * 2. Stage 1: Group Stage (7 matches: M1-M7).
 *    Group A: Exactly 4 matches in a square cycle graph (no diagonals):
 *      A1-A2, A2-A4, A4-A3, A3-A1. Each team in Group A plays exactly 2 matches!
 *    Group B: Exactly 3 matches in full round-robin:
 *      B1-B2, B2-B3, B1-B3. Each team in Group B plays exactly 2 matches!
 *    Ranked by Points -> NRR.
 * 3. Group Standings:
 *    A1, B1 -> Playoff 1 (M8).
 *    A2, B2 -> Playoff 2 (M9).
 *    A3, A4, B3 -> ELIMINATED directly.
 * 4. Stage 2: 3 Playoff Matches (M8-M10).
 *    M8 (P1): A1 vs B1 (Winner -> Grand Final M11, Loser -> P3 M10).
 *    M9 (P2): A2 vs B2 (Winner -> P3 M10, Loser -> OUT).
 *    M10 (P3): P1 Loser vs P2 Winner (Winner -> Grand Final M11, Loser -> OUT).
 * 5. Stage 3: Grand Final (1 match: M11).
 *    M11: P1 Winner vs P3 Winner (Winner -> Champion, Loser -> Runner-up).
 * 6. Exact total matches: TOTAL MATCHES === 11.
 * 
 * CLEANUP RULE:
 * Temporary test teams and records are prefixed with "TEST_CPL7_" and completely deleted in finally block.
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

const TEST_PREFIX = 'TEST_CPL7_';

async function run7TeamSimulation() {
  console.log('\n============================================================');
  console.log(' CPL 7-TEAM TOURNAMENT FULL 11-MATCH LIFECYCLE SIMULATION');
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
    // 1. Create a 7-Team Test Tournament
    testTournament = await (prisma as any).tournament.create({
      data: {
        name: `${TEST_PREFIX}CHAMPIONSHIP_2026`,
        season: '2026',
        format: 'SOFTBALL_4_OVER',
        tournamentFormat: '7_TEAM',
        status: 'REGISTRATION',
      },
    });
    console.log(`\n1. Created 7-team test tournament: ${testTournament.name} (${testTournament.id})`);
    assert.strictEqual(testTournament.tournamentFormat, '7_TEAM', 'tournamentFormat stored as 7_TEAM');

    // 2. Create 7 dedicated Test Teams (4 for Group A, 3 for Group B)
    const teamConfigs = [
      { name: `${TEST_PREFIX}Titans_A1`, shortName: '7A1' },
      { name: `${TEST_PREFIX}Warriors_A2`, shortName: '7A2' },
      { name: `${TEST_PREFIX}Knights_A3`, shortName: '7A3' },
      { name: `${TEST_PREFIX}Strikers_A4`, shortName: '7A4' },
      { name: `${TEST_PREFIX}Royals_B1`, shortName: '7B1' },
      { name: `${TEST_PREFIX}Kings_B2`, shortName: '7B2' },
      { name: `${TEST_PREFIX}Hawks_B3`, shortName: '7B3' },
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
    assert.strictEqual(testTeams.length, 7, 'Exactly 7 test teams created');
    console.log(`2. Created 7 test teams: ${testTeams.map((t) => t.shortName).join(', ')}`);

    // 3. Assign 7 teams: 4 in Group A (A1..A4), 3 in Group B (B1..B3)
    const groupAssignments: Record<string, 'GROUP_A' | 'GROUP_B'> = {};
    const seedPositions: Record<string, number> = {};

    testTeams.slice(0, 4).forEach((t, idx) => {
      groupAssignments[t.id] = 'GROUP_A';
      seedPositions[t.id] = idx + 1;
    });
    testTeams.slice(4, 7).forEach((t, idx) => {
      groupAssignments[t.id] = 'GROUP_B';
      seedPositions[t.id] = idx + 1;
    });

    const assignRes = await assignTeamsToGroups(testTournament.id, groupAssignments, seedPositions);
    assert.strictEqual(assignRes.success, true, 'Group assignment successful for 4+3 teams');
    console.log('3. Teams assigned: 4 in Group A, 3 in Group B');

    // 4. Generate Group Stage Fixtures (should generate exactly 7 matches: M1-M7)
    const fixtureRes = await generateGroupStageFixtures(testTournament.id, {
      ballsPerOver: 1,
      groupOvers: 1,
      qualificationOvers: 1,
      playoffOvers: 1,
      finalOvers: 1,
    });
    assert.strictEqual(fixtureRes.success, true, 'Group fixtures generated');
    assert.strictEqual(fixtureRes.createdCount, 7, 'Exactly 7 group stage matches created for 7-team format');
    console.log(`4. Generated ${fixtureRes.createdCount} group matches (M1–M7)`);

    // Verify Group A matches: strictly 4 edges (A1-A2, A2-A4, A4-A3, A3-A1), NO diagonals (A1-A4, A2-A3)
    const tA1 = testTeams[0].id;
    const tA2 = testTeams[1].id;
    const tA3 = testTeams[2].id;
    const tA4 = testTeams[3].id;
    const tB1 = testTeams[4].id;
    const tB2 = testTeams[5].id;
    const tB3 = testTeams[6].id;

    const groupMatches = await prisma.match.findMany({
      where: { tournamentId: testTournament.id },
      orderBy: { matchNumber: 'asc' },
    });
    assert.strictEqual(groupMatches.length, 7, '7 group matches exist');

    // Count appearances per team
    const appearances: Record<string, number> = {};
    for (const gm of groupMatches) {
      appearances[gm.teamAId!] = (appearances[gm.teamAId!] || 0) + 1;
      appearances[gm.teamBId!] = (appearances[gm.teamBId!] || 0) + 1;

      // Verify no diagonal matches in Group A
      const pair = [gm.teamAId, gm.teamBId];
      assert.ok(
        !(pair.includes(tA1) && pair.includes(tA4)),
        'Diagonal A1-A4 must NOT exist in 7-team Group A'
      );
      assert.ok(
        !(pair.includes(tA2) && pair.includes(tA3)),
        'Diagonal A2-A3 must NOT exist in 7-team Group A'
      );
    }

    // Every team in both groups must play exactly 2 matches
    for (const t of testTeams) {
      assert.strictEqual(appearances[t.id], 2, `Team ${t.shortName} plays exactly 2 group matches`);
    }
    console.log('5. Verified Group A square graph (4 matches) & Group B round robin (3 matches) - All 7 teams play exactly 2 matches');

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
          resultNote: `Team won`,
        },
      });
    };

    // 5. Complete Group Stage (M1–M7)
    // Results designed:
    // Group A: A1 (4 pts), A2 (2 pts), A4 (2 pts, lower NRR), A3 (0 pts) -> A1 (1st), A2 (2nd)
    // Group B: B1 (4 pts), B2 (2 pts), B3 (0 pts) -> B1 (1st), B2 (2nd)
    for (const gm of groupMatches) {
      const a = gm.teamAId;
      const b = gm.teamBId;

      if ((a === tA1 && b === tA2) || (a === tA2 && b === tA1)) {
        await completeMatch(gm.id, tA1, 50, 30); // A1 beats A2
      } else if ((a === tA2 && b === tA4) || (a === tA4 && b === tA2)) {
        await completeMatch(gm.id, tA2, 45, 35); // A2 beats A4
      } else if ((a === tA4 && b === tA3) || (a === tA3 && b === tA4)) {
        await completeMatch(gm.id, tA4, 40, 30); // A4 beats A3
      } else if ((a === tA3 && b === tA1) || (a === tA1 && b === tA3)) {
        await completeMatch(gm.id, tA1, 48, 20); // A1 beats A3
      } else if ((a === tB1 && b === tB2) || (a === tB2 && b === tB1)) {
        await completeMatch(gm.id, tB1, 52, 38); // B1 beats B2
      } else if ((a === tB2 && b === tB3) || (a === tB3 && b === tB2)) {
        await completeMatch(gm.id, tB2, 44, 25); // B2 beats B3
      } else if ((a === tB1 && b === tB3) || (a === tB3 && b === tB1)) {
        await completeMatch(gm.id, tB1, 46, 22); // B1 beats B3
      } else {
        throw new Error(`Unexpected group match pairing: ${gm.matchNumber} (${a} vs ${b})`);
      }
      console.log(`Simulated Group Match M${gm.matchNumber}`);
    }

    await recalculateTournamentStandings(testTournament.id);

    // Advance tournament: should trigger advance7TeamTournament Stage 1 -> Stage 2 (Direct to Playoffs M8 [P1] and M9 [P2])
    const adv1 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(adv1.advanced, true, 'Advanced to 3 Playoff Matches');
    console.log(`6. Group Stage concluded. Advanced: ${adv1.message}`);

    const m8 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 8 },
    });
    const m9 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 9 },
    });

    assert.ok(m8, 'Match 8 (P1) created');
    assert.ok(m9, 'Match 9 (P2) created');

    // Rule: M8 (P1) is A1 vs B1
    const m8Teams = [m8.teamAId, m8.teamBId];
    assert.ok(m8Teams.includes(tA1) && m8Teams.includes(tB1), 'M8 (P1) is A1 vs B1');
    console.log('7. Verified Match 8 (P1): A1 vs B1');

    // Rule: M9 (P2) is A2 vs B2
    const m9Teams = [m9.teamAId, m9.teamBId];
    assert.ok(m9Teams.includes(tA2) && m9Teams.includes(tB2), 'M9 (P2) is A2 vs B2');
    console.log('8. Verified Match 9 (P2): A2 vs B2');

    // 6. Simulate P1 (M8) and P2 (M9)
    // M8: A1 beats B1 -> A1 advances to Grand Final (M11); B1 drops to P3 (M10)
    await completeMatch(m8.id, tA1, 54, 40);

    // M9: A2 beats B2 -> A2 advances to P3 (M10); B2 is eliminated
    await completeMatch(m9.id, tA2, 46, 38);

    // Advance tournament: should generate M10 (P3: P1 Loser [B1] vs P2 Winner [A2])
    const adv2 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(adv2.advanced, true, 'Advanced to P3 (M10)');
    console.log(`9. P1 & P2 concluded. Advanced: ${adv2.message}`);

    const m10 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 10 },
    });
    assert.ok(m10, 'Match 10 (P3) created');
    const m10Teams = [m10.teamAId, m10.teamBId];
    assert.ok(m10Teams.includes(tB1) && m10Teams.includes(tA2), 'Match 10 is P1 Loser (B1) vs P2 Winner (A2)');
    console.log('10. Verified Match 10 (P3): P1 Loser (B1) vs P2 Winner (A2)');

    // 7. Simulate P3 (M10)
    // B1 beats A2 -> B1 advances to Grand Final (M11); A2 is eliminated
    await completeMatch(m10.id, tB1, 50, 44);

    // Advance tournament: should generate Match 11 (Grand Final: P1 Winner [A1] vs P3 Winner [B1])
    const adv3 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(adv3.advanced, true, 'Advanced to Grand Final (M11)');
    console.log(`11. P3 concluded. Advanced: ${adv3.message}`);

    const m11 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 11 },
    });
    assert.ok(m11, 'Match 11 (Grand Final) created');
    const m11Teams = [m11.teamAId, m11.teamBId];
    assert.ok(m11Teams.includes(tA1) && m11Teams.includes(tB1), 'Match 11 is P1 Winner (A1) vs P3 Winner (B1)');
    console.log('12. Verified Match 11 (Grand Final): P1 Winner (A1) vs P3 Winner (B1)');

    // 8. Simulate Grand Final (M11)
    // A1 beats B1 -> A1 is Champion!
    await completeMatch(m11.id, tA1, 58, 50);

    // Advance tournament: should complete tournament and crown Champion
    const advFinal = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advFinal.advanced, true, 'Tournament finalized');
    console.log(`13. Grand Final concluded. Advanced: ${advFinal.message}`);

    // Verify Overview
    const overview = await getTournamentOverview(testTournament.id);
    assert.ok(overview, 'Tournament overview retrieved');
    assert.strictEqual(overview.tournamentFormat, '7_TEAM', 'Overview format is 7_TEAM');
    assert.strictEqual(overview.progress.totalMatches, 11, 'Overview totalMatches is exactly 11');
    assert.strictEqual(overview.progress.completedMatches, 11, 'Overview completedMatches is 11');
    assert.strictEqual(overview.progress.currentStage, 'COMPLETED', 'Current stage is COMPLETED');
    assert.strictEqual(overview.crownedChampion?.id, tA1, 'Champion crowned correctly as A1');

    console.log('\n============================================================');
    console.log(` 🏆 7-TEAM CHAMPION CROWNED: ${overview.crownedChampion?.name}`);
    console.log(' TOTAL MATCHES VERIFIED: EXACTLY 11 MATCHES (M1–M11)');
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
  console.log(' ALL 7-TEAM CPL TOURNAMENT LIFECYCLE CHECKS PASSED! ✅');
  console.log('============================================================\n');
}

run7TeamSimulation()
  .catch((err) => {
    console.error('SIMULATION ERROR:', err);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
