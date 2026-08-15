import { NextResponse } from 'next/server';
import { getMatchDetail } from '@/lib/scoring/scoring-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const match = await getMatchDetail(id);

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, match },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('[/api/matches/[id]/scorecard] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch match scorecard' }, { status: 500 });
  }
}
