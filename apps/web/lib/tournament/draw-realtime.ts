import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface DrawBroadcastPayload {
  drawId: string;
  eventType: string;
  status: string;
  currentPickIndex: number;
  revealedChit?: {
    position: number;
    groupName: string;
    teamId: string;
  } | null;
  timestamp: string;
}

/**
 * Broadcasts an authoritative draw event to Supabase Realtime channel `draw:${drawId}`.
 * Timeout guard ensures this never blocks mutations.
 */
export async function broadcastDrawUpdate(payload: DrawBroadcastPayload): Promise<void> {
  if (!supabase) return;

  try {
    const channel = supabase.channel(`draw:${payload.drawId}`);

    const broadcastPromise = new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel
            .send({
              type: 'broadcast',
              event: payload.eventType || 'draw_update',
              payload,
            })
            .then(() => {
              supabase.removeChannel(channel);
              resolve();
            })
            .catch((err) => {
              supabase.removeChannel(channel);
              reject(err);
            });
        }
      });
    });

    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(() => {
        try {
          supabase.removeChannel(channel);
        } catch {}
        resolve();
      }, 300)
    );

    await Promise.race([broadcastPromise, timeoutPromise]);
  } catch (err) {
    console.error('[Draw Realtime] Broadcast failed:', err);
  }
}
