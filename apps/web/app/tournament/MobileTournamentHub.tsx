'use client';

import TournamentHubClient from './TournamentHubClient';
import { TournamentOverview } from '@/lib/tournament/tournament-service';

interface MobileTournamentHubProps {
  overview: TournamentOverview;
  liveMatch?: any;
  nextMatch?: any;
  completedMatchesList?: any[];
  upcomingMatchesList?: any[];
  highestScoreText?: string;
  highestNRRTeam?: string;
  highestNRR?: number;
  q1?: any;
  q1Winner?: any;
  q1Loser?: any;
  elim?: any;
  elimWinner?: any;
  elimLoser?: any;
  q2?: any;
  q2Winner?: any;
  q2Loser?: any;
  finalMatch?: any;
  crownedChampion?: any;
  seed1?: any;
  seed2?: any;
  seed3?: any;
  seed4?: any;
  isRefreshing?: boolean;
  refreshTournamentData?: () => void;
  lastRefreshed?: string;
}

/**
 * MobileTournamentHub (Backwards Compatibility Delegate)
 * The tournament hub is now fully responsive out-of-the-box via TournamentHubClient.
 */
export default function MobileTournamentHub({ overview }: MobileTournamentHubProps) {
  return <TournamentHubClient initialOverview={overview} />;
}
