(process.env as any).NODE_ENV = 'test';
import { prisma } from 'database';
import { recordDelivery } from '../lib/scoring/scoring-service';

async function main() {
  console.log('Creating test fixture...');
  const tourn = await prisma.tournament.create({
    data: { name: `DEBUG_${Date.now()}`, season: '2026', format: 'T20', status: 'LIVE' },
  });
  const teamA = await prisma.team.create({ data: { name: `TA_${Date.now()}`, shortName: 'TA' } });
  const teamB = await prisma.team.create({ data: { name: `TB_${Date.now()}`, shortName: 'TB' } });
  const p1 = await prisma.player.create({ data: { name: 'P1' } });
  const p2 = await prisma.player.create({ data: { name: 'P2' } });
  const bowler = await prisma.player.create({ data: { name: 'B1' } });

  const match = await prisma.match.create({
    data: {
      tournamentId: tourn.id,
      teamAId: teamA.id,
      teamBId: teamB.id,
      status: 'LIVE',
      oversPerInnings: 20,
      ballsPerOver: 6,
      stage: 'GROUP',
      currentInnings: 1,
    },
  });

  const innings = await prisma.innings.create({
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
  });

  console.log('Fixture created. Testing 1 delivery sequentially first...');
  const t0 = Date.now();
  const d1 = await recordDelivery(innings.id, { runs: 1, isWicket: false });
  console.log(`Single delivery took ${Date.now() - t0}ms:`, d1.success);

  console.log('Testing 3 concurrent deliveries...');
  const t1 = Date.now();
  const results = await Promise.allSettled([
    recordDelivery(innings.id, { runs: 1, isWicket: false }),
    recordDelivery(innings.id, { runs: 1, isWicket: false }),
    recordDelivery(innings.id, { runs: 1, isWicket: false }),
  ]);
  console.log(`3 concurrent deliveries took ${Date.now() - t1}ms:`);
  for (const r of results) {
    console.log('  result:', r.status, r.status === 'rejected' ? (r as any).reason : 'OK');
  }

  // Cleanup
  await prisma.ballEvent.deleteMany({ where: { inningsId: innings.id } });
  await prisma.inningsBatter.deleteMany({ where: { inningsId: innings.id } });
  await prisma.inningsBowler.deleteMany({ where: { inningsId: innings.id } });
  await prisma.innings.delete({ where: { id: innings.id } });
  await prisma.match.delete({ where: { id: match.id } });
  await prisma.player.deleteMany({ where: { id: { in: [p1.id, p2.id, bowler.id] } } });
  await prisma.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id] } } });
  await prisma.tournament.delete({ where: { id: tourn.id } });
  console.log('Test completed & cleaned up!');
}

main().catch(console.error);
