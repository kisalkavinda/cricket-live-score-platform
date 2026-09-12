'use client';

import { useState, useEffect, useCallback } from 'react';
import { TournamentOverview } from '@/lib/tournament/tournament-service';
import styles from './tournament.module.css';

import TournamentHeroHUD from './components/TournamentHeroHUD';
import LiveOrNextMatchSpotlight from './components/LiveOrNextMatchSpotlight';
import PlayoffBracketTree from './components/PlayoffBracketTree';
import GroupStandingsSection from './components/GroupStandingsSection';
import PlayoffQualificationFlow from './components/PlayoffQualificationFlow';
import SixTeamWildcardSection from './components/SixTeamWildcardSection';
import FixturesAndResultsSection from './components/FixturesAndResultsSection';
import TournamentMetricsGrid from './components/TournamentMetricsGrid';
import TournamentRegulationsSection from './components/TournamentRegulationsSection';

interface Props {
  initialOverview: TournamentOverview | null;
}

export default function TournamentHubClient({ initialOverview }: Props) {
  const [overview, setOverview] = useState<TournamentOverview | null>(initialOverview);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Poll for tournament state refresh every 10 seconds to keep live scores & bracket synced
  const refreshTournamentData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/tournament/stats?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.overview) {
        setOverview(data.overview);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('[TournamentHub] refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLastRefreshed(new Date().toLocaleTimeString());
    const interval = setInterval(refreshTournamentData, 10000);
    return () => clearInterval(interval);
  }, [refreshTournamentData]);

  // Initializing Screen (if overview not yet available)
  if (!overview) {
    return (
      <div className={styles.hubContainer} style={{ paddingTop: '80px', textAlign: 'center' }}>
        <div className={styles.cyberPanel} style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 32px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(192, 39, 45, 0.15)',
              border: '1.5px solid rgba(192, 39, 45, 0.4)',
              color: 'var(--color-accent, #C0272D)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 24px rgba(192, 39, 45, 0.3)',
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'spin 2s linear infinite' }}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </div>

          <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', color: 'var(--color-accent, #C0272D)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px' }}>
            System Sync In Progress
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', textTransform: 'uppercase', color: '#FFF', margin: '0 0 10px' }}>
            Initializing Tournament Hub
          </h2>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 auto 24px' }}>
            Establishing connection to the CPL competition server. Synchronizing fixtures, live team rosters, and Net Run Rate engines.
          </p>

          <button
            onClick={refreshTournamentData}
            style={{
              padding: '10px 24px',
              borderRadius: '9999px',
              background: 'var(--color-accent, #C0272D)',
              color: '#FFF',
              border: 'none',
              fontFamily: 'var(--font-data)',
              fontWeight: 800,
              fontSize: '0.8rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(192, 39, 45, 0.4)',
            }}
          >
            Poll Tournament Status
          </button>
        </div>
      </div>
    );
  }

  const { groups, qualification, playoffs, matches, progress, tournament } = overview;

  // -------------------------------------------------------------
  // Dynamic Live / Next Match / Champion Derivations
  // -------------------------------------------------------------
  const liveMatch = matches.find((m: any) => m.status === 'LIVE');
  const nextMatch = !liveMatch
    ? matches.find((m: any) => m.status === 'SCHEDULED' || m.status === 'UPCOMING')
    : null;
  const completedMatchesList = matches
    .filter((m: any) => m.status === 'COMPLETED')
    .sort((a: any, b: any) => (b.matchNumber || 0) - (a.matchNumber || 0));
  const upcomingMatchesList = matches
    .filter((m: any) => m.status === 'SCHEDULED' || m.status === 'UPCOMING')
    .sort((a: any, b: any) => (a.matchNumber || 0) - (b.matchNumber || 0));

  // Compute tournament statistics from actual raw match and innings records
  let highestRunsInnings = 0;
  let highestScoreText = '—';
  let highestNRR = -999;
  let highestNRRTeam = '—';

  matches.forEach((m: any) => {
    (m.innings || []).forEach((inn: any) => {
      if (inn.runs > highestRunsInnings) {
        highestRunsInnings = inn.runs;
        const team = inn.battingTeamId === m.teamA?.id ? m.teamA : m.teamB;
        highestScoreText = `${inn.runs}/${inn.wickets} (${team?.shortName || 'TBD'})`;
      }
    });
  });

  const allCurrentStandings = [
    ...(groups.groupA?.standings || []),
    ...(groups.groupB?.standings || []),
  ];
  allCurrentStandings.forEach((s) => {
    if (s.nrr > highestNRR && s.played > 0) {
      highestNRR = s.nrr;
      highestNRRTeam = `${s.displayNRR} (${s.teamShortName})`;
    }
  });

  // Authoritative Seed Resolution
  const seed1 = playoffs.seeds?.[0]?.team;
  const seed2 = playoffs.seeds?.[1]?.team;
  const seed3 = playoffs.seeds?.[2]?.team;
  const seed4 = playoffs.seeds?.[3]?.team;

  // Authoritative Match Cards
  const q1 = playoffs.qualifier1 || playoffs.match12;
  const elim = playoffs.eliminator || playoffs.match13;
  const q2 = playoffs.qualifier2 || playoffs.match14;
  const finalMatch = playoffs.final;
  const champion = playoffs.champion;

  // Strict Bracket Truth Advancement Checks:
  // Qualifier 1 Outcomes:
  const q1Winner = q1?.status === 'COMPLETED' && q1?.winnerTeamId ? q1.winnerTeam : null;
  const q1Loser = q1?.status === 'COMPLETED' && q1?.winnerTeamId
    ? (q1.teamAId === q1.winnerTeamId ? q1.teamB : q1.teamA)
    : null;

  // Eliminator Outcomes:
  const elimWinner = elim?.status === 'COMPLETED' && elim?.winnerTeamId ? elim.winnerTeam : null;
  const elimLoser = elim?.status === 'COMPLETED' && elim?.winnerTeamId
    ? (elim.teamAId === elim.winnerTeamId ? elim.teamB : elim.teamA)
    : null;

  // Qualifier 2 Outcomes:
  const q2Winner = q2?.status === 'COMPLETED' && q2?.winnerTeamId ? q2.winnerTeam : null;
  const q2Loser = q2?.status === 'COMPLETED' && q2?.winnerTeamId
    ? (q2.teamAId === q2.winnerTeamId ? q2.teamB : q2.teamA)
    : null;

  // Grand Final Crowned Champion:
  const crownedChampion = champion || (finalMatch?.status === 'COMPLETED' && finalMatch?.winnerTeam ? finalMatch.winnerTeam : null);

  return (
    <div className={styles.hubContainer}>
      {/* Background Cyber Grid Accent */}
      <div className={styles.cyberGridBg} />

      {/* 1. Header & Stage Stepper */}
      <TournamentHeroHUD
        progress={progress}
        liveMatch={liveMatch}
        lastRefreshed={lastRefreshed}
        isRefreshing={isRefreshing}
        onRefresh={refreshTournamentData}
        crownedChampion={crownedChampion}
        tournamentFormat={overview.normalizedFormat || overview.tournamentFormat}
      />

      {/* 2. Active Match / Upcoming Spotlight */}
      <LiveOrNextMatchSpotlight
        liveMatch={liveMatch}
        nextMatch={nextMatch}
        recentMatch={completedMatchesList[0]}
      />

      {/* 3. The Playoff Bracket (Showpiece connected tree) */}
      <PlayoffBracketTree
        tournamentFormat={overview.normalizedFormat || overview.tournamentFormat}
        playoffs={playoffs}
        progress={progress}
        seed1={seed1}
        seed2={seed2}
        seed3={seed3}
        seed4={seed4}
        q1={q1}
        q1Winner={q1Winner}
        q1Loser={q1Loser}
        elim={elim}
        elimWinner={elimWinner}
        elimLoser={elimLoser}
        q2={q2}
        q2Winner={q2Winner}
        q2Loser={q2Loser}
        finalMatch={finalMatch}
        crownedChampion={crownedChampion}
      />

      {/* 4. Group Standings Tables */}
      <GroupStandingsSection
        groups={groups}
        tournamentFormat={overview.normalizedFormat || overview.tournamentFormat}
      />

      {/* 5. Stage 2 Playoff Pipeline: Wildcard (6-Team) or Qualification (8-Team) */}
      {overview.normalizedFormat === '6_TEAM' && overview.wildcard && (
        <SixTeamWildcardSection wildcard={overview.wildcard} />
      )}
      {overview.normalizedFormat === '8_TEAM' && (
        <PlayoffQualificationFlow qualification={qualification} />
      )}

      {/* 6. Schedule & Results */}
      <FixturesAndResultsSection
        completedMatchesList={completedMatchesList}
        upcomingMatchesList={upcomingMatchesList}
      />

      {/* 7. Tournament Metrics */}
      <TournamentMetricsGrid
        progress={progress}
        highestScoreText={highestScoreText}
        highestNRRTeam={highestNRRTeam}
        tournamentFormat={overview.normalizedFormat || overview.tournamentFormat}
        registeredTeamsCount={overview.teams?.length}
      />

      {/* 8. Regulations & NRR Engine */}
      <TournamentRegulationsSection />
    </div>
  );
}
