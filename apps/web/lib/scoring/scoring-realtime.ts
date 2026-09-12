import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Server-side Supabase client for broadcasting real-time events
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface ScoreBroadcastPayload {
  matchId: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED';
  currentInnings: number;
  matchNumber?: number | null;
  stage?: string | null;
  groupName?: string | null;
  bracketSlot?: string | null;
  isFreeHit?: boolean;
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
    extrasBreakdown?: {
      wides: number;
      noBalls: number;
      byes: number;
      legByes: number;
      penalty: number;
      total: number;
    };
  } | null;
  chase?: {
    isChase: boolean;
    battingTeamName: string;
    target: number;
    runsNeeded: number;
    ballsRemaining: number;
    rrr: string;
    crr: string;
  } | null;
  match: {
    id: string;
    matchNumber?: number | null;
    stage?: string | null;
    groupName?: string | null;
    bracketSlot?: string | null;
    teamA: { id: string; name: string; shortName: string; logoUrl?: string | null };
    teamB: { id: string; name: string; shortName: string; logoUrl?: string | null };
    venue?: string | null;
    oversPerInnings: number;
    ballsPerOver?: number;
    resultNote?: string | null;
    winnerTeamId?: string | null;
    tossWinnerId?: string | null;
    tossDecision?: string | null;
    completedAt?: string | null;
    startedAt?: string | null;
    scheduledAt?: string | null;
    updatedAt?: string | null;
  };
  allInningsSummary?: Array<{
    inningsNumber: number;
    battingTeamId: string;
    runs: number;
    wickets: number;
    overs: number;
    balls: number;
    isSuperOver?: boolean;
  }>;
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
    economy?: string;
    wides: number;
    noBalls: number;
  } | null;
  recentBalls?: Array<{
    id: string;
    overNumber: number;
    ballNumber: number;
    runs: number;
    extras: number;
    extraType: string;
    byeRuns?: number;
    legByeRuns?: number;
    isLegal: boolean;
    isWicket: boolean;
    wicketType?: string | null;
    display: string;
    createdAt?: any;
  }>;
  timestamp: string;
}

/**
 * Broadcasts an authoritative match state to Supabase Realtime channel `match:${matchId}`
 * and to a global `matches:live` channel for index widgets.
 * Uses high-speed HTTP REST endpoint via httpSend('score_update', payload) with 1500ms race timeout.
 */
export async function broadcastScoreUpdate(payload: ScoreBroadcastPayload): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    const channel1 = supabase.channel(`match:${payload.matchId}`);
    const channel2 = supabase.channel('matches:live');

    const sendEvent = async (ch: any) => {
      try {
        if (typeof ch.httpSend === 'function') {
          // Supabase Realtime httpSend takes event string and payload object
          return await ch.httpSend('score_update', payload);
        }
        return await ch.send({
          type: 'broadcast',
          event: 'score_update',
          payload,
        });
      } catch (e) {
        console.warn('[Realtime] Individual channel broadcast error:', (e as any)?.message || e);
      }
    };

    // Broadcast concurrently to both channels with a generous 1500ms safety timeout
    await Promise.race([
      Promise.allSettled([sendEvent(channel1), sendEvent(channel2)]),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch (err) {
    console.error('[Realtime] Failed to broadcast score update:', err);
  }
}
