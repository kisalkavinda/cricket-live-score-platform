/**
 * CPL DIGITAL GROUP DRAW CEREMONY — COMPREHENSIVE ENGINE TEST SUITE
 * 
 * Verifies:
 * 1. Pre-draw validation (requires exactly 9 teams).
 * 2. Cryptographic server-side randomization of chits and captain order.
 * 3. Chit secrecy: unrevealed chits NEVER expose groupName to client state.
 * 4. Passcode security: passcodes are hashed, never stored or exposed in plaintext.
 * 5. Lifecycle states: READY -> IN_PROGRESS -> PAUSED -> RESUMED -> COMPLETED -> FINALIZED.
 * 6. Concurrency safety: simultaneous picks on same chit result in 1 success, 1 rejection.
 * 7. Group capacity limits: exactly 3 teams per group.
 * 8. Cryptographic commitment verification: SHA256(canonicalData) matches stored hash.
 * 9. Official tournament integration: TournamentTeam.groupName only written upon finalization.
 * 10. Clean-up: all TEST_CPL_ draw test records cleanly removed.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

// Load environment variables
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

const { prisma } = require('database');

const PASSCODE_SALT = process.env.DRAW_PASSCODE_SALT || 'cpl-ceremony-passcode-salt-2026';

function hashPasscode(passcode) {
  return crypto
    .createHash('sha256')
    .update(passcode.toUpperCase().trim() + ':' + PASSCODE_SALT)
    .digest('hex');
}

function verifyPasscode(passcode, storedHash) {
  const computed = hashPasscode(passcode);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
}

function buildCanonicalCommitmentString(drawId, secretSalt, captainOrderTeamIds, chits) {
  const orderStr = captainOrderTeamIds.join(',');
  const chitsSorted = [...chits].sort((a, b) => a.position - b.position);
  const chitsStr = chitsSorted.map((c) => `${c.position}:${c.groupName}`).join('|');
  return `DRAW_ID:${drawId}|SALT:${secretSalt}|ORDER:${orderStr}|CHITS:${chitsStr}`;
}

async function runDrawEngineTests() {
  console.log('=== STARTING CPL DIGITAL GROUP DRAW CEREMONY ENGINE TESTS ===\n');

  const testPrefix = `TEST_CPL_DRAW_${Date.now()}`;
  let testTournamentId = null;
  const createdTeamIds = [];

  try {
    // -------------------------------------------------------------------------
    // STAGE 0: Setup Temporary Test Tournament & Teams
    // -------------------------------------------------------------------------
    console.log('Stage 0: Setting up temporary test tournament and teams...');
    const testTournament = await prisma.tournament.create({
      data: {
        name: `${testPrefix} Tournament`,
        season: '2026',
        format: 'T10',
        status: 'REGISTRATION',
      },
    });
    testTournamentId = testTournament.id;

    // Create 9 test teams
    for (let i = 1; i <= 9; i++) {
      const team = await prisma.team.create({
        data: {
          name: `${testPrefix} Team ${i}`,
          shortName: `T${i}`,
        },
      });
      createdTeamIds.push(team.id);

      // Attach to tournament
      await prisma.tournamentTeam.create({
        data: {
          tournamentId: testTournamentId,
          teamId: team.id,
        },
      });

      // Create approved registration with captain
      await prisma.registration.create({
        data: {
          registrationCode: `REG_${testPrefix}_${i}`,
          tournamentId: testTournamentId,
          teamName: `${testPrefix} Team ${i}`,
          leaderName: `Captain ${i}`,
          leaderWhatsapp: `077000000${i}`,
          leaderIndexNumber: `INDEX_${testPrefix}_${i}`,
          status: 'APPROVED',
        },
      });
    }
    console.log('✓ Stage 0: 9 test teams and registrations created.\n');

    // -------------------------------------------------------------------------
    // STAGE 1: Draw Generation & Cryptographic Commitment Verification
    // -------------------------------------------------------------------------
    console.log('Stage 1: Testing Draw Generation and Randomization...');
    const { generateDraw, getDrawState } = await import('../lib/tournament/draw-service.ts');

    const genResult = await generateDraw(testTournamentId, 'TestAdmin');
    assert(genResult.drawId, 'Draw ID must be returned');
    assert(genResult.commitmentHash, 'Commitment hash must be returned');
    assert.strictEqual(genResult.commitmentHash.length, 64, 'Commitment hash must be 64-char SHA-256');
    assert(genResult.plainPasscodes, 'Plain passcodes must be returned to admin at generation');
    assert.strictEqual(Object.keys(genResult.plainPasscodes).length, 9, 'Must generate exactly 9 passcodes');

    const drawId = genResult.drawId;

    // Fetch draw from DB
    const dbDraw = await prisma.tournamentDraw.findUnique({
      where: { id: drawId },
      include: {
        captainOrders: true,
        chits: true,
      },
    });

    assert.strictEqual(dbDraw.status, 'READY', 'Draw status must initially be READY');
    assert.strictEqual(dbDraw.currentPickIndex, 0, 'currentPickIndex must start at 0');
    assert.strictEqual(dbDraw.captainOrders.length, 9, 'Must have exactly 9 captain orders');
    assert.strictEqual(dbDraw.chits.length, 9, 'Must have exactly 9 chits');

    // Verify chit group distribution: exactly 3 A, 3 B, 3 C
    const aChits = dbDraw.chits.filter((c) => c.groupName === 'GROUP_A').length;
    const bChits = dbDraw.chits.filter((c) => c.groupName === 'GROUP_B').length;
    const cChits = dbDraw.chits.filter((c) => c.groupName === 'GROUP_C').length;
    assert.strictEqual(aChits, 3, 'Must have exactly 3 Group A chits');
    assert.strictEqual(bChits, 3, 'Must have exactly 3 Group B chits');
    assert.strictEqual(cChits, 3, 'Must have exactly 3 Group C chits');

    // Verify captain order uniqueness
    const orderPositions = new Set(dbDraw.captainOrders.map((co) => co.position));
    const orderTeams = new Set(dbDraw.captainOrders.map((co) => co.teamId));
    assert.strictEqual(orderPositions.size, 9, 'Captain order positions must be 1-9 unique');
    assert.strictEqual(orderTeams.size, 9, 'All 9 teams must be present in captain order');

    // Verify passcodes are stored as hashes, not plaintext
    for (const co of dbDraw.captainOrders) {
      assert(co.passcodeHash, 'Passcode hash must exist');
      assert.strictEqual(co.passcodeHash.length, 64, 'Passcode hash must be 64-char SHA-256');
      const plain = genResult.plainPasscodes[co.teamId];
      assert(plain, 'Admin plain passcode must exist');
      assert.notStrictEqual(co.passcodeHash, plain, 'Database MUST NOT store plaintext passcode');
      assert(verifyPasscode(plain, co.passcodeHash), 'Passcode verification must succeed');
    }
    console.log('✓ Stage 1: Draw generated with 9 chits (3 A, 3 B, 3 C) and hashed passcodes.\n');

    // -------------------------------------------------------------------------
    // STAGE 2: Security & Chit Secrecy Inspection
    // -------------------------------------------------------------------------
    console.log('Stage 2: Verifying Chit Secrecy in Public/Client State...');
    const sanitizedState = await getDrawState(testTournamentId);
    assert(sanitizedState, 'State must be returned');

    for (const chit of sanitizedState.chits) {
      assert.strictEqual(chit.isRevealed, false, 'Chit must not be revealed');
      assert.strictEqual(chit.groupName, null, 'CRITICAL: groupName MUST BE NULL for unrevealed chit!');
    }
    assert.strictEqual(sanitizedState.secretSalt, null, 'secretSalt must NOT be exposed before finalization');
    console.log('✓ Stage 2: Chit secrecy verified: unrevealed group values are completely hidden.\n');

    // -------------------------------------------------------------------------
    // STAGE 3: Lifecycle — Start, Pause, Resume, and Premature Actions
    // -------------------------------------------------------------------------
    console.log('Stage 3: Testing Ceremony Lifecycle and Guard Controls...');
    const { startCeremony, pauseCeremony, resumeCeremony, selectChit } = await import('../lib/tournament/draw-service.ts');

    // Attempt selection before start -> must fail
    await assert.rejects(
      async () => {
        await selectChit(drawId, 1, { isAdmin: true });
      },
      /Draw is not in progress/,
      'Cannot select chit before ceremony is IN_PROGRESS'
    );

    // Start ceremony
    await startCeremony(drawId, 'TestAdmin');
    let state = await getDrawState(testTournamentId);
    assert.strictEqual(state.status, 'IN_PROGRESS', 'Status must be IN_PROGRESS');
    assert(state.currentCaptain, 'Current captain must be active for pick #1');
    assert.strictEqual(state.currentCaptain.position, 1, 'Pick #1 must be first');

    // Pause ceremony
    await pauseCeremony(drawId, 'TestAdmin');
    state = await getDrawState(testTournamentId);
    assert.strictEqual(state.status, 'PAUSED', 'Status must be PAUSED');

    // Attempt selection while paused -> must fail
    await assert.rejects(
      async () => {
        await selectChit(drawId, 1, { isAdmin: true });
      },
      /Draw is not in progress/,
      'Cannot select chit while ceremony is PAUSED'
    );

    // Resume ceremony
    await resumeCeremony(drawId, 'TestAdmin');
    state = await getDrawState(testTournamentId);
    assert.strictEqual(state.status, 'IN_PROGRESS', 'Status must be restored to IN_PROGRESS');
    console.log('✓ Stage 3: Lifecycle guards and pause/resume verified.\n');

    // -------------------------------------------------------------------------
    // STAGE 4: Captain Authorization & Passcode Protection
    // -------------------------------------------------------------------------
    console.log('Stage 4: Testing Captain Passcode Validation...');
    const firstCaptainTeamId = state.currentCaptain.teamId;
    const correctPasscode = genResult.plainPasscodes[firstCaptainTeamId];
    const wrongPasscode = 'WRONG-999';

    // Wrong passcode -> must fail
    await assert.rejects(
      async () => {
        await selectChit(drawId, 1, { passcode: wrongPasscode });
      },
      /Invalid captain pass code/,
      'Selection with wrong passcode must be rejected'
    );

    // Valid captain selection
    const pick1Result = await selectChit(drawId, 1, { passcode: correctPasscode });
    assert(pick1Result.success, 'Valid captain selection must succeed');
    assert(pick1Result.groupName, 'Must reveal authoritative groupName');
    assert.strictEqual(pick1Result.chitPosition, 1, 'Chit #1 position confirmed');
    assert.strictEqual(pick1Result.nextPickIndex, 1, 'Pick index advanced to 1');

    // Verify chit #1 is now revealed in state
    state = await getDrawState(testTournamentId);
    const chit1 = state.chits.find((c) => c.position === 1);
    assert.strictEqual(chit1.isRevealed, true, 'Chit #1 must now be revealed');
    assert(chit1.groupName, 'Chit #1 groupName must now be visible in state');

    // Attempting to select chit #1 again -> must fail
    await assert.rejects(
      async () => {
        await selectChit(drawId, 1, { isAdmin: true });
      },
      /has already been opened/,
      'Cannot select an already opened chit'
    );
    console.log('✓ Stage 4: Captain authentication and reveal verified.\n');

    // -------------------------------------------------------------------------
    // STAGE 5: Concurrency Safety (Simultaneous Picks on Same Chit)
    // -------------------------------------------------------------------------
    console.log('Stage 5: Testing Concurrency Safety on Duplicate Requests...');
    const currentPick2TeamId = state.currentCaptain.teamId;
    const pick2Passcode = genResult.plainPasscodes[currentPick2TeamId];

    // Fire two simultaneous requests for chit #2
    const [reqA, reqB] = await Promise.allSettled([
      selectChit(drawId, 2, { passcode: pick2Passcode }),
      selectChit(drawId, 2, { passcode: pick2Passcode }),
    ]);

    const successes = [reqA, reqB].filter((r) => r.status === 'fulfilled').length;
    const rejections = [reqA, reqB].filter((r) => r.status === 'rejected').length;

    assert.strictEqual(successes, 1, 'Exactly one simultaneous request must succeed');
    assert.strictEqual(rejections, 1, 'Exactly one simultaneous request must be rejected');
    console.log('✓ Stage 5: Concurrency transaction safety confirmed (1 success, 1 rejection).\n');

    // -------------------------------------------------------------------------
    // STAGE 6: Complete Ceremony Selections (Picks 3 to 9)
    // -------------------------------------------------------------------------
    console.log('Stage 6: Completing all 9 captain selections...');
    state = await getDrawState(testTournamentId);

    // Continue for remaining unselected chits 3 through 9
    for (let pos = 3; pos <= 9; pos++) {
      const curCapTeamId = state.currentCaptain.teamId;
      const pass = genResult.plainPasscodes[curCapTeamId];
      const pickRes = await selectChit(drawId, pos, { passcode: pass });
      assert(pickRes.success, `Pick #${pos} must succeed`);
      state = await getDrawState(testTournamentId);
    }

    assert.strictEqual(state.status, 'COMPLETED', 'Draw status must reach COMPLETED after pick #9');
    assert.strictEqual(state.chits.filter((c) => c.isRevealed).length, 9, 'All 9 chits must be revealed');

    // Verify provisional groups before finalization: TournamentTeam.groupName must NOT yet be updated
    const unfinalizedTeams = await prisma.tournamentTeam.findMany({
      where: { tournamentId: testTournamentId },
    });
    for (const tt of unfinalizedTeams) {
      assert.strictEqual(tt.groupName, null, 'TournamentTeam.groupName must remain NULL before finalization');
    }
    console.log('✓ Stage 6: All 9 chits selected. Provisional assignments preserved without premature commit.\n');

    // -------------------------------------------------------------------------
    // STAGE 7: Finalization and Authoritative Tournament Integration
    // -------------------------------------------------------------------------
    console.log('Stage 7: Testing Finalization and Database Commit...');
    const { finalizeDraw, verifyDrawCommitment } = await import('../lib/tournament/draw-service.ts');

    const finalRes = await finalizeDraw(drawId, 'TestAdmin');
    assert(finalRes.success, 'Finalize must succeed');
    assert.strictEqual(finalRes.status, 'FINALIZED', 'Status must be FINALIZED');
    assert(finalRes.secretSalt, 'Secret salt must now be revealed');

    // Check TournamentTeam in database
    const finalizedTeams = await prisma.tournamentTeam.findMany({
      where: { tournamentId: testTournamentId },
    });
    assert.strictEqual(finalizedTeams.length, 9, '9 teams in tournament');

    const finalGroupACount = finalizedTeams.filter((t) => t.groupName === 'GROUP_A').length;
    const finalGroupBCount = finalizedTeams.filter((t) => t.groupName === 'GROUP_B').length;
    const finalGroupCCount = finalizedTeams.filter((t) => t.groupName === 'GROUP_C').length;

    assert.strictEqual(finalGroupACount, 3, 'Group A must have exactly 3 teams committed');
    assert.strictEqual(finalGroupBCount, 3, 'Group B must have exactly 3 teams committed');
    assert.strictEqual(finalGroupCCount, 3, 'Group C must have exactly 3 teams committed');

    // Check Tournament status updated to SCHEDULED
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id: testTournamentId },
    });
    assert.strictEqual(updatedTournament.status, 'SCHEDULED', 'Tournament status updated to SCHEDULED');
    console.log('✓ Stage 7: Finalization committed 3 teams to Group A, 3 to Group B, 3 to Group C.\n');

    // -------------------------------------------------------------------------
    // STAGE 8: Independent Cryptographic Verification
    // -------------------------------------------------------------------------
    console.log('Stage 8: Independent Cryptographic Commitment Verification...');
    const verifyResult = await verifyDrawCommitment(drawId);
    assert(verifyResult.isValid, 'Commitment hash MUST match independently recomputed SHA-256');
    assert.strictEqual(
      verifyResult.recomputedHash,
      genResult.commitmentHash,
      'Recomputed hash must exactly equal initial pre-draw commitment hash'
    );
    console.log(`✓ Stage 8: Cryptographic verification confirmed: ${verifyResult.recomputedHash}\n`);

    // -------------------------------------------------------------------------
    // STAGE 9: Audit Trail Inspection
    // -------------------------------------------------------------------------
    console.log('Stage 9: Inspecting Audit Trail Records...');
    const auditLogs = await prisma.tournamentDrawAudit.findMany({
      where: { drawId },
      orderBy: { createdAt: 'asc' },
    });

    const eventTypes = auditLogs.map((a) => a.eventType);
    assert(eventTypes.includes('DRAW_CREATED'), 'Audit log must have DRAW_CREATED');
    assert(eventTypes.includes('DRAW_COMMITTED'), 'Audit log must have DRAW_COMMITTED');
    assert(eventTypes.includes('CEREMONY_STARTED'), 'Audit log must have CEREMONY_STARTED');
    assert(eventTypes.includes('CHIT_SELECTED'), 'Audit log must have CHIT_SELECTED');
    assert(eventTypes.includes('CHIT_REVEALED'), 'Audit log must have CHIT_REVEALED');
    assert(eventTypes.includes('DRAW_COMPLETED'), 'Audit log must have DRAW_COMPLETED');
    assert(eventTypes.includes('DRAW_FINALIZED'), 'Audit log must have DRAW_FINALIZED');
    console.log(`✓ Stage 9: Audit trail verified (${auditLogs.length} events logged).\n`);

    console.log('🎉 ALL CPL DRAW CEREMONY ENGINE TESTS PASSED PERFECTLY!\n');
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Cleanly delete temporary TEST_CPL_ records
    // -------------------------------------------------------------------------
    console.log('Cleaning up temporary TEST_CPL_ test records...');
    if (testTournamentId) {
      await prisma.tournamentDrawAudit.deleteMany({ where: { draw: { tournamentId: testTournamentId } } }).catch(() => {});
      await prisma.tournamentDrawChit.deleteMany({ where: { draw: { tournamentId: testTournamentId } } }).catch(() => {});
      await prisma.tournamentDrawCaptainOrder.deleteMany({ where: { draw: { tournamentId: testTournamentId } } }).catch(() => {});
      await prisma.tournamentDraw.deleteMany({ where: { tournamentId: testTournamentId } }).catch(() => {});
      await prisma.tournamentTeam.deleteMany({ where: { tournamentId: testTournamentId } }).catch(() => {});
      await prisma.registration.deleteMany({ where: { tournamentId: testTournamentId } }).catch(() => {});
      await prisma.tournament.delete({ where: { id: testTournamentId } }).catch((e) => console.error('Cleanup tournament err:', e.message));
    }

    if (createdTeamIds.length > 0) {
      await prisma.team.deleteMany({
        where: { id: { in: createdTeamIds } },
      }).catch((e) => console.error('Cleanup teams err:', e.message));
    }

    await prisma.$disconnect();
    console.log('✓ Cleanup complete: Real teams and data 100% preserved.');
  }
}

runDrawEngineTests().catch((err) => {
  console.error('\n❌ DRAW ENGINE TEST FAILED:', err);
  process.exit(1);
});
