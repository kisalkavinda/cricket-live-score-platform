import "server-only";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();
const MAX_MEMORY_STORE_SIZE = 10000;

/**
 * Periodically prunes expired records from memory to prevent memory leaks.
 */
function cleanupExpired() {
  const now = Date.now();
  if (memoryStore.size > MAX_MEMORY_STORE_SIZE) {
    for (const [key, record] of memoryStore.entries()) {
      if (record.resetTime < now) {
        memoryStore.delete(key);
      }
    }
  }
}

/**
 * Sliding window rate limiter.
 * Supports Upstash Redis KV if configured via UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN,
 * falling back safely to local memory store.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Check if distributed Redis is available
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const key = `ratelimit:${identifier}`;
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, windowSeconds],
        ]),
        cache: 'no-store',
      });

      if (response.ok) {
        const results = await response.json();
        const count = results[0]?.result || 1;
        const remaining = Math.max(0, limit - count);
        return {
          allowed: count <= limit,
          remaining,
          reset: Math.floor((now + windowMs) / 1000),
        };
      }
    } catch {
      // Fallback silently to memory limiter on Redis network error
    }
  }

  // Local Memory Rate Limiter
  cleanupExpired();

  const record = memoryStore.get(identifier);
  if (!record || record.resetTime < now) {
    memoryStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      reset: Math.floor((now + windowMs) / 1000),
    };
  }

  record.count += 1;
  memoryStore.set(identifier, record);

  const allowed = record.count <= limit;
  const remaining = Math.max(0, limit - record.count);
  return {
    allowed,
    remaining,
    reset: Math.floor(record.resetTime / 1000),
  };
}
