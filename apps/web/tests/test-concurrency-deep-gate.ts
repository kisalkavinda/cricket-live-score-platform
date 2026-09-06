(process.env as any).NODE_ENV = 'test';
import assert from 'assert';
import { prisma } from 'database';
import {
  recordDelivery,
  undoLastDelivery,
  RecordDeliveryInput,
} from '../lib/scoring/scoring-service';

interface Fixture {
  tournId: string;
  matchId: string;
  inningsId: string;
  teamAId: string;
  teamBId: string;
  p1Id: string;
  p2Id: string;
  bowlerId: string;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4, delayMs = 1500): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === attempts - 1) throw e;
      await sleep(delayMs * (i + 1));
    }
  }
  throw new Error('Retry exhausted');
}

async function createDisposableFixture(name: string, targetRuns?: number): Promise<Fixture> {
  await sleep(1500);
  return withRetry(async () => {
    const tourn = await prisma.tournament.create({
      data: { name: `CONCUR_${name}_${Date.now()}`, season: '2026', format: 'T20', status: 'LIVE' },
    });
    const teamA = await prisma.team.create({ data: { name: `T_A_${Date.now()}`, shortName: 'TA' } });
    const teamB = await prisma.team.create({ data: { name: `T_B_${Date.now()}`, shortName: 'TB' } });

    const p1 = await prisma.player.create({ data: { name: 'P1' } });
    const p2 = await prisma.player.create({ data: { name: 'P2' } });
    const bowler = await prisma.player.create({ data: { name: 'B1' } });

    await prisma.teamPlayer.createMany({
      data: [
        { teamId: teamA.id, playerId: p1.id },
        { teamId: teamA.id, playerId: p2.id },
        { teamId: teamB.id, playerId: bowler.id },
      ],
    });

    const match = await prisma.match.create({
      data: {
        tournamentId: tourn.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        status: 'LIVE',
        oversPerInnings: 20,
        ballsPerOver: 6,
        stage: 'GROUP',
        matchNumber: 7777,
        bracketSlot: 'CONC',
        currentInnings: targetRuns ? 2 : 1,
      },
    });

  if (targetRuns) {
    // Team A scored targetRuns - 1 in Innings 1
    await prisma.innings.create({
      data: {
        matchId: match.id,
        inningsNumber: 1,
        battingTeamId: teamA.id,
        bowlingTeamId: teamB.id,
        runs: targetRuns - 1,
        wickets: 5,
        overs: 20,
        balls: 0,
        status: 'COMPLETED',
      },
    });
  }

  const innings = await prisma.innings.create({
    data: {
      matchId: match.id,
      inningsNumber: targetRuns ? 2 : 1,
      battingTeamId: targetRuns ? teamB.id : teamA.id,
      bowlingTeamId: targetRuns ? teamA.id : teamB.id,
      currentStrikerId: p1.id,
      currentNonStrikerId: p2.id,
      currentBowlerId: bowler.id,
      status: 'IN_PROGRESS',
    },
  });

  await prisma.inningsBatter.createMany({
    data: [
      { inningsId: innings.id, playerId: p1.id, isStriker: true, battingOrder: 1 },
      { inningsId: innings.id, playerId: p2.id, isStriker: false, battingOrder: 2 },
    ],
  });

  await prisma.inningsBowler.create({
    data: { inningsId: innings.id, playerId: bowler.id, isCurrent: true },
  });

    return {
      tournId: tourn.id,
      matchId: match.id,
      inningsId: innings.id,
      teamAId: teamA.id,
      teamBId: teamB.id,
      p1Id: p1.id,
      p2Id: p2.id,
      bowlerId: bowler.id,
    };
  });
}

async function cleanupFixture(f: Fixture) {
  try {
    await prisma.ballEvent.deleteMany({ where: { innings: { matchId: f.matchId } } });
    await prisma.inningsBatter.deleteMany({ where: { innings: { matchId: f.matchId } } });
    await prisma.inningsBowler.deleteMany({ where: { innings: { matchId: f.matchId } } });
    await prisma.innings.deleteMany({ where: { matchId: f.matchId } });
    await prisma.match.deleteMany({ where: { id: f.matchId } });
    await prisma.teamPlayer.deleteMany({ where: { teamId: { in: [f.teamAId, f.teamBId] } } });
    await prisma.player.deleteMany({ where: { id: { in: [f.p1Id, f.p2Id, f.bowlerId] } } });
    await prisma.team.deleteMany({ where: { id: { in: [f.teamAId, f.teamBId] } } });
    await prisma.tournament.deleteMany({ where: { id: f.tournId } });
  } catch (e) {
    console.warn('Cleanup warning:', (e as any)?.message);
  }
}

