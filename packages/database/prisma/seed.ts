import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding ...`)

  // Create Venues
  const venue1 = await prisma.venue.create({
    data: {
      name: 'Central City Ground',
      city: 'Colombo',
    },
  })

  // Create Teams
  const team1 = await prisma.team.create({
    data: {
      name: 'Thunderbolts CC',
      shortName: 'TCC',
      city: 'Colombo',
    },
  })

  const team2 = await prisma.team.create({
    data: {
      name: 'Lightning Strikers',
      shortName: 'LST',
      city: 'Kandy',
    },
  })

  // Create Players
  const player1 = await prisma.player.create({
    data: {
      name: 'John Doe',
      role: 'BATTER',
      battingStyle: 'Right-hand bat',
      jerseyNumber: 10,
    },
  })

  const player2 = await prisma.player.create({
    data: {
      name: 'Jane Smith',
      role: 'ALL_ROUNDER',
      bowlingStyle: 'Right-arm medium',
      jerseyNumber: 7,
    },
  })

  // Assign Players to Teams
  await prisma.teamPlayer.create({
    data: { teamId: team1.id, playerId: player1.id },
  })
  
  await prisma.teamPlayer.create({
    data: { teamId: team2.id, playerId: player2.id },
  })

  // Create Tournament
  const tournament = await prisma.tournament.create({
    data: {
      name: 'Soft Ball Championship 2026',
      season: '2026',
      format: 'T20',
      status: 'REGISTRATION',
    },
  })

  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
