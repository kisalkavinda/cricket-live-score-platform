/**
 * HTTP ENDPOINT SMOKE CHECK & SYSTEM VERIFICATION
 * Tests live HTTP endpoints against http://localhost:3000
 */

const http = require('http');

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, name, detail) {
  if (condition) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
    failed++;
    errors.push(name);
  }
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(`http://localhost:3000${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runHttpCheck() {
  console.log('\n============================================================');
  console.log(' HTTP LIVE ENDPOINT VERIFICATION (http://localhost:3000)');
  console.log('============================================================\n');

  // 1. Home / Public Landing Page
  const homeRes = await get('/');
  assert(homeRes.status === 200, 'HTTP-01: Public Homepage loads (Status 200)');
  assert(homeRes.headers['content-security-policy'], 'HTTP-02: Content-Security-Policy header present on Homepage');
  assert(homeRes.headers['x-frame-options'] === 'DENY', 'HTTP-03: X-Frame-Options: DENY header present');

  // 2. Public Live Match API
  const liveRes = await get('/api/matches/live');
  assert(liveRes.status === 200, 'HTTP-04: /api/matches/live returns Status 200');
  const liveData = JSON.parse(liveRes.body);
  assert(Array.isArray(liveData.matches), 'HTTP-05: /api/matches/live returns valid matches array');

  // 3. Tournament Stats API
  const statsRes = await get('/api/tournament/stats');
  assert(statsRes.status === 200, 'HTTP-06: /api/tournament/stats returns Status 200');
  const statsData = JSON.parse(statsRes.body);
  assert(typeof statsData === 'object', 'HTTP-07: /api/tournament/stats returns valid stats payload');

  // 4. Public Scorecard Page
  const scorecardRes = await get('/scorecard');
  assert(scorecardRes.status === 200, 'HTTP-08: /scorecard loads (Status 200)');

  // 5. Public Registration Page
  const registerRes = await get('/register');
  assert(registerRes.status === 200, 'HTTP-09: /register page loads (Status 200)');

  // 6. Direct /admin Probing (Edge Security Check)
  const adminProbe = await get('/admin');
  assert(adminProbe.status === 404, 'HTTP-10: Probe to /admin returns 404 Not Found (Edge blocked)');

  const adminSlugProbe = await get('/admin/dashboard');
  assert(adminSlugProbe.status === 404, 'HTTP-11: Probe to /admin/dashboard returns 404 Not Found');

  // 7. Secret Admin Entry Point
  const secretAdminRes = await get('/management-cpl-2026');
  assert(secretAdminRes.status === 200, 'HTTP-12: Secret admin entry page /management-cpl-2026 loads (Status 200)');

  // 8. Test Registration Submission API (Validation & Rate Limiting)
  const testSuffix = Date.now().toString().slice(-4);
  const invalidRegRes = await post('/api/registrations', {
    teamName: '',
    leaderName: '',
  });
  assert(invalidRegRes.status === 400, 'HTTP-13: Invalid registration payload rejected with 400 Bad Request');

  console.log('\n============================================================');
  console.log(` HTTP VERIFICATION RESULTS: ${passed} passed | ${failed} failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    console.error('Failed checks:', errors);
    process.exit(1);
  } else {
    console.log('All public and protected HTTP endpoints verified successfully! ✅\n');
    process.exit(0);
  }
}

runHttpCheck().catch((err) => {
  console.error('HTTP Smoke Check Error:', err);
  process.exit(1);
});
