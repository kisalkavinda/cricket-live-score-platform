/**
 * CPL 8-TEAM OFFICIAL TOURNAMENT FULL 15-MATCH LIFECYCLE SIMULATION TEST
 * 
 * Rules verified:
 * 1. 8 teams divided into Group A and Group B (4 teams each: A1-A4, B1-B4).
 * 2. Stage 1: Group Stage (M1-M8 square format). Each team plays exactly 2 matches.
 *    No Group C matches. Group winners -> Playoff Seed 1 & 2.
 * 3. Group 4th place teams eliminated.
 * 4. Stage 2: Playoff Qualification (Matches 9, 10, 11).
 *    M9: A 2nd vs B 2nd (Winner -> Seed 3, Loser -> M11).
 *    M10: A 3rd vs B 3rd (Winner -> M11, Loser -> Eliminated).
 *    M11: M9 Loser vs M10 Winner (Winner -> Seed 4, Loser -> Eliminated).
 * 5. Stage 3: Four-Team Playoff (Matches 12, 13, 14).
 *    M12: Seed 1 vs Seed 2 (Winner -> Grand Final M15, Loser -> M14).
 *    M13: Seed 3 vs Seed 4 (Winner -> M14, Loser -> Eliminated).
 *    M14: M12 Loser vs M13 Winner (Winner -> Grand Final M15, Loser -> Eliminated).
 * 6. Stage 4: Grand Final (Match 15: M12 Winner vs M14 Winner) -> Champion and Runner-up declared.
 * 7. Exact total matches: TOTAL MATCHES === 15.
 * 
 * CLEANUP RULE:
 * Temporary test teams and records are prefixed with "TEST_CPL8_" and completely deleted in finally block.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { prisma } from 'database';
import {
  assignTeamsToGroups,
  generateGroupStageFixtures,
  checkAndAdvanceTournament,
  recalculateTournamentStandings,
  getTournamentOverview,
} from '../lib/tournament/tournament-service';

const TEST_PREFIX = 'TEST_CPL8_';

async function run8TeamSimulation() {
  console.log('\n============================================================');
  console.log(' CPL 8-TEAM TOURNAMENT FULL 15-MATCH LIFECYCLE SIMULATION');
  console.log('============================================================\n');

  // Baseline check: Record initial real teams and players count with retry for pooler handshakes
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

    // 2. Create 8 dedicated Test Teams (4 for Group A, 4 for Group B)
    const teamConfigs = [
      { name: `${TEST_PREFIX}Titans_A1`, shortName: 'TA1' },
      { name: `${TEST_PREFIX}Warriors_A2`, shortName: 'TA2' },
      { name: `${TEST_PREFIX}Knights_A3`, shortName: 'TA3' },
      { name: `${TEST_PREFIX}Strikers_A4`, shortName: 'TA4' },
      { name: `${TEST_PREFIX}Royals_B1`, shortName: 'TB1' },
      { name: `${TEST_PREFIX}Kings_B2`, shortName: 'TB2' },
      { name: `${TEST_PREFIX}Hawks_B3`, shortName: 'TB3' },
      { name: `${TEST_PREFIX}Lions_B4`, shortName: 'TB4' },
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
    assert.strictEqual(testTeams.length, 8, 'Exactly 8 test teams created');
    console.log(`2. Created 8 test teams: ${testTeams.map((t) => t.shortName).join(', ')}`);

    // 3. Assign 8 teams into Group A (A1..A4) and Group B (B1..B4)
    const assignments: Record<string, 'GROUP_A' | 'GROUP_B'> = {
      [testTeams[0].id]: 'GROUP_A',
      [testTeams[1].id]: 'GROUP_A',
      [testTeams[2].id]: 'GROUP_A',
      [testTeams[3].id]: 'GROUP_A',
      [testTeams[4].id]: 'GROUP_B',
      [testTeams[5].id]: 'GROUP_B',
      [testTeams[6].id]: 'GROUP_B',
      [testTeams[7].id]: 'GROUP_B',
    };
    const positions: Record<string, number> = {
      [testTeams[0].id]: 1,
      [testTeams[1].id]: 2,
      [testTeams[2].id]: 3,
      [testTeams[3].id]: 4,
      [testTeams[4].id]: 1,
      [testTeams[5].id]: 2,
      [testTeams[6].id]: 3,
      [testTeams[7].id]: 4,
    };

    const assignResult = await assignTeamsToGroups(testTournament.id, assignments, positions);
    assert.strictEqual(assignResult.success, true, '8 teams assigned successfully');
    console.log('3. Teams assigned: 4 to Group A (A1-A4), 4 to Group B (B1-B4)');

    // 4. Generate Stage 1 Fixtures (Matches 1-8 Square Schedule)
    const fixtureResult = await generateGroupStageFixtures(testTournament.id, {
      ballsPerOver: 4,
      groupOvers: 4,
      qualificationOvers: 5,
      playoffOvers: 6,
      finalOvers: 6,
    });
    assert.strictEqual(fixtureResult.success, true, 'Group stage fixtures generated');
    assert.strictEqual(fixtureResult.createdCount, 8, 'Exactly 8 group stage matches generated');
    console.log('4. Stage 1 Fixtures generated: exactly 8 matches (M1–M8: M1-M4 Group A, M5-M8 Group B)');

    // Verify each team plays exactly 2 matches
    const groupMatches = await prisma.match.findMany({
      where: { tournamentId: testTournament.id, stage: 'GROUP' },
      orderBy: { matchNumber: 'asc' },
    });
    assert.strictEqual(groupMatches.length, 8, 'Total group matches is 8');

    for (const team of testTeams) {
      const teamMatchCount = groupMatches.filter(
        (m: any) => m.teamAId === team.id || m.teamBId === team.id
      ).length;
      assert.strictEqual(
        teamMatchCount,
        2,
        `Team ${team.shortName} must play exactly 2 matches (played ${teamMatchCount})`
      );
    }
    console.log('   ✓ Verified: All 8 teams play exactly 2 group-stage matches');

    // Verify zero Group C matches
    const groupCMatches = groupMatches.filter((m: any) => m.groupName === 'GROUP_C');
    assert.strictEqual(groupCMatches.length, 0, 'Zero Group C matches exist');
    console.log('   ✓ Verified: Zero Group C matches exist');

    // 5. Complete Group Stage Matches (M1-M8)
    // Desired standings:
    // Group A:
    // A1 (Titans): 2 wins (1st -> Seed 1 or 2)
    // A2 (Warriors): 1 win, high NRR (2nd -> M9)
    // A3 (Knights): 1 win, lower NRR (3rd -> M10)
    // A4 (Strikers): 0 wins (4th -> Eliminated)
    //
    // Group B:
    // B1 (Royals): 2 wins (1st -> Seed 1 or 2)
    // B2 (Kings): 1 win, high NRR (2nd -> M9)
    // B3 (Hawks): 1 win, lower NRR (3rd -> M10)
    // B4 (Lions): 0 wins (4th -> Eliminated)
    for (const m of groupMatches) {
      // Determine winner based on match
      let winnerId = m.teamAId;
      let loserId = m.teamBId;

      // Group A matches:
      // M1: A1 vs A2 -> A1 wins (A1: 1W, A2: 1L)
      // M2: A2 vs A3 -> A2 wins (A2: 1W-1L, A3: 1L)
      // M3: A3 vs A4 -> A3 wins (A3: 1W-1L, A4: 1L)
      // M4: A4 vs A1 -> A1 wins (A4: 2L, A1: 2W)
      //
      // Group B matches:
      // M5: B1 vs B2 -> B1 wins
      // M6: B2 vs B3 -> B2 wins
      // M7: B3 vs B4 -> B3 wins
      // M8: B4 vs B1 -> B1 wins
      if (m.matchNumber === 1) { winnerId = testTeams[0].id; loserId = testTeams[1].id; }
      else if (m.matchNumber === 2) { winnerId = testTeams[1].id; loserId = testTeams[2].id; }
      else if (m.matchNumber === 3) { winnerId = testTeams[2].id; loserId = testTeams[3].id; }
      else if (m.matchNumber === 4) { winnerId = testTeams[0].id; loserId = testTeams[3].id; }
      else if (m.matchNumber === 5) { winnerId = testTeams[4].id; loserId = testTeams[5].id; }
      else if (m.matchNumber === 6) { winnerId = testTeams[5].id; loserId = testTeams[6].id; }
      else if (m.matchNumber === 7) { winnerId = testTeams[6].id; loserId = testTeams[7].id; }
      else if (m.matchNumber === 8) { winnerId = testTeams[4].id; loserId = testTeams[7].id; }

      await prisma.match.update({
        where: { id: m.id },
        data: {
          status: 'COMPLETED',
          winnerTeamId: winnerId,
          resultNote: 'Won by 14 runs',
        },
      });

      // Score recordings
      await prisma.innings.create({
        data: {
          matchId: m.id,
          inningsNumber: 1,
          battingTeamId: winnerId,
          bowlingTeamId: loserId,
          runs: winnerId === testTeams[0].id ? 52 : 44,
          wickets: 2,
          overs: 4,
          balls: 0,
          status: 'COMPLETED',
        },
      });

      await prisma.innings.create({
        data: {
          matchId: m.id,
          inningsNumber: 2,
          battingTeamId: loserId,
          bowlingTeamId: winnerId,
          runs: 34,
          wickets: 10, // All-out rule test
          overs: 3,
          balls: 2,
          status: 'COMPLETED',
        },
      });
    }
    console.log('5. Simulated completion of all 8 Group Stage matches (M1–M8)');

    // 6. Recalculate Standings & Trigger Advancement to QUALIFICATION
    await recalculateTournamentStandings(testTournament.id);
    const advanceStage2 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceStage2.advanced, true, 'Stage 2 Qualification generated');
    console.log(`6. Advancement Trigger: ${advanceStage2.message}`);

    // Verify M9 and M10
    const m9 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, bracketSlot: 'M9' },
    });
    const m10 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, bracketSlot: 'M10' },
    });

    assert.ok(m9, 'Match 9 (2nd vs 2nd) exists');
    assert.ok(m10, 'Match 10 (3rd vs 3rd) exists');
    assert.strictEqual(m9.matchNumber, 9, 'Match 9 has matchNumber 9');
    assert.strictEqual(m10.matchNumber, 10, 'Match 10 has matchNumber 10');
    assert.strictEqual(m9.stage, 'QUALIFICATION', 'M9 is in QUALIFICATION stage');
    assert.strictEqual(m10.stage, 'QUALIFICATION', 'M10 is in QUALIFICATION stage');

    // Authoritative group positions from standings engine
    const overviewAfterGroups = await getTournamentOverview(testTournament.id);
    const grpA2nd = overviewAfterGroups?.groups.groupA.standings[1].teamId;
    const grpB2nd = overviewAfterGroups?.groups.groupB.standings[1].teamId;
    const grpA3rd = overviewAfterGroups?.groups.groupA.standings[2].teamId;
    const grpB3rd = overviewAfterGroups?.groups.groupB.standings[2].teamId;
    const grpA4th = overviewAfterGroups?.groups.groupA.standings[3].teamId;
    const grpB4th = overviewAfterGroups?.groups.groupB.standings[3].teamId;

    // M9 must be Group A 2nd vs Group B 2nd
    const m9Teams = [m9.teamAId, m9.teamBId];
    assert.ok(m9Teams.includes(grpA2nd!), 'M9 includes Group A 2nd');
    assert.ok(m9Teams.includes(grpB2nd!), 'M9 includes Group B 2nd');

    // M10 must be Group A 3rd vs Group B 3rd
    const m10Teams = [m10.teamAId, m10.teamBId];
    assert.ok(m10Teams.includes(grpA3rd!), 'M10 includes Group A 3rd');
    assert.ok(m10Teams.includes(grpB3rd!), 'M10 includes Group B 3rd');

    // Verify 4th place teams are ELIMINATED
    const a4TT = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: grpA4th },
    });
    const b4TT = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: grpB4th },
    });
    assert.strictEqual(a4TT?.qualificationStatus, 'ELIMINATED', 'Group A 4th is ELIMINATED');
    assert.strictEqual(b4TT?.qualificationStatus, 'ELIMINATED', 'Group B 4th is ELIMINATED');
    console.log('   ✓ Verified M9 (2nd vs 2nd), M10 (3rd vs 3rd), and 4th place eliminations');

    // 7. Simulate M9 and M10
    // M9: Team A (TA2) wins -> advances to Seed 3. Team B (TB2) loses -> goes to M11 (second chance)
    await prisma.match.update({
      where: { id: m9.id },
      data: { status: 'COMPLETED', winnerTeamId: m9.teamAId, resultNote: 'Won by 8 runs' },
    });

    // M10: Team B (TB3) wins -> goes to M11. Team A (TA3) loses -> ELIMINATED
    await prisma.match.update({
      where: { id: m10.id },
      data: { status: 'COMPLETED', winnerTeamId: m10.teamBId, resultNote: 'Won by 3 wickets' },
    });

    // 8. Advance to Match 11 (Final Qualifier)
    const advanceM11 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceM11.advanced, true, 'Match 11 generated');
    console.log(`7. Advancement Trigger: ${advanceM11.message}`);

    const m11 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, bracketSlot: 'M11' },
    });
    assert.ok(m11, 'Match 11 exists');
    assert.strictEqual(m11.matchNumber, 11, 'Match 11 has matchNumber 11');
    assert.strictEqual(m11.teamAId, m9.teamBId, 'M11 Team A is Match 9 Loser');
    assert.strictEqual(m11.teamBId, m10.teamBId, 'M11 Team B is Match 10 Winner');

    // Verify M10 loser is ELIMINATED
    const m10LoserTT = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: m10.teamAId },
    });
    assert.strictEqual(m10LoserTT?.qualificationStatus, 'ELIMINATED', 'M10 Loser is ELIMINATED');
    console.log('   ✓ Verified M11 (M9 Loser vs M10 Winner) & M10 Loser elimination');

    // 9. Simulate M11 completion
    // M11: Team A (M9 Loser TB2) wins -> becomes Seed 4. Team B (M10 Winner TB3) loses -> ELIMINATED
    await prisma.match.update({
      where: { id: m11.id },
      data: { status: 'COMPLETED', winnerTeamId: m11.teamAId, resultNote: 'Won by 10 runs' },
    });

    // 10. Advance to Four-Team Playoff (Matches 12 & 13)
    const advancePlayoffs = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advancePlayoffs.advanced, true, 'Playoffs generated');
    console.log(`8. Advancement Trigger: ${advancePlayoffs.message}`);

    const m12 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, bracketSlot: 'M12' },
    });
    const m13 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, bracketSlot: 'M13' },
    });
    assert.ok(m12, 'Match 12 (1st vs 2nd) exists');
    assert.ok(m13, 'Match 13 (3rd vs 4th) exists');
    assert.strictEqual(m12.matchNumber, 12, 'Match 12 has matchNumber 12');
    assert.strictEqual(m13.matchNumber, 13, 'Match 13 has matchNumber 13');
    assert.strictEqual(m12.stage, 'PLAYOFFS', 'M12 is PLAYOFFS stage');
    assert.strictEqual(m13.stage, 'PLAYOFFS', 'M13 is PLAYOFFS stage');

    // M12 is Seed 1 vs Seed 2 (TA1 and TB1)
    const m12Teams = [m12.teamAId, m12.teamBId];
    assert.ok(m12Teams.includes(testTeams[0].id), 'M12 contains Group A winner');
    assert.ok(m12Teams.includes(testTeams[4].id), 'M12 contains Group B winner');

    // M13 is Seed 3 (M9 winner) vs Seed 4 (M11 winner)
    assert.strictEqual(m13.teamAId, m9.teamAId, 'M13 Team A is Seed 3 (M9 Winner)');
    assert.strictEqual(m13.teamBId, m11.teamAId, 'M13 Team B is Seed 4 (M11 Winner)');

    // Verify M11 loser is ELIMINATED
    const m11LoserTT = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: m11.teamBId },
    });
    assert.strictEqual(m11LoserTT?.qualificationStatus, 'ELIMINATED', 'M11 Loser is ELIMINATED');
    console.log('   ✓ Verified M12 (Seed 1 vs 2), M13 (Seed 3 vs 4), and M11 Loser elimination');

    // 11. Simulate M12 and M13 completion
    // M12: Team A wins -> directly to Grand Final (M15). Team B loses -> Match 14.
    await prisma.match.update({
      where: { id: m12.id },
      data: { status: 'COMPLETED', winnerTeamId: m12.teamAId, resultNote: 'Won by 18 runs' },
    });

    // M13: Team B wins -> Match 14. Team A loses -> ELIMINATED.
    await prisma.match.update({
      where: { id: m13.id },
      data: { status: 'COMPLETED', winnerTeamId: m13.teamBId, resultNote: 'Won by 2 wickets' },
    });

    // 12. Advance to Match 14 (Final Qualifier)
    const advanceM14 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceM14.advanced, true, 'Match 14 generated');
    console.log(`9. Advancement Trigger: ${advanceM14.message}`);

    const m14 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, bracketSlot: 'M14' },
    });
    assert.ok(m14, 'Match 14 exists');
    assert.strictEqual(m14.matchNumber, 14, 'Match 14 has matchNumber 14');
    assert.strictEqual(m14.teamAId, m12.teamBId, 'M14 Team A is M12 Loser');
    assert.strictEqual(m14.teamBId, m13.teamBId, 'M14 Team B is M13 Winner');

    // Verify M13 loser is ELIMINATED
    const m13LoserTT = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: m13.teamAId },
    });
    assert.strictEqual(m13LoserTT?.qualificationStatus, 'ELIMINATED', 'M13 Loser is ELIMINATED');
    console.log('   ✓ Verified M14 (M12 Loser vs M13 Winner) and M13 Loser elimination');

    // 13. Simulate M14 completion
    // M14: Team A (M12 Loser) wins -> advances to Grand Final. Team B loses -> ELIMINATED.
    await prisma.match.update({
      where: { id: m14.id },
      data: { status: 'COMPLETED', winnerTeamId: m14.teamAId, resultNote: 'Won by 5 runs' },
    });

    // 14. Advance to Grand Final (Match 15)
    const advanceFinal = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceFinal.advanced, true, 'Grand Final generated');
    console.log(`10. Advancement Trigger: ${advanceFinal.message}`);

    const m15 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, bracketSlot: 'M15' },
    });
    assert.ok(m15, 'Match 15 exists');
    assert.strictEqual(m15.matchNumber, 15, 'Match 15 has matchNumber 15');
    assert.strictEqual(m15.stage, 'FINAL', 'M15 is FINAL stage');
    assert.strictEqual(m15.teamAId, m12.teamAId, 'M15 Team A is M12 Winner');
    assert.strictEqual(m15.teamBId, m14.teamAId, 'M15 Team B is M14 Winner');

    // Verify M14 loser is ELIMINATED
    const m14LoserTT = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: m14.teamBId },
    });
    assert.strictEqual(m14LoserTT?.qualificationStatus, 'ELIMINATED', 'M14 Loser is ELIMINATED');
    console.log('   ✓ Verified Grand Final M15 (M12 Winner vs M14 Winner) and M14 Loser elimination');

    // 15. Simulate M15 Grand Final completion
    // M15: Team A wins -> Champion! Team B loses -> Runner-up.
    await prisma.match.update({
      where: { id: m15.id },
      data: { status: 'COMPLETED', winnerTeamId: m15.teamAId, resultNote: 'Won by 25 runs' },
    });

    const crownChampion = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(crownChampion.advanced, true, 'Champion crowned');
    console.log(`11. Champion Trigger: ${crownChampion.message}`);

    // Verify Champion and Runner-up statuses
    const champTT = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: m15.teamAId },
    });
    const runnerUpTT = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: m15.teamBId },
    });
    assert.strictEqual(champTT?.qualificationStatus, 'CHAMPION', 'Winner is crowned CHAMPION');
    assert.strictEqual(runnerUpTT?.qualificationStatus, 'RUNNER_UP', 'Loser is marked RUNNER_UP');

    // Verify tournament status is COMPLETED
    const finalTournamentState = await prisma.tournament.findUnique({
      where: { id: testTournament.id },
    });
    assert.strictEqual(finalTournamentState?.status, 'COMPLETED', 'Tournament status is COMPLETED');
    console.log('12. Verified Champion, Runner-up, and COMPLETED tournament status');

    // 16. Assert TOTAL MATCH COUNT === 15
    const allMatches = await prisma.match.findMany({
      where: { tournamentId: testTournament.id },
      orderBy: { matchNumber: 'asc' },
    });
    console.log(`13. Total Tournament Matches Created: ${allMatches.length}`);
    assert.strictEqual(allMatches.length, 15, 'CRITICAL ACCEPTANCE CRITERIA: TOTAL MATCHES === 15');
    console.log('   ✓ ASSERTION PASSED: TOTAL MATCHES === 15 EXACTLY! 🎯');

    // Verify full overview payload
    const overview = await getTournamentOverview(testTournament.id);
    assert.ok(overview, 'Tournament overview loads');
    assert.strictEqual(overview.progress.totalMatches, 15, 'Overview reports 15 total matches');
    assert.strictEqual(overview.progress.completedMatches, 15, 'Overview reports 15 completed matches');
    assert.strictEqual(overview.progress.currentStage, 'COMPLETED', 'Overview current stage is COMPLETED');
    console.log('14. Verified getTournamentOverview consistency');

  } finally {
    // =========================================================================
    // MANDATORY CLEANUP IN STRICT ACCORDANCE WITH USER RULE:
    // "after test adding palyer and team make sure to remvoe them form the system
    //  butdont rtemve the real temas and players"
    // =========================================================================
    console.log('\n[Cleanup] Cleaning up temporary test data...');

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
  console.log(' ALL 8-TEAM CPL TOURNAMENT LIFECYCLE CHECKS PASSED! ✅');
  console.log('============================================================\n');
}

run8TeamSimulation()
  .catch((err) => {
    console.error('SIMULATION ERROR:', err);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
