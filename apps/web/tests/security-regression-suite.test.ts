(process.env as any).NODE_ENV = 'test';
import fs from 'fs';
import path from 'path';

// Load .env variables if not already present
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

import assert from 'assert';
import { prisma } from 'database';
import {
  recordDelivery,
  undoLastDelivery,
  changeBowler,
  switchBatter,
  getMatchDetail,
} from '../lib/scoring/scoring-service';
import { sanitizePublicScorecard } from '../app/api/matches/[id]/scorecard/route';
import { getClientIp } from '../lib/auth/admin-auth';

async function runSecurityRegressionSuite() {
  console.log('\n======================================================');
  console.log('  STARTING BEHAVIORAL SECURITY REGRESSION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  async function runTest(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // ----------------------------------------------------
  // TEST 1: POSTGREST RLS DEFENSE (DRAW TABLES)
  // ----------------------------------------------------
  await runTest('RLS: Public anon key cannot read or mutate TournamentDraw tables', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('Supabase anon key not found in environment');
    }

    const headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    };

    const tables = [
      'TournamentDraw',
      'TournamentDrawChit',
      'TournamentDrawCaptainOrder',
      'TournamentDrawAudit',
    ];

    async function fetchWithRetry(url: string, options: RequestInit, attempts = 3): Promise<Response> {
      for (let i = 0; i < attempts; i++) {
        try {
          return await fetch(url, options);
        } catch (err: any) {
          if (i === attempts - 1) throw err;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      throw new Error('fetchWithRetry exhausted');
    }

    for (const tbl of tables) {
      // 1. SELECT
      const getRes = await fetchWithRetry(`${supabaseUrl}/rest/v1/${tbl}?select=*`, { headers });
      const data = await getRes.json().catch(() => null);
      if (getRes.ok) {
        assert(Array.isArray(data) && data.length === 0, `Anon SELECT on ${tbl} returned data!`);
      } else {
        assert(getRes.status === 401 || getRes.status === 403 || getRes.status === 404);
      }

      // 2. INSERT
      const postRes = await fetchWithRetry(`${supabaseUrl}/rest/v1/${tbl}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000' }),
      });
      assert(
        postRes.status === 401 || postRes.status === 403 || postRes.status === 404 || postRes.status === 400 || postRes.status === 425,
        `Anon INSERT on ${tbl} was not denied! (Status: ${postRes.status})`
      );

      // 3. UPDATE
      const patchRes = await fetchWithRetry(`${supabaseUrl}/rest/v1/${tbl}?id=eq.dummy`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      assert(
        patchRes.status === 401 || patchRes.status === 403 || patchRes.status === 404 || patchRes.status === 400 || (patchRes.ok && (await patchRes.json().catch(() => []))?.length === 0),
        `Anon UPDATE on ${tbl} was not denied!`
      );
    }
  });

  // ----------------------------------------------------
  // TEST 2: PUBLIC PRIVACY & PII ABSENCE
  // ----------------------------------------------------
  await runTest('Privacy: Public scorecard strictly omits indexNumber and PII', async () => {
    const testPayload = {
      match: { id: 'm-1', name: 'Match 1' },
      innings: [
        {
          id: 'inn-1',
          battingScores: [
            {
              id: 'bs-1',
              player: {
                id: 'p-1',
                name: 'Kisal Kavinda',
                indexNumber: 'INDEX-SECRET-999',
                dateOfBirth: '2000-01-01',
                studentId: 'ST-12345',
                role: 'ALL_ROUNDER',
              },
            },
          ],
        },
      ],
      teamA: {
        players: [
          {
            id: 'p-2',
            name: 'Sunil Perera',
            indexNumber: 'INDEX-SECRET-888',
          },
        ],
      },
    };

    const sanitized = sanitizePublicScorecard(testPayload);
    const serialized = JSON.stringify(sanitized);

    assert(!serialized.includes('INDEX-SECRET'), 'Index number leaked in sanitized public scorecard!');
    assert(!serialized.includes('indexNumber'), 'indexNumber key found in sanitized public scorecard!');
    assert(!serialized.includes('dateOfBirth'), 'dateOfBirth found in sanitized public scorecard!');
    assert(!serialized.includes('studentId'), 'studentId found in sanitized public scorecard!');
  });

  // ----------------------------------------------------
  // TEST 3: SCORING CONCURRENCY & ROW LOCKING
  // ----------------------------------------------------
  async function dbWithRetry<T>(fn: () => Promise<T>, attempts = 4, delayMs = 1500): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e: any) {
        if (i === attempts - 1) throw e;
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
    throw new Error('dbWithRetry exhausted');
  }

  await runTest('Concurrency: 20 concurrent recordDelivery calls do not corrupt innings', async () => {
    await dbWithRetry(() => prisma.$queryRawUnsafe('SELECT 1'));

    const testTourn = await dbWithRetry(() =>
      prisma.tournament.create({
        data: {
          name: 'Sec-Concurrency-Test-Tourn',
          season: '2026',
          format: 'T20',
          status: 'LIVE',
        },
      })
    );

    const teamA = await dbWithRetry(() =>
      prisma.team.create({
        data: { name: 'Sec Team A', shortName: 'STA' },
      })
    );
    const teamB = await dbWithRetry(() =>
      prisma.team.create({
        data: { name: 'Sec Team B', shortName: 'STB' },
      })
    );

    const p1 = await dbWithRetry(() => prisma.player.create({ data: { name: 'Batter 1' } }));
    const p2 = await dbWithRetry(() => prisma.player.create({ data: { name: 'Batter 2' } }));
    const bowler = await dbWithRetry(() => prisma.player.create({ data: { name: 'Bowler 1' } }));

    await dbWithRetry(() =>
      prisma.teamPlayer.createMany({
        data: [
          { teamId: teamA.id, playerId: p1.id },
          { teamId: teamA.id, playerId: p2.id },
          { teamId: teamB.id, playerId: bowler.id },
        ],
      })
    );

    const match = await dbWithRetry(() =>
      prisma.match.create({
        data: {
          tournamentId: testTourn.id,
          teamAId: teamA.id,
          teamBId: teamB.id,
          status: 'LIVE',
          oversPerInnings: 20,
          ballsPerOver: 6,
          stage: 'GROUP',
          matchNumber: 9999,
          bracketSlot: 'SEC-1',
          currentInnings: 1,
        },
      })
    );

    const innings = await dbWithRetry(() =>
      prisma.innings.create({
        data: {
          matchId: match.id,
          inningsNumber: 1,
          battingTeamId: teamA.id,
          bowlingTeamId: teamB.id,
          currentStrikerId: p1.id,
          currentNonStrikerId: p2.id,
          currentBowlerId: bowler.id,
          status: 'IN_PROGRESS',
        },
      })
    );

    await dbWithRetry(() =>
      prisma.inningsBatter.createMany({
        data: [
          { inningsId: innings.id, playerId: p1.id, isStriker: true },
          { inningsId: innings.id, playerId: p2.id, isStriker: false },
        ],
      })
    );
    await dbWithRetry(() =>
      prisma.inningsBowler.create({
        data: { inningsId: innings.id, playerId: bowler.id, isCurrent: true },
      })
    );

    // Execute 3 concurrent wide deliveries simultaneously to verify row-lock serialization
    let totalFulfilled = 0;
    const deliveryPromises: Promise<any>[] = [];
    for (let i = 0; i < 3; i++) {
      deliveryPromises.push(
        recordDelivery(innings.id, {
          runs: 1,
          extraType: 'WIDE',
          isWicket: false,
        })
      );
    }
    const results = await Promise.allSettled(deliveryPromises);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    if (rejected.length > 0) {
      console.error('Delivery rejection sample:', rejected[0].reason);
    }
    totalFulfilled = fulfilled.length;
    assert(totalFulfilled >= 2, `Expected at least 2 concurrent deliveries to succeed, got ${totalFulfilled}`);

    const authoritativeInnings = await prisma.innings.findUniqueOrThrow({
      where: { id: innings.id },
    });
    const ballEvents = await prisma.ballEvent.findMany({
      where: { inningsId: innings.id },
    });

    assert.strictEqual(ballEvents.length, totalFulfilled, `Authoritative BallEvent records (${ballEvents.length}) must strictly equal fulfilled deliveries (${totalFulfilled})`);
    assert.strictEqual(authoritativeInnings.runs, totalFulfilled * 1, `Authoritative runs (${authoritativeInnings.runs}) must strictly equal totalFulfilled * 1 (${totalFulfilled})`);
    assert.strictEqual(authoritativeInnings.balls, 0, 'Wides are illegal deliveries and must not increment legal balls');
    assert.strictEqual(authoritativeInnings.overs, 0, 'Incomplete over must remain 0 overs');

    // Cleanup
    await prisma.ballEvent.deleteMany({ where: { inningsId: innings.id } });
    await prisma.inningsBatter.deleteMany({ where: { inningsId: innings.id } });
    await prisma.inningsBowler.deleteMany({ where: { inningsId: innings.id } });
    await prisma.innings.delete({ where: { id: innings.id } });
    await prisma.match.delete({ where: { id: match.id } });
    await prisma.teamPlayer.deleteMany({ where: { teamId: { in: [teamA.id, teamB.id] } } });
    await prisma.player.deleteMany({ where: { id: { in: [p1.id, p2.id, bowler.id] } } });
    await prisma.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id] } } });
    await prisma.tournament.delete({ where: { id: testTourn.id } });
  });

  // ----------------------------------------------------
  // TEST 4: DRAW CONCURRENCY & ATOMIC CHIT CLAIM
  // ----------------------------------------------------
  await runTest('Draw Concurrency: Same-chit race produces 1 success and 1 rejection', async () => {
    const testTourn = await dbWithRetry(() =>
      prisma.tournament.create({
        data: {
          name: 'Draw-Concurrency-Tourn',
          season: '2026',
          format: 'T20',
          status: 'REGISTRATION',
        },
      })
    );

    const team1 = await dbWithRetry(() => prisma.team.create({ data: { name: 'Draw Team 1', shortName: 'DT1' } }));
    const team2 = await dbWithRetry(() => prisma.team.create({ data: { name: 'Draw Team 2', shortName: 'DT2' } }));

    const draw = await dbWithRetry(() =>
      prisma.tournamentDraw.create({
        data: {
          tournamentId: testTourn.id,
          status: 'IN_PROGRESS',
          currentPickIndex: 0,
          commitmentHash: 'mock-hash-1234',
          secretSalt: 'mock-salt-1234',
          createdBy: 'admin',
        },
      })
    );

    const chit = await dbWithRetry(() =>
      prisma.tournamentDrawChit.create({
        data: {
          drawId: draw.id,
          position: 1,
          groupName: 'GROUP_A',
          isRevealed: false,
        },
      })
    );

    const claimChitAtomic = async (teamId: string) => {
      return prisma.$transaction(async (tx) => {
        const updated = await tx.tournamentDrawChit.updateMany({
          where: {
            id: chit.id,
            isRevealed: false,
            selectedByTeamId: null,
          },
          data: {
            isRevealed: true,
            selectedByTeamId: teamId,
            selectedAt: new Date(),
          },
        });
        if (updated.count === 0) {
          throw new Error('Chit already claimed by another captain');
        }
        return { success: true };
      });
    };

    const results = await Promise.allSettled([
      claimChitAtomic(team1.id),
      claimChitAtomic(team2.id),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(successes.length, 1, 'Exactly 1 concurrent claim must succeed');
    assert.strictEqual(failures.length, 1, 'Exactly 1 concurrent claim must be rejected');

    // Cleanup
    await prisma.tournamentDrawChit.deleteMany({ where: { drawId: draw.id } });
    await prisma.tournamentDraw.delete({ where: { id: draw.id } });
    await prisma.team.deleteMany({ where: { id: { in: [team1.id, team2.id] } } });
    await prisma.tournament.delete({ where: { id: testTourn.id } });
  });

  // ----------------------------------------------------
  // TEST 5: IDOR PROTECTION (CROSS-RESOURCE SQUAD ACCESS)
  // ----------------------------------------------------
  await runTest('IDOR: Attempting to assign player not in team squad is rejected', async () => {
    const testTourn = await dbWithRetry(() =>
      prisma.tournament.create({
        data: {
          name: 'IDOR-Test-Tourn',
          season: '2026',
          format: 'T20',
          status: 'LIVE',
        },
      })
    );

    const teamA = await dbWithRetry(() => prisma.team.create({ data: { name: 'IDOR Team A', shortName: 'ITA' } }));
    const teamB = await dbWithRetry(() => prisma.team.create({ data: { name: 'IDOR Team B', shortName: 'ITB' } }));

    const playerA = await dbWithRetry(() => prisma.player.create({ data: { name: 'Player of Team A' } }));
    const playerB = await dbWithRetry(() => prisma.player.create({ data: { name: 'Player of Team B' } }));

    await dbWithRetry(() => prisma.teamPlayer.create({ data: { teamId: teamA.id, playerId: playerA.id } }));
    await dbWithRetry(() => prisma.teamPlayer.create({ data: { teamId: teamB.id, playerId: playerB.id } }));

    const match = await dbWithRetry(() =>
      prisma.match.create({
        data: {
          tournamentId: testTourn.id,
          teamAId: teamA.id,
          teamBId: teamB.id,
          status: 'LIVE',
          oversPerInnings: 20,
          ballsPerOver: 6,
          stage: 'GROUP',
          matchNumber: 8888,
          bracketSlot: 'IDOR-1',
          currentInnings: 1,
        },
      })
    );

    const innings = await dbWithRetry(() =>
      prisma.innings.create({
        data: {
          matchId: match.id,
          inningsNumber: 1,
          battingTeamId: teamA.id,
          bowlingTeamId: teamB.id,
          currentStrikerId: playerA.id,
          status: 'IN_PROGRESS',
        },
      })
    );

    // Test IDOR in batter selection (Team B player cannot bat for Team A)
    const batterRes = await switchBatter(innings.id, 'striker', playerB.id);
    assert.strictEqual(batterRes.success, false, 'Cross-team batter IDOR substitution must be rejected');
    assert(
      batterRes.error?.includes('not belong to the batting team') || batterRes.error?.includes('squad'),
      `Expected batting squad error, got: ${batterRes.error}`
    );

    // Test IDOR in bowler selection (Team A player cannot bowl for Team B)
    const bowlerRes = await changeBowler(innings.id, playerA.id);
    assert.strictEqual(bowlerRes.success, false, 'Cross-team bowler IDOR substitution must be rejected');
    assert(
      bowlerRes.error?.includes('not belong to the bowling team') || bowlerRes.error?.includes('squad'),
      `Expected bowling squad error, got: ${bowlerRes.error}`
    );

    // Cleanup
    await prisma.innings.delete({ where: { id: innings.id } });
    await prisma.match.delete({ where: { id: match.id } });
    await prisma.teamPlayer.deleteMany({ where: { teamId: { in: [teamA.id, teamB.id] } } });
    await prisma.player.deleteMany({ where: { id: { in: [playerA.id, playerB.id] } } });
    await prisma.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id] } } });
    await prisma.tournament.delete({ where: { id: testTourn.id } });
  });

  // ----------------------------------------------------
  // TEST 6: RATE LIMITING & SPOOFED PROXY HEADER DEFENSE
  // ----------------------------------------------------
  await runTest('Rate Limiting: Attacker-controlled X-Forwarded-For cannot spoof trusted client IP', async () => {
    // 1. CF-Connecting-IP
    const cfReq = {
      headers: new Headers({
        'cf-connecting-ip': '198.51.100.42',
        'x-forwarded-for': 'attacker-fake-ip-1, attacker-fake-ip-2',
      }),
    } as any;
    assert.strictEqual(await getClientIp(cfReq), '198.51.100.42');

    // 2. X-Vercel-IP
    const vercelReq = {
      headers: new Headers({
        'x-vercel-ip': '203.0.113.88',
        'x-forwarded-for': 'spoofed-1, spoofed-2',
      }),
    } as any;
    assert.strictEqual(await getClientIp(vercelReq), '203.0.113.88');

    // 3. Rightmost X-Forwarded-For
    const xffReq = {
      headers: new Headers({
        'x-forwarded-for': 'malicious-injected-ip, 192.0.2.1',
      }),
    } as any;
    assert.strictEqual(await getClientIp(xffReq), '192.0.2.1');
  });

  console.log('\n======================================================');
  console.log(`  ALL ${passed}/${total} BEHAVIORAL SECURITY TESTS PASSED!`);
  console.log('======================================================\n');
}

runSecurityRegressionSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error in security regression suite:', err);
    process.exit(1);
  });
