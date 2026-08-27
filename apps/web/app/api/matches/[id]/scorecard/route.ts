import { NextResponse } from 'next/server';
import { getMatchDetail } from '@/lib/scoring/scoring-service';

export const dynamic = 'force-dynamic';

// In-Memory RAM Cache to handle hundreds of concurrent viewers with zero database load
const scorecardCache = new Map<string, { data: any; expiresAt: number }>();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const now = Date.now();
    const cached = scorecardCache.get(id);

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

    const match = await getMatchDetail(id);

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    // Cache in RAM for 2.5 seconds (protects database from 100+ simultaneous page requests)
    scorecardCache.set(id, { data: match, expiresAt: now + 2500 });

    return NextResponse.json(
      { success: true, match },
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
