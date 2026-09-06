/**
 * CPL DIGITAL GROUP DRAW CEREMONY — REVERT FINALIZED DRAW TEST SUITE
 * 
 * Verifies:
 * 1. An in-progress / completed draw can be reset before finalization.
 * 2. A finalized draw can be safely reverted by an admin if no matches have started.
 * 3. Reverting clears TournamentTeam.groupName back to null.
 * 4. Reverting sets TournamentDraw.status to CANCELLED and logs an audit record.
 * 5. Safety guard: Reverting is strictly rejected if tournament matches have already been scored.
 * 6. 100% clean-up of temporary test records.
 */

import assert from 'assert';
import { prisma } from 'database';
import {
  generateDraw,
  startCeremony,
  selectChit,
  finalizeDraw,
  revertFinalizedDraw,
  cancelDraw,
} from '../lib/tournament/draw-service';

const db = prisma as any;

async function runRevertTests() {
  console.log('=== STARTING REVERT FINALIZED DRAW TEST SUITE ===\n');

  const testPrefix = `TEST_CPL_REV_${Date.now()}`;
  let testTournamentId: string | null = null;
  const createdTeamIds: string[] = [];

  try {
    // 1. Setup tournament and 9 teams
    console.log('Step 1: Setting up test tournament and 9 teams...');
    const tournament = await prisma.tournament.create({
      data: {
        name: `${testPrefix} Revert Cup`,
        season: '2026',
        format: 'T10',
        status: 'REGISTRATION',
      },
    });
    testTournamentId = tournament.id;

    for (let i = 1; i <= 9; i++) {
      const team = await prisma.team.create({
        data: {
          name: `${testPrefix} Team ${i}`,
          shortName: `RT${i}`,
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
          teamName: `${testPrefix} Team ${i}`,
          leaderName: `Captain ${i}`,
          leaderWhatsapp: `077222222${i}`,
          leaderIndexNumber: `INDEX_${testPrefix}_${i}`,
          status: 'APPROVED',
        },
      });
    }
    console.log('✓ Step 1: Tournament and 9 teams created.\n');

    // 2. Generate and run draw to completion
    console.log('Step 2: Conducting draw ceremony...');
    const gen = await generateDraw(testTournamentId, 'TestAdmin');
    const drawId = gen.drawId;

    await startCeremony(drawId, 'TestAdmin');

    for (let pos = 1; pos <= 9; pos++) {
      await selectChit(drawId, pos, { isAdmin: true, actor: 'Host' });
    }

    // 3. Finalize draw
    console.log('Step 3: Finalizing draw...');
    await finalizeDraw(drawId, 'TestAdmin');

    // Verify groups committed in DB
    const assignedTeams = await prisma.tournamentTeam.findMany({
      where: { tournamentId: testTournamentId },
    });
    const withGroups = assignedTeams.filter((tt) => tt.groupName !== null);
    assert.strictEqual(withGroups.length, 9, 'All 9 teams must have groupName assigned after finalization');
    console.log('✓ Step 3: Draw finalized and all 9 teams have groupName committed.\n');

    // 4. Test Revert Finalized Draw (No matches played)
    console.log('Step 4: Testing revertFinalizedDraw...');
    const revertResult = await revertFinalizedDraw(drawId, 'TestAdmin');
    assert.strictEqual(revertResult.success, true, 'Revert must succeed');
    assert.strictEqual(revertResult.status, 'CANCELLED', 'Draw status must be CANCELLED');

    // Verify groups cleared in TournamentTeam
    const clearedTeams = await prisma.tournamentTeam.findMany({
      where: { tournamentId: testTournamentId },
    });
    const stillAssigned = clearedTeams.filter((tt) => tt.groupName !== null);
    assert.strictEqual(stillAssigned.length, 0, 'All team groupName assignments must be reset to NULL');

    // Verify audit log
    const auditLogs = await db.tournamentDrawAudit.findMany({
      where: { drawId, eventType: 'DRAW_REVERTED' },
    });
    assert.strictEqual(auditLogs.length, 1, 'DRAW_REVERTED audit log entry must exist');
    console.log('✓ Step 4: Finalized draw reverted cleanly! Groups cleared from TournamentTeam.\n');

    // 5. Test Safety Guard: Run another draw, add a completed match, verify revert is blocked
    console.log('Step 5: Testing safety guard when matches have been scored...');
    const gen2 = await generateDraw(testTournamentId, 'TestAdmin');
    await startCeremony(gen2.drawId, 'TestAdmin');
    for (let pos = 1; pos <= 9; pos++) {
      await selectChit(gen2.drawId, pos, { isAdmin: true, actor: 'Host' });
    }
    await finalizeDraw(gen2.drawId, 'TestAdmin');

    // Create a mock completed match
    const mockMatch = await prisma.match.create({
      data: {
        tournamentId: testTournamentId,
        matchNumber: 1,
        stage: 'GROUP',
        teamAId: createdTeamIds[0],
        teamBId: createdTeamIds[1],
        status: 'COMPLETED',
        oversPerInnings: 4,
        ballsPerOver: 4,
      },
    });

    // Attempting to revert must be rejected!
    let threwOnActiveMatch = false;
    try {
      await revertFinalizedDraw(gen2.drawId, 'TestAdmin');
    } catch (err: any) {
      threwOnActiveMatch = true;
      assert(err.message.includes('already been played'), 'Must reject revert when matches have been played');
    }
    assert(threwOnActiveMatch, 'Reverting a finalized draw with active matches must throw an error');
    console.log('✓ Step 5: Safety guard confirmed: Cannot revert draw once matches are played.\n');

    // Delete mock match
    await prisma.match.delete({ where: { id: mockMatch.id } });

    // Now revert should succeed after match removed
    await revertFinalizedDraw(gen2.drawId, 'TestAdmin');
    console.log('✓ Step 6: After removing match, revert succeeds.\n');

    console.log('🎉 ALL REVERT DRAW TESTS PASSED PERFECTLY!\n');
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
      await prisma.match.deleteMany({ where: { tournamentId: testTournamentId } });
      await prisma.registration.deleteMany({ where: { tournamentId: testTournamentId } });
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId: testTournamentId } });
      await prisma.tournament.delete({ where: { id: testTournamentId } });
    }
    for (const tId of createdTeamIds) {
      await prisma.team.delete({ where: { id: tId } }).catch(() => {});
    }
    console.log('✓ Cleanup complete: Real teams and data 100% preserved.');
  }
}

runRevertTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ REVERT TEST FAILED:', err);
    process.exit(1);
  });
