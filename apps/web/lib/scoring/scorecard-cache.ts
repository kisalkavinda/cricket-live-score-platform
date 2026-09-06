export const MAX_SCORECARD_CACHE_ENTRIES = 100;
const scorecardCache = new Map<string, { data: any; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<any>>();

export function sanitizePublicScorecard(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizePublicScorecard);
  const sanitized: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (
      key === 'indexNumber' ||
      key === 'dateOfBirth' ||
      key === 'studentId' ||
      key === 'whatsappNumber' ||
      key === 'contactNumber' ||
      key === 'nic' ||
      key === 'email' ||
      key === 'registrationId'
    ) {
      continue;
    }
    sanitized[key] = sanitizePublicScorecard(val);
  }
  return sanitized;
}

function pruneExpiredCache(now: number) {
  if (scorecardCache.size > MAX_SCORECARD_CACHE_ENTRIES) {
    for (const [key, entry] of scorecardCache.entries()) {
      if (entry.expiresAt < now) {
        scorecardCache.delete(key);
      }
    }
  }
}

/**
 * Instantly warms or updates the RAM scorecard cache with fresh match data.
 * When called after a delivery or state update, subsequent viewer requests hit RAM (0ms)
 * without touching PostgreSQL or the database connection pool.
 */
export function warmScorecardCache(matchId: string, matchData: any, ttlMs = 3500): any {
  if (!matchId || !matchData) return null;
  const cleanId = matchId.trim();
  const cleanMatch = sanitizePublicScorecard(matchData);
  const now = Date.now();
  pruneExpiredCache(now);
  scorecardCache.set(cleanId, { data: cleanMatch, expiresAt: now + ttlMs });
  return cleanMatch;
}

/**
 * Retrieves valid cached scorecard from RAM if not expired.
 */
export function getCachedScorecard(matchId: string): any | null {
  if (!matchId) return null;
  const cleanId = matchId.trim();
  const entry = scorecardCache.get(cleanId);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  return null;
}

/**
 * Single-flight request coalescing:
 * If 10 concurrent requests arrive for the same match ID, only ONE database query runs.
 * All other 9 requests wait on the exact same in-flight Promise and receive the result simultaneously.
 */
export async function getCoalescedMatchScorecard(
  matchId: string,
  fetcher: (id: string) => Promise<any>,
  ttlMs = 3000
): Promise<any> {
  const cleanId = matchId.trim();

  // 1. RAM Cache Hit check
  const cached = getCachedScorecard(cleanId);
  if (cached) {
    return { data: cached, isHit: true };
  }

  // 2. Coalesce in-flight database query
  let existingPromise = inFlightRequests.get(cleanId);
  if (!existingPromise) {
    existingPromise = fetcher(cleanId).finally(() => {
      inFlightRequests.delete(cleanId);
    });
    inFlightRequests.set(cleanId, existingPromise);
  }

  const rawMatch = await existingPromise;
  if (!rawMatch) {
    return { data: null, isHit: false };
  }

  const cleanMatch = warmScorecardCache(cleanId, rawMatch, ttlMs);
  return { data: cleanMatch, isHit: false };
}
