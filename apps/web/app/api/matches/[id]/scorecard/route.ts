import { NextResponse } from 'next/server';
import { getMatchDetail } from '@/lib/scoring/scoring-service';
import {
  sanitizePublicScorecard,
  warmScorecardCache,
  getCoalescedMatchScorecard,
} from '@/lib/scoring/scorecard-cache';

export const dynamic = 'force-dynamic';

export const MAX_SCORECARD_CACHE_ENTRIES = 100;
export { sanitizePublicScorecard, warmScorecardCache };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.length > 64) {
      return NextResponse.json({ success: false, error: 'Invalid match ID' }, { status: 400 });
    }

    let isFreshRequested = false;
    try {
      const url = new URL(request.url);
      isFreshRequested = url.searchParams.get('fresh') === '1';
    } catch {}

    const cacheHeaders = isFreshRequested
      ? { 'Cache-Control': 'no-cache, no-store' }
      : { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' };

    const { data: cleanMatch, isHit } = await getCoalescedMatchScorecard(
      id,
      (cleanId) => getMatchDetail(cleanId),
      3000
    );

    if (!cleanMatch) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, match: cleanMatch },
      {
        headers: {
          'X-Cache': isHit ? 'HIT' : 'MISS',
          ...cacheHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('[/api/matches/[id]/scorecard] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch match scorecard' }, { status: 500 });
  }
}
