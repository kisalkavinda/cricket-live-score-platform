/**
 * CPL 8-TEAM OFFICIAL TOURNAMENT FULL 16-MATCH LIFECYCLE SIMULATION TEST
 *
 * Requirements & Rules verified (All 22 criteria):
 * 1. Accept exactly 8 teams
 * 2. Assign 4 in Group A, 4 in Group B
 * 3. Group A generates exactly 6 matches (M1–M6)
 * 4. Group B generates exactly 6 matches (M7–M12)
 * 5. Every team plays exactly 3 group matches
 * 6. Every pairing within each group occurs exactly once (full round-robin)
 * 7. Zero cross-group group matches
 * 8. Group standings calculated accurately (Points -> NRR)
 * 9. Top 2 from Group A and Group B qualify
 * 10. Bottom 2 from Group A and Group B are eliminated
 * 11. All 4 qualified teams ranked globally by Points -> NRR into Seeds 1–4
 * 12. Seed 1 vs Seed 2 created for P1 (Match 13)
 * 13. Seed 3 vs Seed 4 created for P2 (Match 14)
 * 14. P1 winner advances directly to Grand Final (Match 16)
 * 15. P1 loser advances to P3 (Match 15)
 * 16. P2 winner advances to P3 (Match 15)
 * 17. P2 loser is eliminated
 * 18. P3 winner advances to Grand Final (Match 16)
 * 19. P3 loser is eliminated
 * 20. Grand Final is P1 Winner vs P3 Winner
 * 21. Champion and Runner-up are declared and assigned
 * 22. Exactly 16 matches exist at tournament completion.
 *
 * MANDATORY CLEANUP:
 * Test teams/tournament are prefixed with "TEST_CPL8_" and cleaned up completely in finally block.
 * Real teams and players count is verified before and after.
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

const TEST_PREFIX = 'TEST_CPL8_';

async function run8TeamSimulation() {
  console.log('\n============================================================');
  console.log(' CPL 8-TEAM TOURNAMENT FULL 16-MATCH LIFECYCLE SIMULATION');
  console.log('============================================================\n');

  // Baseline check: Record initial real teams and players count
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
    // 1. Create a dedicated Test Tournament with 8_TEAM format
    testTournament = await prisma.tournament.create({
      data: {
        name: `${TEST_PREFIX}CHAMPIONSHIP_2026`,
        season: '2026',
        format: 'SOFTBALL_4_OVER',
        tournamentFormat: '8_TEAM',
        status: 'REGISTRATION',
      },
    });
    console.log(`1. Created test tournament: ${testTournament.name} (${testTournament.id})`);

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
    // Assertion 1: Accept exactly 8 teams
    assert.strictEqual(testTeams.length, 8, 'Criterion 1: Exactly 8 test teams created');
    console.log(`   ✓ Criterion 1 Passed: Exactly 8 teams accepted: ${testTeams.map((t) => t.shortName).join(', ')}`);

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

    // Assertion 2: Assign 4 in Group A, 4 in Group B
    const ttRecords = await prisma.tournamentTeam.findMany({
      where: { tournamentId: testTournament.id },
    });
    const ttGroupA = ttRecords.filter((t: any) => t.groupName === 'GROUP_A');
    const ttGroupB = ttRecords.filter((t: any) => t.groupName === 'GROUP_B');
    assert.strictEqual(ttGroupA.length, 4, 'Criterion 2: Group A has exactly 4 teams');
    assert.strictEqual(ttGroupB.length, 4, 'Criterion 2: Group B has exactly 4 teams');
    console.log('   ✓ Criterion 2 Passed: Assigned exactly 4 teams in Group A and 4 in Group B');

    // 4. Generate Group Stage Fixtures (M1–M12)
    const fixtureResult = await generateGroupStageFixtures(testTournament.id, {
      ballsPerOver: 1,
      groupOvers: 1,
      playoffOvers: 1,
      finalOvers: 1,
    });
    assert.strictEqual(fixtureResult.success, true, 'Group stage fixtures generated');
    assert.strictEqual(fixtureResult.createdCount, 12, 'Fixture generator created 12 matches');

    const groupMatches = await prisma.match.findMany({
      where: { tournamentId: testTournament.id, stage: 'GROUP' },
      orderBy: { matchNumber: 'asc' },
    });

    // Assertion 3: Group A generates exactly 6 matches
    const groupAMatches = groupMatches.filter((m: any) => m.groupName === 'GROUP_A');
    assert.strictEqual(groupAMatches.length, 6, 'Criterion 3: Group A generates exactly 6 matches');
    assert.deepStrictEqual(
      groupAMatches.map((m: any) => m.matchNumber),
      [1, 2, 3, 4, 5, 6],
      'Group A matches numbered M1–M6'
    );
    console.log('   ✓ Criterion 3 Passed: Group A generates exactly 6 matches (M1–M6)');

    // Assertion 4: Group B generates exactly 6 matches
    const groupBMatches = groupMatches.filter((m: any) => m.groupName === 'GROUP_B');
    assert.strictEqual(groupBMatches.length, 6, 'Criterion 4: Group B generates exactly 6 matches');
    assert.deepStrictEqual(
      groupBMatches.map((m: any) => m.matchNumber),
      [7, 8, 9, 10, 11, 12],
      'Group B matches numbered M7–M12'
    );
    console.log('   ✓ Criterion 4 Passed: Group B generates exactly 6 matches (M7–M12)');

    // Assertion 5: Every team plays exactly 3 group matches
    for (const team of testTeams) {
      const teamMatchCount = groupMatches.filter(
        (m: any) => m.teamAId === team.id || m.teamBId === team.id
      ).length;
      assert.strictEqual(
        teamMatchCount,
        3,
        `Criterion 5: Team ${team.shortName} must play exactly 3 group matches (played ${teamMatchCount})`
      );
    }
    console.log('   ✓ Criterion 5 Passed: Every team plays exactly 3 group matches');

    // Assertion 6: Every pairing within each group occurs exactly once (Full round-robin)
    const checkGroupPairings = (groupTeamIds: string[], matches: any[]) => {
      const pairings = new Set<string>();
      for (let i = 0; i < groupTeamIds.length; i++) {
        for (let j = i + 1; j < groupTeamIds.length; j++) {
          const key = [groupTeamIds[i], groupTeamIds[j]].sort().join('_vs_');
          pairings.add(key);
        }
      }
      assert.strictEqual(pairings.size, 6, 'Expected 6 unique pairings');

      const foundPairings = new Set<string>();
      for (const m of matches) {
        const key = [m.teamAId, m.teamBId].sort().join('_vs_');
        assert.ok(pairings.has(key), `Pairing ${key} is a valid intra-group pairing`);
        assert.ok(!foundPairings.has(key), `Pairing ${key} must not be duplicated`);
        foundPairings.add(key);
      }
      assert.strictEqual(foundPairings.size, 6, 'All 6 unique pairings occur exactly once');
    };

    checkGroupPairings(
      testTeams.slice(0, 4).map((t) => t.id),
      groupAMatches
    );
    checkGroupPairings(
      testTeams.slice(4, 8).map((t) => t.id),
      groupBMatches
    );
    console.log('   ✓ Criterion 6 Passed: Every pairing within each group occurs exactly once (full round-robin)');

    // Assertion 7: Zero cross-group group matches
    const groupATeamIdSet = new Set(testTeams.slice(0, 4).map((t) => t.id));
    const groupBTeamIdSet = new Set(testTeams.slice(4, 8).map((t) => t.id));
    for (const m of groupMatches) {
      const aInA = groupATeamIdSet.has(m.teamAId);
      const bInA = groupATeamIdSet.has(m.teamBId);
      const aInB = groupBTeamIdSet.has(m.teamAId);
      const bInB = groupBTeamIdSet.has(m.teamBId);

      if (m.groupName === 'GROUP_A') {
        assert.ok(aInA && bInA, `Match ${m.matchNumber} has only Group A teams`);
      } else if (m.groupName === 'GROUP_B') {
        assert.ok(aInB && bInB, `Match ${m.matchNumber} has only Group B teams`);
      }
    }
    console.log('   ✓ Criterion 7 Passed: Zero cross-group group matches exist');

    // 5. Simulate completion of all 12 Group Stage matches (M1–M12)
    // Results designed for clear standings and NRR:
    // Group A:
    // M1: A1 vs A2 -> A1 wins (A1: 60/1, A2: 30/1)
    // M2: A1 vs A3 -> A1 wins (A1: 60/1, A3: 30/1)
    // M3: A1 vs A4 -> A1 wins (A1: 60/1, A4: 30/1)
    // M4: A2 vs A3 -> A2 wins (A2: 50/1, A3: 35/1)
    // M5: A2 vs A4 -> A2 wins (A2: 50/1, A4: 35/1)
    // M6: A3 vs A4 -> A3 wins (A3: 40/1, A4: 35/1)
    // Standings Group A:
    // A1: 3W-0L, 6 pts (1st)
    // A2: 2W-1L, 4 pts (2nd)
    // A3: 1W-2L, 2 pts (3rd)
    // A4: 0W-3L, 0 pts (4th)
    //
    // Group B:
    // M7: B1 vs B2 -> B1 wins (B1: 55/1, B2: 32/1)
    // M8: B1 vs B3 -> B1 wins (B1: 55/1, B3: 32/1)
    // M9: B1 vs B4 -> B1 wins (B1: 55/1, B4: 32/1)
    // M10: B2 vs B3 -> B2 wins (B2: 45/1, B3: 36/1)
    // M11: B2 vs B4 -> B2 wins (B2: 45/1, B4: 36/1)
    // M12: B3 vs B4 -> B3 wins (B3: 40/1, B4: 36/1)
    // Standings Group B:
    // B1: 3W-0L, 6 pts (1st) (NRR lower than A1 because 55 vs 60 runs)
    // B2: 2W-1L, 4 pts (2nd) (NRR lower than A2 because 45 vs 50 runs)
    // B3: 1W-2L, 2 pts (3rd)
    // B4: 0W-3L, 0 pts (4th)

    // Priority rankings:
    // Group A: testTeams[0] (A1) > testTeams[1] (A2) > testTeams[2] (A3) > testTeams[3] (A4)
    // Group B: testTeams[4] (B1) > testTeams[5] (B2) > testTeams[6] (B3) > testTeams[7] (B4)
    const teamRank = new Map<string, number>([
      [testTeams[0].id, 1],
      [testTeams[1].id, 2],
      [testTeams[2].id, 3],
      [testTeams[3].id, 4],
      [testTeams[4].id, 1],
      [testTeams[5].id, 2],
      [testTeams[6].id, 3],
      [testTeams[7].id, 4],
    ]);

    for (const m of groupMatches) {
      const rankA = teamRank.get(m.teamAId) || 99;
      const rankB = teamRank.get(m.teamBId) || 99;
      const winnerId = rankA < rankB ? m.teamAId : m.teamBId;
      const loserId = rankA < rankB ? m.teamBId : m.teamAId;

      let winnerRuns = 50;
      let loserRuns = 35;
      if (winnerId === testTeams[0].id) { winnerRuns = 60; loserRuns = 30; }
      else if (winnerId === testTeams[4].id) { winnerRuns = 55; loserRuns = 32; }
      else if (winnerId === testTeams[1].id) { winnerRuns = 50; loserRuns = 35; }
      else if (winnerId === testTeams[5].id) { winnerRuns = 45; loserRuns = 36; }
      else if (winnerId === testTeams[2].id) { winnerRuns = 40; loserRuns = 35; }
      else if (winnerId === testTeams[6].id) { winnerRuns = 40; loserRuns = 36; }

      await prisma.match.update({
        where: { id: m.id },
        data: {
          status: 'COMPLETED',
          winnerTeamId: winnerId,
          resultNote: `Won by ${winnerRuns - loserRuns} runs`,
        },
      });

      await prisma.innings.createMany({
        data: [
          {
            matchId: m.id,
            inningsNumber: 1,
            battingTeamId: winnerId,
            bowlingTeamId: loserId,
            runs: winnerRuns,
            wickets: 2,
            overs: 1,
            balls: 0,
            status: 'COMPLETED',
          },
          {
            matchId: m.id,
            inningsNumber: 2,
            battingTeamId: loserId,
            bowlingTeamId: winnerId,
            runs: loserRuns,
            wickets: 10,
            overs: 1,
            balls: 0,
            status: 'COMPLETED',
          },
        ],
      });
    }
    console.log('5. Simulated completion of all 12 Group Stage matches (M1–M12)');

    // 6. Recalculate Standings & Validate Group Standings
    await recalculateTournamentStandings(testTournament.id);
    const overviewAfterGroup = await getTournamentOverview(testTournament.id);
    assert.ok(overviewAfterGroup, 'Tournament overview retrieved');

    // Assertion 8: Group standings calculated accurately (Points -> NRR)
    const gA = overviewAfterGroup.groups.groupA.standings;
    const gB = overviewAfterGroup.groups.groupB.standings;
    assert.strictEqual(gA[0].teamId, testTeams[0].id, 'Group A 1st is A1 (6 pts)');
    assert.strictEqual(gA[1].teamId, testTeams[1].id, 'Group A 2nd is A2 (4 pts)');
    assert.strictEqual(gA[2].teamId, testTeams[2].id, 'Group A 3rd is A3 (2 pts)');
    assert.strictEqual(gA[3].teamId, testTeams[3].id, 'Group A 4th is A4 (0 pts)');

    assert.strictEqual(gB[0].teamId, testTeams[4].id, 'Group B 1st is B1 (6 pts)');
    assert.strictEqual(gB[1].teamId, testTeams[5].id, 'Group B 2nd is B2 (4 pts)');
    assert.strictEqual(gB[2].teamId, testTeams[6].id, 'Group B 3rd is B3 (2 pts)');
    assert.strictEqual(gB[3].teamId, testTeams[7].id, 'Group B 4th is B4 (0 pts)');
    console.log('   ✓ Criterion 8 Passed: Group standings calculated accurately (Points -> NRR)');

    // 7. Advance Tournament -> Generates P1 (M13) & P2 (M14)
    const advanceResult1 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceResult1.advanced, true, 'Playoffs stage generated');
    console.log(`6. Advancement Trigger: ${advanceResult1.message}`);

    // Assertion 9: Top 2 from Group A and Group B qualify
    const teamsAfterGroupAdv = await prisma.tournamentTeam.findMany({
      where: { tournamentId: testTournament.id },
    });
    const qualifiedTeams = teamsAfterGroupAdv.filter((t: any) => t.qualificationStatus === 'QUALIFIED');
    const qualifiedIds = qualifiedTeams.map((t: any) => t.teamId);
    assert.strictEqual(qualifiedTeams.length, 4, 'Criterion 9: Exactly 4 teams qualify');
    assert.ok(qualifiedIds.includes(testTeams[0].id), 'A1 qualified');
    assert.ok(qualifiedIds.includes(testTeams[1].id), 'A2 qualified');
    assert.ok(qualifiedIds.includes(testTeams[4].id), 'B1 qualified');
    assert.ok(qualifiedIds.includes(testTeams[5].id), 'B2 qualified');
    console.log('   ✓ Criterion 9 Passed: Top 2 from Group A and Top 2 from Group B qualify');

    // Assertion 10: Bottom 2 from Group A and Group B are eliminated
    const eliminatedTeams = teamsAfterGroupAdv.filter((t: any) => t.qualificationStatus === 'ELIMINATED');
    const eliminatedIds = eliminatedTeams.map((t: any) => t.teamId);
    assert.strictEqual(eliminatedTeams.length, 4, 'Criterion 10: Exactly 4 teams eliminated');
    assert.ok(eliminatedIds.includes(testTeams[2].id), 'A3 eliminated');
    assert.ok(eliminatedIds.includes(testTeams[3].id), 'A4 eliminated');
    assert.ok(eliminatedIds.includes(testTeams[6].id), 'B3 eliminated');
    assert.ok(eliminatedIds.includes(testTeams[7].id), 'B4 eliminated');
    console.log('   ✓ Criterion 10 Passed: Bottom 2 from Group A and Group B are eliminated');

    // Assertion 11: All 4 qualified teams ranked globally by Points -> NRR into Seeds 1–4
    const overviewPlayoffs = await getTournamentOverview(testTournament.id);
    assert(overviewPlayoffs, 'Playoffs overview retrieved');
    const seeds = overviewPlayoffs.playoffs.seeds;
    assert.strictEqual(seeds.length, 4, '4 playoff seeds exist');
    assert.strictEqual(seeds[0].team.id, testTeams[0].id, 'Criterion 11: Seed 1 is A1 (6 pts, higher NRR)');
    assert.strictEqual(seeds[1].team.id, testTeams[4].id, 'Criterion 11: Seed 2 is B1 (6 pts, lower NRR)');
    assert.strictEqual(seeds[2].team.id, testTeams[1].id, 'Criterion 11: Seed 3 is A2 (4 pts, higher NRR)');
    assert.strictEqual(seeds[3].team.id, testTeams[5].id, 'Criterion 11: Seed 4 is B2 (4 pts, lower NRR)');
    console.log('   ✓ Criterion 11 Passed: All 4 qualified teams ranked globally by Points -> NRR into Seeds 1–4');

    // Assertion 12: Seed 1 vs Seed 2 created for P1 (Match 13)
    const m13 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 13 },
    });
    assert.ok(m13, 'Match 13 exists');
    assert.strictEqual(m13.bracketSlot, 'P1', 'Match 13 bracketSlot is P1');
    assert.strictEqual(m13.teamAId, testTeams[0].id, 'P1 teamA is Seed 1 (A1)');
    assert.strictEqual(m13.teamBId, testTeams[4].id, 'P1 teamB is Seed 2 (B1)');
    console.log('   ✓ Criterion 12 Passed: Seed 1 vs Seed 2 created for P1 (Match 13)');

    // Assertion 13: Seed 3 vs Seed 4 created for P2 (Match 14)
    const m14 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 14 },
    });
    assert.ok(m14, 'Match 14 exists');
    assert.strictEqual(m14.bracketSlot, 'P2', 'Match 14 bracketSlot is P2');
    assert.strictEqual(m14.teamAId, testTeams[1].id, 'P2 teamA is Seed 3 (A2)');
    assert.strictEqual(m14.teamBId, testTeams[5].id, 'P2 teamB is Seed 4 (B2)');
    console.log('   ✓ Criterion 13 Passed: Seed 3 vs Seed 4 created for P2 (Match 14)');

    // 8. Simulate completion of P1 (M13) and P2 (M14)
    // P1 (M13): A1 (Seed 1) vs B1 (Seed 2) -> A1 wins (P1 Winner -> Grand Final, P1 Loser -> P3)
    await prisma.match.update({
      where: { id: m13.id },
      data: {
        status: 'COMPLETED',
        winnerTeamId: testTeams[0].id,
        resultNote: 'Seed 1 won by 15 runs',
      },
    });

    // P2 (M14): A2 (Seed 3) vs B2 (Seed 4) -> A2 wins (P2 Winner -> P3, P2 Loser -> Eliminated)
    await prisma.match.update({
      where: { id: m14.id },
      data: {
        status: 'COMPLETED',
        winnerTeamId: testTeams[1].id,
        resultNote: 'Seed 3 won by 8 runs',
      },
    });
    console.log('8. Completed P1 (M13: A1 won) and P2 (M14: A2 won)');

    // 9. Advance Tournament -> Generates P3 (M15: P1 Loser vs P2 Winner)
    const advanceResult2 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceResult2.advanced, true, 'P3 match generated');
    console.log(`9. Advancement Trigger: ${advanceResult2.message}`);

    // Assertion 17: P2 loser is eliminated
    const p2LoserTt = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: testTeams[5].id },
    });
    assert.strictEqual(p2LoserTt?.qualificationStatus, 'ELIMINATED', 'Criterion 17: P2 loser is eliminated');
    console.log('   ✓ Criterion 17 Passed: P2 loser (B2) is eliminated');

    // Assertion 15 & 16: P1 loser and P2 winner advance to P3 (Match 15)
    const m15 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 15 },
    });
    assert.ok(m15, 'Match 15 exists');
    assert.strictEqual(m15.bracketSlot, 'P3', 'Match 15 bracketSlot is P3');
    assert.strictEqual(m15.teamAId, testTeams[4].id, 'Criterion 15: P1 loser (B1) advances to P3');
    assert.strictEqual(m15.teamBId, testTeams[1].id, 'Criterion 16: P2 winner (A2) advances to P3');
    console.log('   ✓ Criterion 15 Passed: P1 loser (B1) advances to P3 (Match 15)');
    console.log('   ✓ Criterion 16 Passed: P2 winner (A2) advances to P3 (Match 15)');

    // 10. Simulate completion of P3 (M15)
    // M15: B1 (P1 Loser) vs A2 (P2 Winner) -> B1 wins
    await prisma.match.update({
      where: { id: m15.id },
      data: {
        status: 'COMPLETED',
        winnerTeamId: testTeams[4].id, // B1 wins
        resultNote: 'B1 won by 12 runs',
      },
    });
    console.log('10. Completed P3 (M15: B1 won, A2 lost)');

    // 11. Advance Tournament -> Generates Grand Final (M16)
    const advanceResult3 = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceResult3.advanced, true, 'Grand Final generated');
    console.log(`11. Advancement Trigger: ${advanceResult3.message}`);

    // Assertion 19: P3 loser is eliminated
    const p3LoserTt = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: testTeams[1].id },
    });
    assert.strictEqual(p3LoserTt?.qualificationStatus, 'ELIMINATED', 'Criterion 19: P3 loser is eliminated');
    console.log('   ✓ Criterion 19 Passed: P3 loser (A2) is eliminated');

    // Assertion 14, 18 & 20: Grand Final (Match 16) is P1 Winner (A1) vs P3 Winner (B1)
    const m16 = await prisma.match.findFirst({
      where: { tournamentId: testTournament.id, matchNumber: 16 },
    });
    assert.ok(m16, 'Match 16 exists');
    assert.strictEqual(m16.bracketSlot, 'FINAL', 'Match 16 bracketSlot is FINAL');
    assert.strictEqual(m16.teamAId, testTeams[0].id, 'Criterion 14 & 20: P1 winner (A1) in Grand Final');
    assert.strictEqual(m16.teamBId, testTeams[4].id, 'Criterion 18 & 20: P3 winner (B1) in Grand Final');
    console.log('   ✓ Criterion 14 Passed: P1 winner (A1) advances directly to Grand Final');
    console.log('   ✓ Criterion 18 Passed: P3 winner (B1) advances to Grand Final');
    console.log('   ✓ Criterion 20 Passed: Grand Final is P1 Winner (A1) vs P3 Winner (B1)');

    // 12. Simulate completion of Grand Final (M16)
    // M16: A1 vs B1 -> A1 wins Championship!
    await prisma.match.update({
      where: { id: m16.id },
      data: {
        status: 'COMPLETED',
        winnerTeamId: testTeams[0].id, // A1 wins
        resultNote: 'A1 crowned Champion by 20 runs',
      },
    });
    console.log('12. Completed Grand Final (M16: A1 won)');

    // 13. Advance Tournament -> Crowns Champion & Concludes Tournament
    const advanceResultFinal = await checkAndAdvanceTournament(testTournament.id);
    assert.strictEqual(advanceResultFinal.advanced, true, 'Tournament concluded');
    console.log(`13. Advancement Trigger: ${advanceResultFinal.message}`);

    // Assertion 21: Champion and Runner-up are declared and assigned
    const championTt = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: testTeams[0].id },
    });
    const runnerUpTt = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: testTournament.id, teamId: testTeams[4].id },
    });
    assert.strictEqual(championTt?.qualificationStatus, 'CHAMPION', 'Criterion 21: A1 is CHAMPION');
    assert.strictEqual(runnerUpTt?.qualificationStatus, 'RUNNER_UP', 'Criterion 21: B1 is RUNNER_UP');

    const tournamentFinalState = await prisma.tournament.findUnique({
      where: { id: testTournament.id },
    });
    assert.strictEqual(tournamentFinalState?.status, 'COMPLETED', 'Tournament status is COMPLETED');
    console.log('   ✓ Criterion 21 Passed: Champion (A1) and Runner-up (B1) declared and assigned');

    // Assertion 22: Exactly 16 matches exist at tournament completion
    const allMatches = await prisma.match.findMany({
      where: { tournamentId: testTournament.id },
      orderBy: { matchNumber: 'asc' },
    });
    assert.strictEqual(allMatches.length, 16, 'Criterion 22: Exactly 16 matches created');
    assert.deepStrictEqual(
      allMatches.map((m: any) => m.matchNumber),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      'Matches numbered M1 through M16 consecutively'
    );
    assert.ok(
      allMatches.every((m: any) => m.status === 'COMPLETED'),
      'All 16 matches are COMPLETED'
    );
    console.log('   ✓ Criterion 22 Passed: Exactly 16 matches exist at tournament completion (M1–M16)');

    // Overview verification
    const finalOverview = await getTournamentOverview(testTournament.id);
    assert.ok(finalOverview, 'Overview loads');
    assert.strictEqual(finalOverview.progress.totalMatches, 16, 'Overview reports 16 total matches');
    assert.strictEqual(finalOverview.progress.completedMatches, 16, 'Overview reports 16 completed matches');
    assert.strictEqual(finalOverview.progress.currentStage, 'COMPLETED', 'Overview current stage is COMPLETED');
    assert.strictEqual(finalOverview.crownedChampion?.id, testTeams[0].id, 'Champion matches A1');
    assert.strictEqual(finalOverview.playoffs.runnerUp?.id, testTeams[4].id, 'Runner up matches B1');
    console.log('14. Verified final getTournamentOverview payload consistency');

  } finally {
    // =========================================================================
    // MANDATORY CLEANUP IN STRICT ACCORDANCE WITH USER RULE:
    // "after test adding player and team make sure to remove them form the system
    //  but dont remove the real teams and players"
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
  console.log(' ALL 22 CRITERIA FOR 8-TEAM CPL TOURNAMENT PASSED! ✅');
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
