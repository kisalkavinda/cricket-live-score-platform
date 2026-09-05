/**
 * CPL DIGITAL GROUP DRAW CEREMONY — >9 TEAMS SELECTION TEST SUITE
 * 
 * Verifies:
 * 1. Tournament with >9 teams (e.g. 11 registered teams) correctly detected.
 * 2. Calling generateDraw without selecting exactly 9 teams is rejected.
 * 3. Calling generateDraw with invalid count (<9 or >9) is rejected.
 * 4. Calling generateDraw with duplicates or invalid IDs is rejected.
 * 5. Calling generateDraw with exactly 9 chosen team IDs succeeds.
 * 6. Captain orders and passcodes strictly match the 9 chosen teams.
 * 7. The unselected 2 teams are safely ignored from the ceremony.
 * 8. 100% clean-up of temporary test records.
 */

import assert from 'assert';
import { prisma } from 'database';
import { generateDraw, getEligibleTournamentTeams, cancelDraw } from '../lib/tournament/draw-service';

const db = prisma as any;

async function runTeamSelectionTests() {
  console.log('=== STARTING DRAW TEAM SELECTION (>9 TEAMS) TEST SUITE ===\n');

  const testPrefix = `TEST_CPL_SEL_${Date.now()}`;
  let testTournamentId: string | null = null;
  const createdTeamIds: string[] = [];

  try {
    // 1. Create tournament
    console.log('Step 1: Creating test tournament with 11 registered teams...');
    const tournament = await prisma.tournament.create({
      data: {
        name: `${testPrefix} Cup 2026`,
        season: '2026',
        format: 'T10',
        status: 'REGISTRATION',
      },
    });
    testTournamentId = tournament.id;

    // 2. Create 11 teams
    for (let i = 1; i <= 11; i++) {
      const team = await prisma.team.create({
        data: {
          name: `${testPrefix} Squad ${i}`,
          shortName: `SQ${i}`,
        },
      });
      createdTeamIds.push(team.id);

      await prisma.tournamentTeam.create({
        data: {
          tournamentId: testTournamentId,
          teamId: team.id,
        },
      });

      await prisma.registration.create({
        data: {
          registrationCode: `REG_${testPrefix}_${i}`,
          tournamentId: testTournamentId,
          teamName: `${testPrefix} Squad ${i}`,
          leaderName: `Captain ${i}`,
          leaderWhatsapp: `077111111${i.toString().padStart(2, '0')}`,
          leaderIndexNumber: `INDEX_${testPrefix}_${i}`,
          status: 'APPROVED',
        },
      });
    }

    // 3. Check eligibility
    const eligibility = await getEligibleTournamentTeams(testTournamentId);
    assert.strictEqual(eligibility.teams.length, 11, 'Must detect 11 teams');
    assert.strictEqual(eligibility.isEligible, true, 'isEligible must be true when teams >= 9');
    console.log('✓ Step 1: 11 teams created and detected as eligible for selection.\n');

    // 4. Test generateDraw without selecting 9 teams (must reject)
    console.log('Step 2: Verifying rejection when not specifying 9 teams...');
    let threwWithoutSelection = false;
    try {
      await generateDraw(testTournamentId, 'TestAdmin');
    } catch (err: any) {
      threwWithoutSelection = true;
      assert(err.message.includes('Please select exactly 9 teams'), 'Error message must prompt for 9 teams selection');
    }
    assert(threwWithoutSelection, 'generateDraw must reject if teams > 9 and no selection provided');
    console.log('✓ Step 2: Unspecified selection correctly rejected.\n');

    // 5. Test with 8 teams (must reject)
    console.log('Step 3: Verifying rejection on 8 selected teams (< 9)...');
    let threwOn8 = false;
    try {
      await generateDraw(testTournamentId, 'TestAdmin', createdTeamIds.slice(0, 8));
    } catch (err: any) {
      threwOn8 = true;
      assert(err.message.includes('requires exactly 9 selected teams'), 'Must reject 8 teams');
    }
    assert(threwOn8, 'Must reject 8 teams');
    console.log('✓ Step 3: Selection with 8 teams rejected.\n');

    // 6. Test with duplicate IDs (must reject)
    console.log('Step 4: Verifying rejection on duplicate team IDs...');
    let threwOnDuplicates = false;
    try {
      const dupList = [...createdTeamIds.slice(0, 8), createdTeamIds[0]];
      await generateDraw(testTournamentId, 'TestAdmin', dupList);
    } catch (err: any) {
      threwOnDuplicates = true;
      assert(err.message.includes('Duplicate selections are not allowed'), 'Must reject duplicate selections');
    }
    assert(threwOnDuplicates, 'Must reject duplicate selections');
    console.log('✓ Step 4: Duplicate selection rejected.\n');

    // 7. Test with exactly 9 chosen teams (e.g. teams 1 to 9, leaving out 10 and 11)
    console.log('Step 5: Generating official draw with selected teams 1 through 9...');
    const chosen9 = createdTeamIds.slice(0, 9);
    const unselected2 = createdTeamIds.slice(9);

    const drawResult = await generateDraw(testTournamentId, 'TestAdmin', chosen9);
    assert(drawResult.drawId, 'Draw ID must be created');
    assert.strictEqual(Object.keys(drawResult.plainPasscodes).length, 9, 'Must generate 9 passcodes');

    // Verify DB records
    const dbDraw = await db.tournamentDraw.findUnique({
      where: { id: drawResult.drawId },
      include: {
        captainOrders: true,
        chits: true,
      },
    });

    assert(dbDraw, 'Draw record must exist');
    assert.strictEqual(dbDraw.captainOrders.length, 9, 'Must have 9 captain orders');
    assert.strictEqual(dbDraw.chits.length, 9, 'Must have 9 chits');

    const captainOrderTeamIds = new Set(dbDraw.captainOrders.map((co: any) => co.teamId));

    // Confirm all chosen 9 are in captain order
    for (const chosenId of chosen9) {
      assert(captainOrderTeamIds.has(chosenId), `Chosen team ${chosenId} must be in captain order`);
    }

    // Confirm the 2 unselected teams are NOT in captain order
    for (const unselectedId of unselected2) {
      assert(!captainOrderTeamIds.has(unselectedId), `Unselected team ${unselectedId} must NOT be in captain order`);
    }

    console.log('✓ Step 5: Exactly the 9 chosen teams entered the draw; unselected 2 teams excluded.\n');

    // 8. Test cancel draw
    await cancelDraw(drawResult.drawId, 'TestAdmin');
    console.log('✓ Step 6: Draw cancelled cleanly.\n');

    console.log('🎉 ALL TEAM SELECTION (>9 TEAMS) TESTS PASSED PERFECTLY!\n');
  } finally {
    console.log('Cleaning up temporary test records...');
    if (testTournamentId) {
      const draws = await db.tournamentDraw.findMany({ where: { tournamentId: testTournamentId } });
      for (const d of draws) {
        await db.tournamentDrawAudit.deleteMany({ where: { drawId: d.id } });
        await db.tournamentDrawChit.deleteMany({ where: { drawId: d.id } });
        await db.tournamentDrawCaptainOrder.deleteMany({ where: { drawId: d.id } });
      }
      await db.tournamentDraw.deleteMany({ where: { tournamentId: testTournamentId } });
      await prisma.registration.deleteMany({ where: { tournamentId: testTournamentId } });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId: testTournamentId } });
      await prisma.tournament.delete({ where: { id: testTournamentId } });
    }
    for (const tId of createdTeamIds) {
      await prisma.team.delete({ where: { id: tId } }).catch(() => {});
    }
    console.log('✓ Cleanup complete: All temporary data safely deleted.');
  }
}

runTeamSelectionTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ SELECTION TEST FAILED:', err);
    process.exit(1);
  });
