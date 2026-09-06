const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, 'apps/web/.env.local'), 'utf8');
const m = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
const connStr = m[1];

async function run() {
  console.log('Testing port 6543...');
  const c1 = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  try {
    await c1.connect();
    const r = await c1.query('SELECT current_user, current_database(), now()');
    console.log('c1 success:', r.rows[0]);
    await c1.end();
  } catch (e) {
    console.error('c1 error:', e.message);
  }

  console.log('Testing port 5432 (DIRECT_URL)...');
  const m2 = env.match(/DIRECT_URL=["']?([^"'\r\n]+)/);
  if (m2) {
    const directStr = m2[1];
    const c2 = new Client({ connectionString: directStr, ssl: { rejectUnauthorized: false } });
    try {
      await c2.connect();
      const r = await c2.query('SELECT current_user, current_database(), now()');
      console.log('c2 success:', r.rows[0]);
      await c2.end();
    } catch (e) {
      console.error('c2 error:', e.message);
    }
  }
}

run();
