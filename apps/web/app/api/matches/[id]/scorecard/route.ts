import { NextResponse } from 'next/server';
import { getMatchDetail } from '@/lib/scoring/scoring-service';

export const dynamic = 'force-dynamic';

const MAX_SCORECARD_CACHE_ENTRIES = 100;
const scorecardCache = new Map<string, { data: any; expiresAt: number }>();

function pruneExpiredCache(now: number) {
  if (scorecardCache.size > MAX_SCORECARD_CACHE_ENTRIES) {
    for (const [key, entry] of scorecardCache.entries()) {
      if (entry.expiresAt < now) {
        scorecardCache.delete(key);
      }
    }
  }
}

export function sanitizePublicScorecard(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePublicScorecard);
  const sanitized: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (
      key === 'indexNumber' ||
      key === 'dateOfBirth' ||
      key === 'studentId' ||
      key === 'whatsappNumber' ||
      key === 'contactNumber' ||
      key === 'nic' ||
      key === 'email' ||
      key === 'registrationId'
    ) {
      continue;
    }
    sanitized[key] = sanitizePublicScorecard(val);
  }
  return sanitized;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.length > 64) {
      return NextResponse.json({ success: false, error: 'Invalid match ID' }, { status: 400 });
    }

    const cleanId = id.trim();
    const now = Date.now();
    const cached = scorecardCache.get(cleanId);

    if (cached && cached.expiresAt > now) {
      return NextResponse.json(
        { success: true, match: cached.data },
        {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'no-cache, no-store',
          },
        }
      );
    }

    const match = await getMatchDetail(cleanId);

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    // Defense-in-depth sanitization: recursively ensure no student PII leaks publicly
    const cleanMatch = sanitizePublicScorecard(match);

    // Prune stale cache entries before inserting
    pruneExpiredCache(now);
    scorecardCache.set(cleanId, { data: cleanMatch, expiresAt: now + 2500 });

    return NextResponse.json(
      { success: true, match: cleanMatch },
      {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'no-cache, no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('[/api/matches/[id]/scorecard] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch match scorecard' }, { status: 500 });
  }
}
