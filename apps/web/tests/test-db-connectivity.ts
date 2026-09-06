import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('Testing default PrismaClient (DATABASE_URL)...');
  const p1 = new PrismaClient();
  try {
    const res1 = await p1.$queryRaw`SELECT 1 as connected;`;
    console.log('p1 (DATABASE_URL) SUCCESS:', res1);
  } catch (err: any) {
    console.error('p1 FAILED:', err.message);
  } finally {
    await p1.$disconnect();
  }

  const directUrl = process.env.DIRECT_URL;
  if (directUrl) {
    console.log('Testing PrismaClient with DIRECT_URL (port 5432)...');
    const p2 = new PrismaClient({
      datasources: {
        db: {
          url: directUrl,
        },
      },
    });
    try {
      const res2 = await p2.$queryRaw`SELECT 1 as connected;`;
      console.log('p2 (DIRECT_URL) SUCCESS:', res2);
    } catch (err: any) {
      console.error('p2 FAILED:', err.message);
    } finally {
      await p2.$disconnect();
    }
  }
}

main().catch(console.error);
