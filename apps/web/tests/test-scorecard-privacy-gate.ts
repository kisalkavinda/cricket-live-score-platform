import { prisma } from 'database';
import { getPublicMatchScorecard } from '../lib/scoring/scoring-service';
import { sanitizePublicScorecard } from '../app/api/matches/[id]/scorecard/route';

const SENSITIVE_FIELDS = [
  'indexNumber',
  'dateOfBirth',
  'studentId',
  'whatsappNumber',
  'contactNumber',
  'nic',
  'registrationId',
  'email',
  'passcodeHash',
  'secretSalt',
];

function findSensitiveKeys(obj: any, path = ''): string[] {
  const leaks: string[] = [];
  if (!obj || typeof obj !== 'object') return leaks;

  for (const [key, val] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (SENSITIVE_FIELDS.includes(key) && val !== null && val !== undefined) {
      leaks.push(`${currentPath} (Value: ${JSON.stringify(val)})`);
    }
    if (typeof val === 'object' && val !== null) {
      leaks.push(...findSensitiveKeys(val, currentPath));
    }
  }
  return leaks;
}

async function runScorecardPrivacyGate() {
  console.log('======================================================');
  console.log(' 4. PUBLIC SCORECARD PRIVACY ADVERSARIAL GATE');
  console.log('======================================================\n');

  // Find matches across tournament
  const matches = await prisma.match.findMany({
    take: 5,
    select: { id: true, matchNumber: true, stage: true, status: true },
  });

  if (matches.length === 0) {
    console.log('Notice: No matches in database to test.');
    return;
  }

  console.log(`Auditing ${matches.length} match scorecards for PII leakage...`);

  for (const m of matches) {
    const rawScorecard = await getPublicMatchScorecard(m.id);
    const sanitized = sanitizePublicScorecard(rawScorecard);

    const leaks = findSensitiveKeys(sanitized);
    console.log(`Match #${m.matchNumber} (${m.stage} - ${m.status}):`);
    if (leaks.length > 0) {
      console.error(`  ❌ FAILED: Found ${leaks.length} sensitive fields exposed:`);
      for (const leak of leaks) console.error(`     - ${leak}`);
      throw new Error(`Public scorecard privacy violation on match ${m.id}`);
    } else {
      console.log(`  ✓ PASSED: Clean. Zero PII/student fields found in entire payload.`);
    }
  }

  console.log('\n======================================================');
  console.log('  SECTION 4: SCORECARD PRIVACY GATE PASSED! ✅');
  console.log('======================================================\n');
}

runScorecardPrivacyGate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Scorecard Privacy Gate Failed:', err);
    process.exit(1);
  });
