import { unstable_cache } from 'next/cache';

/**
 * Publicly cached aggregate team count.
 * - Cache ONLY aggregate count (number)
 * - 60 second revalidation TTL
 * - Tagged with 'teams-count' for on-demand invalidation upon admin approval
 * - Gracefully catches errors and returns fallback count (0) without crashing the homepage
 * - Does NOT cache player, registration, index numbers, phone numbers, or private details
 */
export const getCachedRegisteredTeamsCount = unstable_cache(
  async (): Promise<number> => {
    try {
      const { prisma } = await import('database');
      return await prisma.team.count();
    } catch (err) {
      console.error('[Public Cache] Failed to query registered teams count, using fallback 0:', err);
      return 0;
    }
  },
  ['public-registered-teams-count'],
  {
    revalidate: 60,
    tags: ['teams-count'],
  }
);