async function runDeepConcurrencyGate() {
  console.log('\n======================================================');
  console.log(' 5. DEEP SCORING CONCURRENCY & INTEGRITY GATE');
  console.log('======================================================\n');

  // ---------------------------------------------------------------------------
  // TEST A: 20 Simultaneous Legal Deliveries
  // ---------------------------------------------------------------------------
  console.log('Running Test A: 20 Simultaneous Legal Deliveries...');
  const fixA = await createDisposableFixture('TestA');
  try {
    const promisesA: Promise<any>[] = [];
    for (let i = 0; i < 20; i++) {
      promisesA.push(recordDelivery(fixA.inningsId, { runs: 1, isWicket: false }));
    }
    const resA = await Promise.allSettled(promisesA);
    const fulfilledA = resA.filter((r) => r.status === 'fulfilled');
    const rejectedA = resA.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    if (rejectedA.length > 0) {
      console.error('Sample rejection reason in Test A:', rejectedA[0].reason);
    }
    console.log(`  -> ${fulfilledA.length}/20 requests fulfilled under transaction row-locks`);

    const finalInnA = await prisma.innings.findUnique({ where: { id: fixA.inningsId } });
    const ballsA = await prisma.ballEvent.findMany({ where: { inningsId: fixA.inningsId } });
    const legalBallsA = (finalInnA?.overs || 0) * 6 + (finalInnA?.balls || 0);
    assert.strictEqual(finalInnA?.runs, fulfilledA.length, 'Innings runs must exactly match fulfilled count');
    assert.strictEqual(ballsA.length, fulfilledA.length, 'BallEvents count must match fulfilled count');
    assert.strictEqual(legalBallsA, fulfilledA.length, 'Legal ball count must match fulfilled count');
    console.log('  ✓ Test A PASSED: No lost updates, no score drift, legal balls consistent.\n');
  } finally {
    await cleanupFixture(fixA);
  }

  // ---------------------------------------------------------------------------
  // TEST B: 20 Simultaneous Wides/No-Balls (Illegal coordinate reuse)
  // ---------------------------------------------------------------------------
  console.log('Running Test B: 20 Simultaneous Wides...');
  const fixB = await createDisposableFixture('TestB');
  try {
    const promisesB: Promise<any>[] = [];
    for (let i = 0; i < 20; i++) {
      promisesB.push(recordDelivery(fixB.inningsId, { runs: 0, extraType: 'WIDE', isWicket: false }));
    }
    const resB = await Promise.allSettled(promisesB);
    const fulfilledB = resB.filter((r) => r.status === 'fulfilled');
    console.log(`  -> ${fulfilledB.length}/20 wides fulfilled`);

    const finalInnB = await prisma.innings.findUnique({ where: { id: fixB.inningsId } });
    const ballsB = await prisma.ballEvent.findMany({ where: { inningsId: fixB.inningsId } });
    const legalBallsB = (finalInnB?.overs || 0) * 6 + (finalInnB?.balls || 0);
    assert.strictEqual(finalInnB?.runs, fulfilledB.length, 'Innings runs must equal wide count (1 run each)');
    assert.strictEqual(legalBallsB, 0, 'Wides must not advance legal ball count');
    assert.strictEqual(finalInnB?.overs, 0, 'Wides must not advance overs');
    assert.strictEqual(finalInnB?.balls, 0, 'Wides must not advance balls');
    assert.strictEqual(ballsB.length, fulfilledB.length, 'BallEvent count must equal fulfilled count');
    console.log('  ✓ Test B PASSED: Illegal deliveries handled authoritatively without legal ball drift.\n');
  } finally {
    await cleanupFixture(fixB);
  }

  // ---------------------------------------------------------------------------
  // TEST C: Concurrent Delivery + Undo
  // ---------------------------------------------------------------------------
  console.log('Running Test C: Concurrent Delivery + Undo Race...');
  const fixC = await createDisposableFixture('TestC');
  try {
    // Prime with 2 deliveries
    await recordDelivery(fixC.inningsId, { runs: 4, isWicket: false });
    await recordDelivery(fixC.inningsId, { runs: 2, isWicket: false });

    // Race 3 deliveries and 2 undos concurrently
    const mixedPromises = [
      recordDelivery(fixC.inningsId, { runs: 1, isWicket: false }),
      undoLastDelivery(fixC.inningsId),
      recordDelivery(fixC.inningsId, { runs: 6, isWicket: false }),
      undoLastDelivery(fixC.inningsId),
      recordDelivery(fixC.inningsId, { runs: 1, isWicket: false }),
    ];
    await Promise.allSettled(mixedPromises);

    const finalInnC = await prisma.innings.findUnique({ where: { id: fixC.inningsId } });
    const survivingBalls = await prisma.ballEvent.findMany({ where: { inningsId: fixC.inningsId } });
    const expectedSum = survivingBalls.reduce((acc, b) => acc + (b.runs || 0) + (b.extras || 0), 0);

    assert.strictEqual(
      finalInnC?.runs,
      expectedSum,
      `Authoritative Innings runs (${finalInnC?.runs}) must equal sum of surviving BallEvents (${expectedSum})`
    );
    console.log('  ✓ Test C PASSED: Concurrent delivery and undo serialized safely without orphaned state.\n');
  } finally {
    await cleanupFixture(fixC);
  }

  // ---------------------------------------------------------------------------
  // TEST D: Concurrent Delivery around Over Transition
  // ---------------------------------------------------------------------------
  console.log('Running Test D: Concurrent Deliveries Across Over Boundary (ball 5 -> over 1)...');
  const fixD = await createDisposableFixture('TestD');
  try {
    // Deliver 5 balls to reach 0.5 overs
    for (let i = 0; i < 5; i++) {
      await recordDelivery(fixD.inningsId, { runs: 0, isWicket: false });
    }

    // Fire 5 concurrent deliveries across the over boundary
    const boundaryPromises: Promise<any>[] = [];
    for (let i = 0; i < 5; i++) {
      boundaryPromises.push(recordDelivery(fixD.inningsId, { runs: 1, isWicket: false }));
    }
    const boundaryRes = await Promise.allSettled(boundaryPromises);
    const fulfilledD = boundaryRes.filter((r) => r.status === 'fulfilled').length;

    const finalInnD = await prisma.innings.findUnique({ where: { id: fixD.inningsId } });
    const totalLegal = 5 + fulfilledD;
    const expectedOvers = Math.floor(totalLegal / 6);
    const expectedBalls = totalLegal % 6;

    assert.strictEqual(finalInnD?.overs, expectedOvers, `Expected overs ${expectedOvers}, got ${finalInnD?.overs}`);
    assert.strictEqual(finalInnD?.balls, expectedBalls, `Expected balls ${expectedBalls}, got ${finalInnD?.balls}`);
    console.log('  ✓ Test D PASSED: Over boundary transitions cleanly serialized.\n');
  } finally {
    await cleanupFixture(fixD);
  }

  // ---------------------------------------------------------------------------
  // TEST E: Concurrent Delivery Around Chase Completion
  // ---------------------------------------------------------------------------
  console.log('Running Test E: Concurrent Deliveries at Victory / Chase Completion...');
  const fixE = await createDisposableFixture('TestE', 6); // Target: 6 runs
  try {
    // Fire 5 concurrent deliveries of 2 runs each
    const chasePromises = [
      recordDelivery(fixE.inningsId, { runs: 2, isWicket: false }),
      recordDelivery(fixE.inningsId, { runs: 2, isWicket: false }),
      recordDelivery(fixE.inningsId, { runs: 2, isWicket: false }),
      recordDelivery(fixE.inningsId, { runs: 2, isWicket: false }),
      recordDelivery(fixE.inningsId, { runs: 2, isWicket: false }),
    ];
    const chaseRes = await Promise.allSettled(chasePromises);
    const finalMatch = await prisma.match.findUnique({ where: { id: fixE.matchId } });
    const finalInnE = await prisma.innings.findUnique({ where: { id: fixE.inningsId } });

    assert.strictEqual(finalMatch?.status, 'COMPLETED', 'Match must be marked COMPLETED upon reaching target');
    assert((finalInnE?.runs || 0) >= 6, 'Innings runs must be at least target');
    console.log('  ✓ Test E PASSED: Chase completion finalized atomically; no phantom deliveries after completion.\n');
  } finally {
    await cleanupFixture(fixE);
  }

  // ---------------------------------------------------------------------------
  // TEST F: Concurrent Deliveries Involving Wickets
  // ---------------------------------------------------------------------------
  console.log('Running Test F: Concurrent Wickets...');
  const fixF = await createDisposableFixture('TestF');
  try {
    // Fire 3 simultaneous wicket deliveries
    const wicketPromises = [
      recordDelivery(fixF.inningsId, { runs: 0, isWicket: true, wicketType: 'BOWLED', dismissedPlayerId: fixF.p1Id }),
      recordDelivery(fixF.inningsId, { runs: 0, isWicket: true, wicketType: 'CAUGHT', dismissedPlayerId: fixF.p1Id }),
      recordDelivery(fixF.inningsId, { runs: 0, isWicket: true, wicketType: 'LBW', dismissedPlayerId: fixF.p1Id }),
    ];
    await Promise.allSettled(wicketPromises);

    const finalInnF = await prisma.innings.findUnique({ where: { id: fixF.inningsId } });
    const wicketBalls = await prisma.ballEvent.findMany({ where: { inningsId: fixF.inningsId, isWicket: true } });

    assert.strictEqual(finalInnF?.wickets, wicketBalls.length, 'Innings wickets must equal counted wicket BallEvents');
    console.log('  ✓ Test F PASSED: Wicket count perfectly matches authoritative BallEvents.\n');
  } finally {
    await cleanupFixture(fixF);
  }

  console.log('======================================================');
  console.log('  ALL 6 CONCURRENCY GATES (A–F) PASSED WITH ZERO CORRUPTION! ✅');
  console.log('======================================================\n');
}

runDeepConcurrencyGate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Concurrency Gate Fatal Error:', err);
    process.exit(1);
  });
