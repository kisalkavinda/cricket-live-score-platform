const { Client } = require('pg');
const fs = require('fs');

// Read DATABASE_URL from .env
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
const directMatch = envContent.match(/DIRECT_URL=["']?([^"'\r\n]+)/);

async function test(name, connectionString) {
  console.log(`Testing ${name}...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    const res = await client.query('SELECT current_user, current_database(), version();');
    console.log(`[SUCCESS] ${name}:`, res.rows[0]);
    await client.end();
  } catch (err) {
    console.error(`[ERROR] ${name}: code=${err.code}, message=${err.message}`);
    try { await client.end(); } catch {}
  }
}

async function main() {
  if (match) await test('DATABASE_URL (port 6543)', match[1]);
  if (directMatch) await test('DIRECT_URL (port 5432)', directMatch[1]);
}

main();
