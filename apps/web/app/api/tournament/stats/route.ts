import { NextResponse } from 'next/server';
import { getTournamentStats } from '@/lib/scoring/scoring-service';
import { getTournamentOverview } from '@/lib/tournament/tournament-service';

export const dynamic = 'force-dynamic';

// In-Memory RAM cache to protect database from hundreds of concurrent viewers
let statsCache: { data: any; expiresAt: number } | null = null;

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

    const [stats, overview] = await Promise.all([
      getTournamentStats(),
      getTournamentOverview().catch((err) => {
        console.error('[tournament/stats] overview fetch error:', err);
        return null;
      }),
    ]);

    const data = { ...stats, overview };
    statsCache = { data, expiresAt: now + 3500 };

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
    console.error('[/api/tournament/stats] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tournament statistics' }, { status: 500 });
  }
}
