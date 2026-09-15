import { NextResponse } from 'next/server';
import { getLiveMatches, buildMatchBroadcastPayload } from '@/lib/scoring/scoring-service';

export const dynamic = 'force-dynamic';

// In-Memory RAM cache to protect database from hundreds of concurrent viewers
let liveMatchesCache: { data: any; expiresAt: number } | null = null;
let inFlightLivePromise: Promise<any> | null = null;

async function fetchFreshLiveMatches() {
  const rawMatches = await getLiveMatches();
  const payloads = await Promise.all(
    rawMatches.map((m: any) => buildMatchBroadcastPayload(m))
  );

  const validPayloads = payloads.filter(Boolean);
  liveMatchesCache = { data: validPayloads, expiresAt: Date.now() + 2500 };
  return validPayloads;
}

export async function GET(request?: Request) {
  try {
    const now = Date.now();
    let isFreshRequested = false;
    if (request) {
      try {
        const url = new URL(request.url);
        isFreshRequested = url.searchParams.get('fresh') === '1';
      } catch {}
    }

    const cacheHeaders = isFreshRequested
      ? { 'Cache-Control': 'no-cache, no-store' }
      : { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' };

    if (!isFreshRequested && liveMatchesCache && liveMatchesCache.expiresAt > now) {
      return NextResponse.json(
        { success: true, matches: liveMatchesCache.data },
        {
          headers: {
            'X-Cache': 'HIT',
            ...cacheHeaders,
          },
        }
      );
    }

    // Coalesce concurrent requests
    if (!inFlightLivePromise) {
      inFlightLivePromise = fetchFreshLiveMatches().finally(() => {
        inFlightLivePromise = null;
      });
    }

    const matches = await inFlightLivePromise;

    return NextResponse.json(
      { success: true, matches },
      {
        headers: {
          'X-Cache': 'MISS',
          ...cacheHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('[/api/matches/live] Error:', error);
    return NextResponse.json(
      { success: true, matches: liveMatchesCache?.data || [] },
      {
        headers: {
          'X-Cache': 'FALLBACK',
          'Cache-Control': 'no-cache, no-store',
        },
      }
    );
  }
}
