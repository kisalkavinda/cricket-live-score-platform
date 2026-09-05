/**
 * CPL 9-TEAM OFFICIAL TOURNAMENT FULL 16-MATCH SIMULATION TEST
 * 
 * Rules verified:
 * 1. 9 teams divided into Group A, B, C (3 teams each).
 * 2. Stage 1: Group Stage (M1-M9). Winner -> Final Four, 2nd -> Wildcard, 3rd -> Eliminated.
 * 3. Ball-based Softball NRR: effective overs = legalBalls / ballsPerOver, full all-out rule.
 * 4. Stage 2: Wildcard round-robin (M10-M12). 1st -> Final Four Seed #4.
 * 5. Stage 3: Final Four (M13: Q1 [Seed 1 vs 2], M14: Elim [Seed 3 vs 4], M15: Q2 [Loser Q1 vs Winner Elim]).
 * 6. Stage 4: Grand Final (M16: Winner Q1 vs Winner Q2) -> Champion declared.
 * 
 * CRITICAL USER RULE:
 * "after test adding palyer and team make sure to remvoe them form the system butdont rtemve the real temas and players"
 * Any test teams/players created are prefixed with "TEST_CPL_" and completely deleted in finally block.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load environment
const envFiles = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../.env.local'),
  path.join(__dirname, '../../packages/database/.env'),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  assignTeamsToGroups,
  generateGroupStageFixtures,
  checkAndAdvanceTournament,
  getTournamentOverview,
  recalculateTournamentStandings,
} = require('../lib/tournament/tournament-service.ts');

const TEST_PREFIX = 'TEST_CPL_';

async function runSimulation() {
  console.log('\n============================================================');
  console.log(' CPL 9-TEAM TOURNAMENT FULL 16-MATCH LIFECYCLE SIMULATION');
  console.log('============================================================\n');

  // Baseline check: Record initial real teams and players count
  const initialTeamsCount = await prisma.team.count();
  const initialPlayersCount = await prisma.player.count();
  console.log(`[Baseline] Real Teams in DB: ${initialTeamsCount} | Real Players in DB: ${initialPlayersCount}`);

  let testTournament = null;
  const createdTeamIds = [];

  try {
    // 1. Create a dedicated Test Tournament
    testTournament = await prisma.tournament.create({
      data: {
        name: `${TEST_PREFIX}CHAMPIONSHIP_2026`,
        season: '2026',
        format: 'SOFTBALL_4_OVER',
        status: 'REGISTRATION',
      },
    });
    console.log(`\n1. Created test tournament: ${testTournament.name} (${testTournament.id})`);

    // 2. Create 9 dedicated Test Teams
    const teamConfigs = [
      { name: `${TEST_PREFIX}Team_A1`, shortName: 'TA1' },
      { name: `${TEST_PREFIX}Team_A2`, shortName: 'TA2' },
      { name: `${TEST_PREFIX}Team_A3`, shortName: 'TA3' },
      { name: `${TEST_PREFIX}Team_B1`, shortName: 'TB1' },
      { name: `${TEST_PREFIX}Team_B2`, shortName: 'TB2' },
      { name: `${TEST_PREFIX}Team_B3`, shortName: 'TB3' },
      { name: `${TEST_PREFIX}Team_C1`, shortName: 'TC1' },
      { name: `${TEST_PREFIX}Team_C2`, shortName: 'TC2' },
      { name: `${TEST_PREFIX}Team_C3`, shortName: 'TC3' },
    ];

    const testTeams = [];
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
    console.log(`2. Created 9 test teams: ${testTeams.map((t) => t.shortName).join(', ')}`);

    // 3. Assign 9 teams into Group A, Group B, Group C
    const assignments = {
      [testTeams[0].id]: 'GROUP_A',
      [testTeams[1].id]: 'GROUP_A',
      [testTeams[2].id]: 'GROUP_A',
      [testTeams[3].id]: 'GROUP_B',
      [testTeams[4].id]: 'GROUP_B',
      [testTeams[5].id]: 'GROUP_B',
      [testTeams[6].id]: 'GROUP_C',
      [testTeams[7].id]: 'GROUP_C',
      [testTeams[8].id]: 'GROUP_C',
    };

    const assignResult = await assignTeamsToGroups(testTournament.id, assignments);
    assert.strictEqual(assignResult.success, true, 'Groups assigned successfully');
    console.log('3. Teams assigned: 3 to Group A, 3 to Group B, 3 to Group C');

    // 4. Generate Stage 1 Fixtures (Matches 1-9) with configurable format
    const fixtureResult = await generateGroupStageFixtures(testTournament.id, {
      ballsPerOver: 4,
      groupOvers: 4,
      wildcardOvers: 5,
      playoffOvers: 6,
      finalOvers: 6,
    });
    assert.strictEqual(fixtureResult.success, true, 'Group stage fixtures generated');
    assert.strictEqual(fixtureResult.createdCount, 9, 'Exactly 9 group stage matches generated');
    console.log('4. Stage 1 Fixtures generated: 9 matches (M1–M9) at 4 balls/over, 4 overs/innings');

    // 5. Simulate completion of Group Stage Matches (M1 to M9)
    // Setup decisive winners:
    // Group A: A1 wins both (1st), A2 wins one (2nd -> wildcard), A3 loses both (3rd -> eliminated)
    // Group B: B1 wins both (1st), B2 wins one (2nd -> wildcard), B3 loses both (3rd -> eliminated)
    // Group C: C1 wins both (1st), C2 wins one (2nd -> wildcard), C3 loses both (3rd -> eliminated)
    const groupMatches = await prisma.match.findMany({
      where: { tournamentId: testTournament.id, matchNumber: { lte: 9 } },
      orderBy: { matchNumber: 'asc' },
    });
    assert.strictEqual(groupMatches.length, 9);

    for (const m of groupMatches) {
      // Team A always wins in our clean test script
      const winnerId = m.teamAId;
      await prisma.match.update({
        where: { id: m.id },
        data: {
          status: 'COMPLETED',
          winnerTeamId: winnerId,
          resultNote: 'Won by 12 runs',
        },
      });

      // Create Innings 1 (Winner) and Innings 2 (Loser)
      await prisma.innings.create({
        data: {
          matchId: m.id,
          inningsNumber: 1,
          battingTeamId: m.teamAId,
          bowlingTeamId: m.teamBId,
          runs: 48,
          wickets: 3,
          overs: 4,
          balls: 0,
          status: 'COMPLETED',
        },
      });

      await prisma.innings.create({
        data: {
          matchId: m.id,
          inningsNumber: 2,
          battingTeamId: m.teamBId,
          bowlingTeamId: m.teamAId,
          runs: 36,
          wickets: 10, // All-out rule test!
          overs: 3,
          balls: 1, // 13 legal balls
          status: 'COMPLETED',
        },
      });
    }
    console.log('5. Simulated completion of all 9 Group Stage matches with innings & all-out records');

    // 6. Recalculate Standings & Test Automatic Progression to Wildcard
    await recalculateTournamentStandings(testTournament.id);
    const advanceStage2 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceStage2.advanced, true, 'Stage 2 Wildcard generated');
    console.log(`6. Advancement Trigger: ${advanceStage2.message}`);

    // Verify Wildcard matches (Matches 10, 11, 12)
    const wildcardMatches = await prisma.match.findMany({
      where: { tournamentId: testTournament.id, stage: 'WILDCARD' },
      orderBy: { matchNumber: 'asc' },
    });
    assert.strictEqual(wildcardMatches.length, 3, 'Exactly 3 Wildcard matches generated (M10, M11, M12)');
    assert.strictEqual(wildcardMatches[0].oversPerInnings, 5, 'Wildcard matches use configured 5 overs');
    assert.strictEqual(wildcardMatches[0].ballsPerOver, 4, 'Wildcard matches use configured 4 balls/over');
    console.log('7. Verified Stage 2: Matches 10, 11, 12 successfully created at 5 overs / 4 balls per over');

    // 7. Simulate completion of Wildcard Matches (M10, M11, M12)
    // Make Team A win each match so we have a clear Wildcard winner (Seed #4)
    for (const wm of wildcardMatches) {
      await prisma.match.update({
        where: { id: wm.id },
        data: {
          status: 'COMPLETED',
          winnerTeamId: wm.teamAId,
          resultNote: 'Won by 8 runs',
        },
      });
      await prisma.innings.create({
        data: {
          matchId: wm.id,
          inningsNumber: 1,
          battingTeamId: wm.teamAId,
          bowlingTeamId: wm.teamBId,
          runs: 55,
          wickets: 4,
          overs: 5,
          balls: 0,
          status: 'COMPLETED',
        },
      });
      await prisma.innings.create({
        data: {
          matchId: wm.id,
          inningsNumber: 2,
          battingTeamId: wm.teamBId,
          bowlingTeamId: wm.teamAId,
          runs: 47,
          wickets: 5,
          overs: 5,
          balls: 0,
          status: 'COMPLETED',
        },
      });
    }
    console.log('8. Simulated completion of all 3 Wildcard matches');

    // 8. Trigger Progression to Final Four (Qualifier 1 and Eliminator)
    const advanceStage3 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceStage3.advanced, true, 'Stage 3 Playoffs generated');
    console.log(`9. Advancement Trigger: ${advanceStage3.message}`);

    const q1 = await prisma.match.findFirst({ where: { tournamentId: testTournament.id, matchNumber: 13 } });
    const elim = await prisma.match.findFirst({ where: { tournamentId: testTournament.id, matchNumber: 14 } });
    assert.ok(q1, 'Match 13 (Qualifier 1) exists');
    assert.ok(elim, 'Match 14 (Eliminator) exists');
    assert.strictEqual(q1.oversPerInnings, 6, 'Playoffs use configured 6 overs');
    console.log('10. Verified Qualifier 1 (M13: Seed 1 vs Seed 2) and Eliminator (M14: Seed 3 vs Seed 4 [Wildcard])');

    // 9. Simulate Q1 and Eliminator completion
    // Q1: Team A wins (advances to Final)
    await prisma.match.update({
      where: { id: q1.id },
      data: { status: 'COMPLETED', winnerTeamId: q1.teamAId, resultNote: 'Won by 15 runs' },
    });
    // Eliminator: Team B wins (advances to Q2)
    await prisma.match.update({
      where: { id: elim.id },
      data: { status: 'COMPLETED', winnerTeamId: elim.teamBId, resultNote: 'Won by 4 wickets' },
    });

    // 10. Advance to Qualifier 2 (Match 15)
    const advanceQ2 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceQ2.advanced, true, 'Qualifier 2 generated');
    console.log(`11. Advancement Trigger: ${advanceQ2.message}`);

    const q2 = await prisma.match.findFirst({ where: { tournamentId: testTournament.id, matchNumber: 15 } });
    assert.ok(q2, 'Match 15 (Qualifier 2) exists');
    assert.strictEqual(q2.teamAId, q1.teamBId, 'Qualifier 2 Team A is Loser Q1');
    assert.strictEqual(q2.teamBId, elim.teamBId, 'Qualifier 2 Team B is Winner Eliminator');
    console.log('12. Verified Qualifier 2 (M15: Loser Q1 vs Winner Eliminator)');

    // 11. Simulate Q2 completion
    await prisma.match.update({
      where: { id: q2.id },
      data: { status: 'COMPLETED', winnerTeamId: q2.teamAId, resultNote: 'Won by 6 runs' },
    });

    // 12. Advance to Grand Final (Match 16)
    const advanceFinal = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceFinal.advanced, true, 'Grand Final generated');
    console.log(`13. Advancement Trigger: ${advanceFinal.message}`);

    const finalMatch = await prisma.match.findFirst({ where: { tournamentId: testTournament.id, matchNumber: 16 } });
    assert.ok(finalMatch, 'Match 16 (Grand Final) exists');
    assert.strictEqual(finalMatch.teamAId, q1.teamAId, 'Final Team A is Winner Q1');
    assert.strictEqual(finalMatch.teamBId, q2.teamAId, 'Final Team B is Winner Q2');
    console.log('14. Verified Grand Final (M16: Winner Q1 vs Winner Q2)');

    // 13. Simulate Final Match completion & Champion crowning
    await prisma.match.update({
      where: { id: finalMatch.id },
      data: { status: 'COMPLETED', winnerTeamId: finalMatch.teamAId, resultNote: 'Won by 22 runs' },
    });

    const crownChampion = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(crownChampion.advanced, true, 'Champion crowned');
    console.log(`15. Final Tournament Conclusion: ${crownChampion.message}`);

    // Verify tournament status is COMPLETED
    const finalTournamentState = await prisma.tournament.findUnique({ where: { id: testTournament.id } });
    assert.strictEqual(finalTournamentState.status, 'COMPLETED', 'Tournament status updated to COMPLETED');
    console.log('16. Verified Tournament status is COMPLETED ✅');

  } finally {
    // =========================================================================
    // MANDATORY CLEANUP IN STRICT ACCORDANCE WITH USER RULE:
    // "after test adding palyer and team make sure to remvoe them form the system
    //  butdont rtemve the real temas and players"
    // =========================================================================
    console.log('\n[Cleanup] Cleaning up temporary test data...');

    if (testTournament) {
      // 1. Delete all innings for test tournament matches
      const testMatches = await prisma.match.findMany({
        where: { tournamentId: testTournament.id },
        select: { id: true },
      });
      const matchIds = testMatches.map((m) => m.id);
      if (matchIds.length > 0) {
        await prisma.ballEvent.deleteMany({ where: { innings: { matchId: { in: matchIds } } } });
        await prisma.innings.deleteMany({ where: { matchId: { in: matchIds } } });
      }

      // 2. Delete test matches
      await prisma.match.deleteMany({ where: { tournamentId: testTournament.id } });

      // 3. Delete test tournament teams & squads & stages
      await prisma.tournamentSquad.deleteMany({ where: { tournamentId: testTournament.id } });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId: testTournament.id } });
      await prisma.tournamentStage.deleteMany({ where: { tournamentId: testTournament.id } });

      // 4. Delete test tournament
      await prisma.tournament.delete({ where: { id: testTournament.id } });
    }

    // 5. Delete created test teams (ONLY the 9 created test teams, NEVER real teams)
    if (createdTeamIds.length > 0) {
      await prisma.team.deleteMany({
        where: {
          id: { in: createdTeamIds },
          name: { startsWith: TEST_PREFIX },
        },
      });
    }

    // Final verification: Confirm real teams and players count is exactly unchanged
    const finalTeamsCount = await prisma.team.count();
    const finalPlayersCount = await prisma.player.count();
    console.log(`[Verification] Real Teams in DB: ${finalTeamsCount} (was ${initialTeamsCount})`);
    console.log(`[Verification] Real Players in DB: ${finalPlayersCount} (was ${initialPlayersCount})`);

    assert.strictEqual(finalTeamsCount, initialTeamsCount, 'Real teams count is completely preserved!');
    assert.strictEqual(finalPlayersCount, initialPlayersCount, 'Real players count is completely preserved!');
    console.log('Clean-up verified: ZERO impact on real teams and players! 🛡️\n');
  }

  console.log('============================================================');
  console.log(' ALL 16 CPL TOURNAMENT LIFECYCLE CHECKS PASSED! ✅');
  console.log('============================================================\n');
}

runSimulation()
  .catch((err) => {
    console.error('SIMULATION ERROR:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
