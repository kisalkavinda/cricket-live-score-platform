import { NextResponse } from 'next/server';
import { getTournamentStats } from '@/lib/scoring/scoring-service';
import { getTournamentOverview } from '@/lib/tournament/tournament-service';

export const dynamic = 'force-dynamic';

// In-Memory RAM cache to protect database from hundreds of concurrent viewers
let statsCache: { data: any; expiresAt: number } | null = null;
let inFlightStatsPromise: Promise<any> | null = null;

async function fetchFreshStats() {
  const [stats, overview] = await Promise.all([
    getTournamentStats().catch((err) => {
      console.error('[tournament/stats] getTournamentStats error:', err?.message || err);
      return { allMatches: [], topBatters: [], topBowlers: [], mvpLeaderboard: [] };
    }),
    getTournamentOverview().catch((err) => {
      console.error('[tournament/stats] overview fetch error:', err?.message || err);
      return null;
    }),
  ]);

  const data = { ...stats, overview };
  statsCache = { data, expiresAt: Date.now() + 3500 };
  return data;
}

export async function GET() {
  try {
    const now = Date.now();
    if (statsCache && statsCache.expiresAt > now) {
      return NextResponse.json(
        { success: true, ...statsCache.data },
        {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'no-cache, no-store',
          },
        }
      );
    }

    // Coalesce concurrent requests into a single database query
    if (!inFlightStatsPromise) {
      inFlightStatsPromise = fetchFreshStats().finally(() => {
        inFlightStatsPromise = null;
      });
    }

    const data = await inFlightStatsPromise;

    return NextResponse.json(
      { success: true, ...data },
      {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'no-cache, no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('[/api/tournament/stats] Error:', error?.message || error);
    // Gracefully fallback to cached data if available or empty structure rather than 500
    if (statsCache?.data) {
      return NextResponse.json(
        { success: true, ...statsCache.data },
        {
          headers: {
            'X-Cache': 'FALLBACK',
            'Cache-Control': 'no-cache, no-store',
          },
        }
      );
    }
    return NextResponse.json({
      success: true,
      allMatches: [],
      topBatters: [],
      topBowlers: [],
      mvpLeaderboard: [],
      overview: null,
    });
  }
}
