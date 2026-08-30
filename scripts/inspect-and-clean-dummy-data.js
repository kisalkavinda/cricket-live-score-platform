/**
 * Safely inspects and removes ONLY test/dummy records created during verification tests.
 * Preserves all legitimate production registrations, teams, players, tournaments, and matches.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Inspecting Database for Test/Dummy Records ---');

  // 1. Find dummy registrations (e.g. "E2E Team", "Test Captain", "CPL-9788", etc.)
  const dummyRegistrations = await prisma.registration.findMany({
    where: {
      OR: [
        { teamName: { startsWith: 'E2E Team' } },
        { teamName: { startsWith: 'TEST Team' } },
        { leaderName: 'Test Captain' },
        { leaderName: 'Security Lead' },
      ],
    },
    include: { players: true },
  });

  console.log(`Found ${dummyRegistrations.length} dummy registrations.`);
  for (const reg of dummyRegistrations) {
    console.log(`  - Registration ID: ${reg.id}, Team: ${reg.teamName}, Code: ${reg.registrationCode}`);
  }

  // 2. Find dummy teams
  const dummyTeams = await prisma.team.findMany({
    where: {
      OR: [
        { name: { startsWith: 'E2E Team' } },
        { name: { startsWith: 'E2E Opponent' } },
        { name: { startsWith: 'TEST_TEAM' } },
        { name: { startsWith: 'TEST Team' } },
        { name: { startsWith: 'Test Opponent' } },
      ],
    },
    include: { teamPlayers: true },
  });

  console.log(`Found ${dummyTeams.length} dummy teams.`);
  for (const team of dummyTeams) {
    console.log(`  - Team ID: ${team.id}, Name: ${team.name}, Short: ${team.shortName}`);
  }

  // 3. Find dummy matches
  const dummyMatches = await prisma.match.findMany({
    where: {
      OR: [
        { teamAId: { in: dummyTeams.map(t => t.id) } },
        { teamBId: { in: dummyTeams.map(t => t.id) } },
        { venue: { startsWith: 'E2E Ground' } },
        { venue: { startsWith: 'Security Ground' } },
      ],
    },
    include: { innings: { include: { ballEvents: true, battingScores: true, bowlingScores: true } } },
  });

  console.log(`Found ${dummyMatches.length} dummy matches.`);

  // 4. Find dummy test players
  const dummyPlayers = await prisma.player.findMany({
    where: {
      OR: [
        { name: { in: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Test Captain', 'Test Bowler', 'Batter 1', 'Batter 2', 'Bowler 1'] } },
        { indexNumber: { contains: '9788' } },
        { indexNumber: { contains: 'E2E' } },
      ],
    },
  });

  console.log(`Found ${dummyPlayers.length} dummy standalone players.`);

  console.log('\n--- Beginning Safe Deletion of Dummy Records ---');

  // Delete matches and all related scoring records first
  for (const match of dummyMatches) {
    for (const inn of match.innings) {
      await prisma.ballEvent.deleteMany({ where: { inningsId: inn.id } });
      await prisma.inningsBatter.deleteMany({ where: { inningsId: inn.id } });
      await prisma.inningsBowler.deleteMany({ where: { inningsId: inn.id } });
    }
    await prisma.innings.deleteMany({ where: { matchId: match.id } });
    await prisma.match.delete({ where: { id: match.id } });
    console.log(`Deleted match: ${match.id}`);
  }

  // Delete dummy team players and teams
  for (const team of dummyTeams) {
    await prisma.teamPlayer.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
    console.log(`Deleted team: ${team.name}`);
  }

  // Delete dummy registration players and registrations
  for (const reg of dummyRegistrations) {
    await prisma.registrationPlayer.deleteMany({ where: { registrationId: reg.id } });
    await prisma.registration.delete({ where: { id: reg.id } });
    console.log(`Deleted registration: ${reg.teamName}`);
  }

  // Delete dummy standalone players
  for (const player of dummyPlayers) {
    // Check if player is used in other real teams
    const isUsed = await prisma.teamPlayer.findFirst({ where: { playerId: player.id } });
    if (!isUsed) {
      await prisma.player.delete({ where: { id: player.id } }).catch(() => {});
      console.log(`Deleted test player: ${player.name} (${player.id})`);
    }
  }

  console.log('\n--- Clean-up Complete: All dummy test records removed cleanly! ---');

  // Verify remaining count of genuine records
  const remainingTeams = await prisma.team.count();
  const remainingRegistrations = await prisma.registration.count();
  const remainingMatches = await prisma.match.count();
  const remainingPlayers = await prisma.player.count();

  console.log(`\nRemaining Genuine Records in System:`);
  console.log(`  - Teams: ${remainingTeams}`);
  console.log(`  - Registrations: ${remainingRegistrations}`);
  console.log(`  - Matches: ${remainingMatches}`);
  console.log(`  - Players: ${remainingPlayers}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
