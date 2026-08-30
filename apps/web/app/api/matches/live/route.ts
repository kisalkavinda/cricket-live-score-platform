import { NextResponse } from 'next/server';
import { getLiveMatches, buildMatchBroadcastPayload } from '@/lib/scoring/scoring-service';

export const dynamic = 'force-dynamic';

// In-Memory RAM cache to protect database from hundreds of concurrent viewers
let liveMatchesCache: { data: any; expiresAt: number } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (liveMatchesCache && liveMatchesCache.expiresAt > now) {
      return NextResponse.json(
        { success: true, matches: liveMatchesCache.data },
        {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'no-cache, no-store',
          },
        }
      );
    }

    const rawMatches = await getLiveMatches();
    const payloads = await Promise.all(
      rawMatches.map((m: any) => buildMatchBroadcastPayload(m))
    );

    const validPayloads = payloads.filter(Boolean);
    liveMatchesCache = { data: validPayloads, expiresAt: now + 2500 };

    return NextResponse.json(
      { success: true, matches: validPayloads },
      {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'no-cache, no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('[/api/matches/live] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch live matches' }, { status: 500 });
  }
}
