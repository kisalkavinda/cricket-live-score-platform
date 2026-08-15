import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Server-side Supabase client for broadcasting real-time events
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface ScoreBroadcastPayload {
  matchId: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED';
  currentInnings: number;
  innings: {
    id: string;
    inningsNumber: number;
    battingTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
    bowlingTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
    runs: number;
    wickets: number;
    overs: number;
    balls: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    crr: string;
    rrr?: string;
    target?: number;
  } | null;
  match: {
    id: string;
    teamA: { id: string; name: string; shortName: string; logoUrl?: string | null };
    teamB: { id: string; name: string; shortName: string; logoUrl?: string | null };
    venue?: string | null;
    oversPerInnings: number;
    resultNote?: string | null;
    winnerTeamId?: string | null;
  };
  striker: {
    id: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    sr: string;
  } | null;
  nonStriker: {
    id: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    sr: string;
  } | null;
  bowler: {
    id: string;
    name: string;
    overs: string;
    maidens: number;
    runsConceded: number;
    wickets: number;
    econ: string;
    wides: number;
    noBalls: number;
  } | null;
  recentBalls: Array<{
    id: string;
    overNumber: number;
    ballNumber: number;
    runs: number;
    extras: number;
    extraType: string;
    isLegal: boolean;
    isWicket: boolean;
    wicketType?: string | null;
    display: string;
  }>;
  timestamp: string;
}

/**
 * Broadcasts an authoritative match state to Supabase Realtime channel `match:${matchId}`
 * and to a global `matches:live` channel for index widgets.
 * Guaranteed: Does NOT throw if broadcast fails (PostgreSQL transaction remains authoritative).
 */
export async function broadcastScoreUpdate(payload: ScoreBroadcastPayload): Promise<void> {
  if (!supabase) {
    console.warn('[Realtime] Supabase credentials not configured, skipping broadcast.');
    return;
  }

  try {
    const channel = supabase.channel(`match:${payload.matchId}`);
    await channel.send({
      type: 'broadcast',
      event: 'score_update',
      payload,
    });
    // Also broadcast to live index channel for homepage widget
    const indexChannel = supabase.channel('matches:live');
    await indexChannel.send({
      type: 'broadcast',
      event: 'score_update',
      payload,
    });
  } catch (err) {
    console.error('[Realtime] Failed to broadcast score update:', err);
  }
}
