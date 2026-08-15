import { NextResponse } from 'next/server';
import { getLiveMatches, buildMatchBroadcastPayload } from '@/lib/scoring/scoring-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawMatches = await getLiveMatches();
    const payloads = await Promise.all(
      rawMatches.map((m: any) => buildMatchBroadcastPayload(m.id))
    );

    const validPayloads = payloads.filter(Boolean);

    return NextResponse.json(
      { success: true, matches: validPayloads },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('[/api/matches/live] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch live matches' }, { status: 500 });
  }
}
