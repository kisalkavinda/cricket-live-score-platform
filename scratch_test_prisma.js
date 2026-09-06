const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, 'apps/web/.env.local'), 'utf8');
const m = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
let connStr = m[1];
if (!connStr.includes('sslmode=')) {
  connStr += '&sslmode=require';
}

console.log('Testing Prisma with connection string:', connStr.replace(/:[^:@]+@/, ':***@'));
const prisma = new PrismaClient({
  datasources: {
    db: { url: connStr },
  },
});

async function main() {
  const t0 = Date.now();
  const res = await prisma.$queryRawUnsafe('SELECT 1 as val, current_database(), now()');
  console.log(`Success in ${Date.now() - t0}ms:`, res);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Prisma test error:', err);
  process.exit(1);
});
