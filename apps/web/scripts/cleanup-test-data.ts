import { prisma } from 'database';

async function main() {
  const matches = await prisma.match.findMany({
    where: { tournament: { name: { startsWith: 'TEST_' } } },
    select: { id: true },
  });
  const matchIds = matches.map((m) => m.id);
  if (matchIds.length > 0) {
    await prisma.ballEvent.deleteMany({ where: { innings: { matchId: { in: matchIds } } } });
    await prisma.innings.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
  }

  await prisma.tournamentSquad.deleteMany({ where: { tournament: { name: { startsWith: 'TEST_' } } } });
  await prisma.tournamentTeam.deleteMany({ where: { tournament: { name: { startsWith: 'TEST_' } } } });
  await prisma.tournamentStage.deleteMany({ where: { tournament: { name: { startsWith: 'TEST_' } } } });
  await prisma.tournament.deleteMany({ where: { name: { startsWith: 'TEST_' } } });

  const deletedTeams = await prisma.team.deleteMany({
    where: { name: { startsWith: 'TEST_' } },
  });
  console.log('Cleaned leftover test teams count:', deletedTeams.count);

  const realTeams = await prisma.team.count();
  const realPlayers = await prisma.player.count();
  console.log(`Verified DB State: Real Teams: ${realTeams}, Real Players: ${realPlayers}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
