import { prisma } from 'database';

async function main() {
  const matches = await (prisma as any).match.findMany({
    take: 10,
    orderBy: { updatedAt: 'desc' },
    include: {
      innings: { orderBy: { inningsNumber: 'asc' } },
      teamA: true,
      teamB: true,
    },
  });

  console.log(`Found ${matches.length} matches`);
  for (const match of matches) {
    console.log('--- MATCH ---');
    console.log(`ID: ${match.id} | Status: ${match.status} | CurrentInn: ${match.currentInnings} | OversPerInnings: ${match.oversPerInnings}`);
    console.log(`Teams: ${match.teamA?.name} vs ${match.teamB?.name} | Result: ${match.resultNote}`);
    for (const inn of match.innings) {
      console.log(`  Inn ${inn.inningsNumber}: id=${inn.id} status=${inn.status} runs=${inn.runs} wkts=${inn.wickets} ov=${inn.overs}.${inn.balls} striker=${inn.currentStrikerId} nonStriker=${inn.currentNonStrikerId} bowler=${inn.currentBowlerId}`);
    }
  }
}

main().catch(console.error).finally(() => (prisma as any).$disconnect());



