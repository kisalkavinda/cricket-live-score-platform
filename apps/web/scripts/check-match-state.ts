import { prisma } from 'database';

async function main() {
  const match = await prisma.match.findUnique({
    where: { id: '2ab0fd5c-aa44-441b-87a8-d6820d63ba27' },
    include: {
      innings: true
    }
  });

  console.log('Match status:', match.status);
  console.log('Match currentInnings:', match.currentInnings);
  console.log('Total innings:', match.innings.length);
  for (const inn of match.innings) {
    console.log(`Innings ${inn.inningsNumber}: id=${inn.id} status=${inn.status} runs=${inn.runs} wickets=${inn.wickets} overs=${inn.overs}.${inn.balls} striker=${inn.currentStrikerId} nonStriker=${inn.currentNonStrikerId} bowler=${inn.currentBowlerId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
