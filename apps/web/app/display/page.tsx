import type { Metadata } from 'next';
import { getTournamentOverview } from '@/lib/tournament/tournament-service';
import { getTournamentStats, getLiveMatches, buildMatchBroadcastPayload, getMatchDetail } from '@/lib/scoring/scoring-service';
import GroundDisplayClient from './GroundDisplayClient';

export const revalidate = 0; // Always real-time fresh for live match monitor

export const metadata: Metadata = {
  title: 'Ground Live Monitor · Computing Premier League 2026',
  description: 'Dedicated live ground display and monitor screen for CPL 2026. Live match scoreboard, full active scorecard, top-3 batsman and bowler rankings, and group stage standings.',
};

export default async function GroundDisplayPage() {
  let overview = null;
  let stats: any = null;
  let matches: any[] = [];
  let initialScorecard: any = null;

  try {
    const [overviewData, statsData, rawMatches] = await Promise.all([
      getTournamentOverview().catch(() => null),
      getTournamentStats().catch(() => null),
      getLiveMatches().catch(() => []),
    ]);

    overview = overviewData;
    stats = statsData;

    if (rawMatches && rawMatches.length > 0) {
      const payloads = await Promise.all(
        rawMatches.map((m: any) => buildMatchBroadcastPayload(m).catch(() => null))
      );
      matches = payloads.filter(Boolean);

      // Pre-fetch the scorecard for the first active match
      if (rawMatches[0]?.id) {
        initialScorecard = await getMatchDetail(rawMatches[0].id).catch(() => null);
      }
    }
  } catch (err) {
    console.error('[GroundDisplayPage] Error fetching initial display data:', err);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#07070A',
        color: '#F1F5F9',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <GroundDisplayClient
        initialOverview={overview}
        initialStats={stats}
        initialMatches={matches}
        initialScorecard={initialScorecard}
      />
    </main>
  );
}
