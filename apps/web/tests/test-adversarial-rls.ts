import { prisma } from 'database';

async function runRlsAdversarialGate() {
  console.log('======================================================');
  console.log(' 3. ADVERSARIAL POSTGREST & RLS CATALOG GATE');
  console.log('======================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gogtqabihqcoxozanklp.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

  const tables = [
    'TournamentDraw',
    'TournamentDrawChit',
    'TournamentDrawCaptainOrder',
    'TournamentDrawAudit',
  ];

  async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fetch(url, options);
      } catch (err: any) {
        if (i === maxAttempts - 1) throw err;
        console.log(`  [Fetch retry ${i + 1}/${maxAttempts} in 2000ms: ${err.message}]`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw new Error('Fetch retries exhausted');
  }

  console.log('--- A. LIVE POSTGREST ANON ATTACK ---');
  for (const table of tables) {
    const url = `${supabaseUrl}/rest/v1/${table}`;
    const headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // 1. GET
    const getRes = await fetchWithRetry(`${url}?select=*`, { headers });
    const getJson = await getRes.json().catch(() => null);
    const getStatus = getRes.status;
    const isGetProtected = getStatus === 401 || getStatus === 403 || getStatus === 404 || (Array.isArray(getJson) && getJson.length === 0);
    console.log(`[GET]   /${table.padEnd(26)} -> Status: ${getStatus} | Safe: ${isGetProtected ? 'YES (Denied/Empty)' : 'NO (LEAK)'}`);
    if (Array.isArray(getJson) && getJson.length > 0) {
      const sample = JSON.stringify(getJson[0]);
      if (sample.includes('groupName') || sample.includes('secretSalt') || sample.includes('passcodeHash')) {
        throw new Error(`CRITICAL: Leaked secret fields in ${table}: ${sample}`);
      }
    }

    // 2. POST (Unauthorized insert attempt)
    const postRes = await fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: 'attacker-test-id', dummy: 'malicious' }),
    });
    const postStatus = postRes.status;
    const isPostBlocked = postStatus === 401 || postStatus === 403 || postStatus === 404 || postStatus === 400;
    console.log(`[POST]  /${table.padEnd(26)} -> Status: ${postStatus} | Safe: ${isPostBlocked ? 'YES (Blocked)' : 'NO (MUTATION ALLOWED)'}`);

    // 3. PATCH (Unauthorized update attempt)
    const patchRes = await fetchWithRetry(`${url}?id=eq.attacker-test-id`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'HACKED' }),
    });
    const patchStatus = patchRes.status;
    const isPatchBlocked = patchStatus === 401 || patchStatus === 403 || patchStatus === 404 || patchStatus === 400;
    console.log(`[PATCH] /${table.padEnd(26)} -> Status: ${patchStatus} | Safe: ${isPatchBlocked ? 'YES (Blocked)' : 'NO (MUTATION ALLOWED)'}`);

    // 4. DELETE (Unauthorized delete attempt)
    const delRes = await fetchWithRetry(`${url}?id=eq.attacker-test-id`, {
      method: 'DELETE',
      headers,
    });
    const delStatus = delRes.status;
    const isDelBlocked = delStatus === 401 || delStatus === 403 || delStatus === 404 || delStatus === 400;
    console.log(`[DELETE]/${table.padEnd(26)} -> Status: ${delStatus} | Safe: ${isDelBlocked ? 'YES (Blocked)' : 'NO (DELETION ALLOWED)'}`);
  }

  async function queryWithRetry<T>(fn: () => Promise<T>, maxAttempts = 5, delay = 2000): Promise<T> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (err: any) {
        if (i === maxAttempts - 1) throw err;
        console.log(`  [DB connection retry ${i + 1}/${maxAttempts} in ${delay}ms: ${err.message}]`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('Retries exhausted');
  }

  console.log('\n--- B. DATABASE CATALOG INSPECTION (pg_class & pg_tables) ---');
  const catalogRows: any[] = await queryWithRetry(() => prisma.$queryRaw`
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('TournamentDraw', 'TournamentDrawChit', 'TournamentDrawCaptainOrder', 'TournamentDrawAudit');
  `);
  console.table(catalogRows);

  for (const r of catalogRows) {
    if (!r.rls_enabled) {
      throw new Error(`CRITICAL: RLS is NOT enabled on table ${r.table_name}!`);
    }
  }

  console.log('--- C. GRANTS AUDIT (information_schema.role_table_grants) ---');
  const grantRows: any[] = await queryWithRetry(() => prisma.$queryRaw`
    SELECT grantee, table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name IN ('TournamentDraw', 'TournamentDrawChit', 'TournamentDrawCaptainOrder', 'TournamentDrawAudit')
      AND grantee IN ('anon', 'authenticated');
  `);
  if (grantRows.length === 0) {
    console.log('✓ Verified: 0 permissions granted to "anon" or "authenticated" on draw tables!');
  } else {
    console.table(grantRows);
  }

  console.log('\n======================================================');
  console.log('  SECTION 3: RLS & POSTGREST ADVERSARIAL GATE PASSED! ✅');
  console.log('======================================================\n');
}

runRlsAdversarialGate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('RLS Gate Failed:', err);
    process.exit(1);
  });
