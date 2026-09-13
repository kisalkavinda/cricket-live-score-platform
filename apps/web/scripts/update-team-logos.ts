import { prisma } from 'database';

async function updateLogos() {
  const teams = await prisma.team.findMany({
    where: {
      name: { in: ['OC-42', '42-OC', 'oc-42', '42-oc'] },
    },
    select: { id: true, name: true, shortName: true, logoUrl: true },
  });

  console.log('Current teams found:', teams);

  // 42-oc team logo:
  // https://drive.google.com/file/d/14hSnZOpc5IYTSgWr1S9G5JrDlXbrBbQ4/view?usp=drive_link
  const logo42OC = 'https://drive.google.com/file/d/14hSnZOpc5IYTSgWr1S9G5JrDlXbrBbQ4/view?usp=drive_link';

  // oc-42 team logo:
  // https://drive.google.com/file/d/1cCcwln9Y2xntLDoLdtSugxxQH8qF5ekV/view?usp=drive_link
  const logoOC42 = 'https://drive.google.com/file/d/1cCcwln9Y2xntLDoLdtSugxxQH8qF5ekV/view?usp=drive_link';

  for (const team of teams) {
    if (team.name.toUpperCase() === '42-OC') {
      const updated = await prisma.team.update({
        where: { id: team.id },
        data: { logoUrl: logo42OC },
      });
      console.log(`Updated 42-OC (${team.id}) logo to:`, updated.logoUrl);
    } else if (team.name.toUpperCase() === 'OC-42') {
      const updated = await prisma.team.update({
        where: { id: team.id },
        data: { logoUrl: logoOC42 },
      });
      console.log(`Updated OC-42 (${team.id}) logo to:`, updated.logoUrl);
    }
  }

  // Also print all teams in DB to see their logos
  const allTeams = await prisma.team.findMany({
    select: { id: true, name: true, logoUrl: true },
  });
  console.log('All teams in DB:');
  for (const t of allTeams) {
    console.log(`- ${t.name}: ${t.logoUrl}`);
  }
}

updateLogos()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
