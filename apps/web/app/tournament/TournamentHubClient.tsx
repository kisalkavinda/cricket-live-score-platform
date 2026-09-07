'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TournamentOverview } from '@/lib/tournament/tournament-service';
import { TeamStanding } from '@/lib/tournament/nrr-engine';
import MobileTournamentHub from './MobileTournamentHub';

interface Props {
  initialOverview: TournamentOverview | null;
}

export default function TournamentHubClient({ initialOverview }: Props) {
  const [overview, setOverview] = useState<TournamentOverview | null>(initialOverview);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [showNrrRules, setShowNrrRules] = useState<boolean>(false);
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

  if (!overview) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏏</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', textTransform: 'uppercase', color: '#FFF' }}>
          Tournament Initializing
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '500px', margin: '10px auto 24px' }}>
          Fixtures, teams, and tournament schedules are currently being synchronized with the CPL competition server.
        </p>
        <button
          onClick={refreshTournamentData}
          style={{
            padding: '10px 24px',
            borderRadius: '9999px',
            background: 'var(--color-accent, #C0272D)',
            color: '#FFF',
            border: 'none',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Check Tournament Status
        </button>
      </div>
    );
  }

  const { groups, wildcard, playoffs, matches, progress, tournament } = overview;

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
  let highestScoreText = '-';
  let highestNRR = -999;
  let highestNRRTeam = '-';

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
    ...(groups.groupC?.standings || []),
    ...(wildcard?.standings || []),
  ];
  allCurrentStandings.forEach((s) => {
    if (s.nrr > highestNRR && s.played > 0) {
      highestNRR = s.nrr;
      highestNRRTeam = `${s.displayNRR} (${s.teamShortName})`;
    }
  });

  // Stage indicator state
  const stageOrder = ['GROUP', 'WILDCARD', 'PLAYOFFS', 'FINAL', 'COMPLETED'];
  const currentStageIdx = stageOrder.indexOf(progress.currentStage);

  // Authoritative Seed Resolution
  const seed1 = playoffs.seeds?.[0]?.team;
  const seed2 = playoffs.seeds?.[1]?.team;
  const seed3 = playoffs.seeds?.[2]?.team;
  const seed4 = playoffs.seeds?.[3]?.team;

  // Authoritative Match Cards
  const q1 = playoffs.qualifier1;
  const elim = playoffs.eliminator;
  const q2 = playoffs.qualifier2;
  const finalMatch = playoffs.final;
  const champion = playoffs.champion;

  // Strict Bracket Truth Advancement Checks:
  // Qualifier 1 Authoritative Outcomes:
  const q1Winner = q1?.status === 'COMPLETED' && q1?.winnerTeamId ? q1.winnerTeam : null;
  const q1Loser = q1?.status === 'COMPLETED' && q1?.winnerTeamId
    ? (q1.teamAId === q1.winnerTeamId ? q1.teamB : q1.teamA)
    : null;

  // Eliminator Authoritative Outcomes:
  const elimWinner = elim?.status === 'COMPLETED' && elim?.winnerTeamId ? elim.winnerTeam : null;
  const elimLoser = elim?.status === 'COMPLETED' && elim?.winnerTeamId
    ? (elim.teamAId === elim.winnerTeamId ? elim.teamB : elim.teamA)
    : null;

  // Qualifier 2 Authoritative Outcomes:
  const q2Winner = q2?.status === 'COMPLETED' && q2?.winnerTeamId ? q2.winnerTeam : null;
  const q2Loser = q2?.status === 'COMPLETED' && q2?.winnerTeamId
    ? (q2.teamAId === q2.winnerTeamId ? q2.teamB : q2.teamA)
    : null;

  // Grand Final Authoritative Winner:
  const crownedChampion = champion || (finalMatch?.status === 'COMPLETED' && finalMatch?.winnerTeam ? finalMatch.winnerTeam : null);

  return (
    <>
      {/* Mobile-Only Purpose-Built Presentation (< 768px) */}
      <div className="block md:hidden">
        <MobileTournamentHub
          overview={overview}
          liveMatch={liveMatch}
          nextMatch={nextMatch}
          completedMatchesList={completedMatchesList}
          upcomingMatchesList={upcomingMatchesList}
          highestScoreText={highestScoreText}
          highestNRRTeam={highestNRRTeam}
          highestNRR={highestNRR}
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
          seed1={seed1}
          seed2={seed2}
          seed3={seed3}
          seed4={seed4}
          isRefreshing={isRefreshing}
          refreshTournamentData={refreshTournamentData}
          lastRefreshed={lastRefreshed}
        />
      </div>

      {/* Existing Desktop Presentation (≥ 768px) - 100% UNCHANGED */}
      <div className="hidden md:block">
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px 80px' }}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOURNAMENT HERO & STATUS HEADER                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '36px' }}>
        {/* If Champion is Crowned: Show Prestigious Gold Celebration Bar */}
        {crownedChampion ? (
          <div
            style={{
              marginBottom: '28px',
              padding: '28px 36px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.25) 0%, rgba(192, 39, 45, 0.2) 100%)',
              border: '2px solid rgba(255, 184, 0, 0.5)',
              boxShadow: '0 12px 36px rgba(255, 184, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  boxShadow: '0 4px 16px rgba(255, 215, 0, 0.4)',
                }}
              >
                🏆
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#FFB800' }}>
                  2026 CPL Official Champion Crowned
                </div>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                    margin: '4px 0 0',
                    lineHeight: 1,
                  }}
                >
                  {crownedChampion.name}
                </h1>
                <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Winner of the 2026 Computing Premier League Tournament at Ratmalana Ground.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 184, 0, 0.15)',
                  border: '1px solid rgba(255, 184, 0, 0.4)',
                  color: '#FFB800',
                  fontFamily: 'var(--font-data)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                TOURNAMENT CONCLUDED
              </div>
            </div>
          </div>
        ) : null}

        {/* Hero Header Strip */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ width: '10px', height: '2px', background: 'var(--color-accent, #C0272D)' }} />
              <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--color-accent, #C0272D)' }}>
                Official Competition Roadmap
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.6rem, 6vw, 4.4rem)',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#FFFFFF',
                margin: 0,
                lineHeight: 0.98,
                letterSpacing: '-0.02em',
              }}
            >
              CPL <span style={{ color: 'var(--color-accent, #C0272D)' }}>Championship</span> Hub
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '8px', marginBottom: 0, maxWidth: '640px', lineHeight: 1.5 }}>
              9 Teams · 16 Matches · 4 Stages · Ball-Based Softball Net Run Rate (NRR)
            </p>
          </div>

          {/* Quick Stats & Live Indicator Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Dynamic Current Stage Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  background: progress.currentStage === 'COMPLETED'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : liveMatch
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(255, 184, 0, 0.15)',
                  border: progress.currentStage === 'COMPLETED'
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : liveMatch
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid rgba(255, 184, 0, 0.4)',
                  color: progress.currentStage === 'COMPLETED'
                    ? '#10B981'
                    : liveMatch
                    ? '#EF4444'
                    : '#FFB800',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: liveMatch ? '#EF4444' : progress.currentStage === 'COMPLETED' ? '#10B981' : '#FFB800',
                    animation: liveMatch ? 'pulse 1.5s infinite' : 'none',
                  }}
                />
                {liveMatch ? '● LIVE IN PROGRESS' : `STAGE: ${progress.currentStage}`}
              </div>

              {/* Progress Count Pill */}
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                }}
              >
                {progress.completedMatches} / {progress.totalMatches} Matches
              </div>
            </div>

            {/* Sync timestamp and Refresh Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.4)' }}>
              <span>Live Synced: {lastRefreshed}</span>
              <button
                onClick={refreshTournamentData}
                disabled={isRefreshing}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFB800',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  textDecoration: 'underline',
                  padding: '2px 4px',
                }}
              >
                {isRefreshing ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. TOURNAMENT PROGRESS STEPPER                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '36px' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
              Tournament Progression Sequence
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-data)' }}>
              {Math.round((progress.completedMatches / 16) * 100)}% Complete
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              position: 'relative',
            }}
          >
            {[
              {
                id: 'GROUP',
                label: '1. Group Stage',
                matches: 'Matches 1–9',
                desc: '3 Groups × 3 Teams. Top 1 → Final Four; 2nd → Wildcard.',
              },
              {
                id: 'WILDCARD',
                label: '2. Wildcard Stage',
                matches: 'Matches 10–12',
                desc: '3 Runners-up round-robin. 1st → Seed #4.',
              },
              {
                id: 'PLAYOFFS',
                label: '3. Final Four',
                matches: 'Matches 13–15',
                desc: 'Qualifier 1, Eliminator, Qualifier 2 (Double chance).',
              },
              {
                id: 'FINAL',
                label: '4. Grand Final',
                matches: 'Match 16',
                desc: 'Winner Q1 vs Winner Q2 for the Trophy.',
              },
            ].map((stage, idx) => {
              const isCompleted = currentStageIdx > idx || progress.currentStage === 'COMPLETED';
              const isCurrent = progress.currentStage === stage.id && progress.currentStage !== 'COMPLETED';

              return (
                <div
                  key={stage.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: isCurrent
                      ? 'linear-gradient(135deg, rgba(192, 39, 45, 0.2) 0%, rgba(255, 184, 0, 0.1) 100%)'
                      : isCompleted
                      ? 'rgba(16, 185, 129, 0.05)'
                      : 'rgba(255, 255, 255, 0.02)',
                    border: isCurrent
                      ? '1.5px solid var(--color-accent, #C0272D)'
                      : isCompleted
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isCurrent ? '#FFB800' : isCompleted ? '#10B981' : 'rgba(255,255,255,0.7)' }}>
                      {stage.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : isCurrent ? 'var(--color-accent, #C0272D)' : 'rgba(255,255,255,0.06)',
                        color: isCompleted ? '#10B981' : '#FFFFFF',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isCompleted ? '✓ Done' : isCurrent ? '● Active' : 'Upcoming'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-data)', marginBottom: '4px' }}>
                    {stage.matches}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.35 }}>
                    {stage.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CURRENT MATCH / LIVE MATCH SPOTLIGHT CARD                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {liveMatch ? (
        <section style={{ marginBottom: '36px' }}>
          <div
            style={{
              padding: '24px 28px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(20, 20, 26, 0.95) 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              boxShadow: '0 10px 30px rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: '#EF4444',
                    color: '#FFF',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF', animation: 'pulse 1.5s infinite' }} />
                  LIVE MATCH SPOTLIGHT
                </span>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                  Match #{liveMatch.matchNumber} · {liveMatch.stage} {liveMatch.groupName ? `(${liveMatch.groupName})` : ''} · {liveMatch.venue || 'Ratmalana Ground'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {liveMatch.teamA?.logoUrl ? (
                    <img src={liveMatch.teamA.logoUrl} alt={liveMatch.teamA.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>🏏</span>
                  )}
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF' }}>{liveMatch.teamA?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>({liveMatch.teamA?.shortName})</div>
                  </div>
                </div>

                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, color: '#FFB800' }}>VS</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {liveMatch.teamB?.logoUrl ? (
                    <img src={liveMatch.teamB.logoUrl} alt={liveMatch.teamB.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>🦁</span>
                  )}
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF' }}>{liveMatch.teamB?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>({liveMatch.teamB?.shortName})</div>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href={`/scorecard?matchId=${liveMatch.id}`}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.88rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              }}
            >
              Watch Live Scorecard →
            </Link>
          </div>
        </section>
      ) : nextMatch ? (
        <section style={{ marginBottom: '36px' }}>
          <div
            style={{
              padding: '20px 24px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 184, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 184, 0, 0.15)',
                  border: '1px solid rgba(255, 184, 0, 0.4)',
                  color: '#FFB800',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                }}
              >
                NEXT FIXTURE
              </span>
              <span style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: 700 }}>
                Match #{nextMatch.matchNumber} · {nextMatch.teamA?.name || 'TBD'} vs {nextMatch.teamB?.name || 'TBD'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
                ({nextMatch.venue || 'Ratmalana Ground'} · {nextMatch.stage})
              </span>
            </div>

            <Link
              href={`/scorecard?matchId=${nextMatch.id}`}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFB800',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Match Details →
            </Link>
          </div>
        </section>
      ) : null}

      {/* Global CSS to kill ugly white browser scrollbars and enable responsive layout */}
      <style>{`
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
        }
        *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        *::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 9999px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 184, 0, 0.5);
        }
        @media (max-width: 1100px) {
          .playoff-bracket-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 680px) {
          .playoff-bracket-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MAIN FEATURE: CHAMPIONSHIP PLAYOFF BRACKET                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="bracket" style={{ marginBottom: '54px', scrollMarginTop: '90px' }}>
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '8px', height: '2px', background: '#FFB800' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#FFB800' }}>
                Stage 3 & 4 Knockout Phase
              </span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#FFF',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              🏆 Championship <span style={{ color: 'var(--color-accent, #C0272D)' }}>Playoff Bracket</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', margin: '4px 0 0' }}>
              IPL-style playoff bracket with double chance for Seeds #1 & #2. Winner of Qualifier 1 advances straight to the Grand Final.
            </p>
          </div>

          <div
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.78rem',
              color: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: progress.currentStage === 'COMPLETED' ? '#FFD700' : progress.currentStage === 'PLAYOFFS' || progress.currentStage === 'FINAL' ? '#10B981' : '#F59E0B' }} />
            Active Stage: <strong style={{ color: '#FFB800' }}>{progress.currentStage}</strong>
          </div>
        </div>

        {/* ── SEEDING COMMAND STRIP (4 SEEDS TRACKER) ──────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', marginBottom: '10px' }}>
            🌱 Final Four Seeding Allocation
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {/* Seed 1 */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '3px 7px', borderRadius: '6px', background: '#10B981', color: '#000', fontWeight: 900, fontSize: '0.72rem' }}>#1</span>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: seed1 ? '#FFF' : 'rgba(255,255,255,0.45)' }}>
                    {seed1 ? seed1.name : 'TBD (Group Winner #1)'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>Best Group Winner</div>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>→ Q1</span>
            </div>

            {/* Seed 2 */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '3px 7px', borderRadius: '6px', background: '#10B981', color: '#000', fontWeight: 900, fontSize: '0.72rem' }}>#2</span>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: seed2 ? '#FFF' : 'rgba(255,255,255,0.45)' }}>
                    {seed2 ? seed2.name : 'TBD (Group Winner #2)'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>2nd Best Winner</div>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>→ Q1</span>
            </div>

            {/* Seed 3 */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '3px 7px', borderRadius: '6px', background: '#F59E0B', color: '#000', fontWeight: 900, fontSize: '0.72rem' }}>#3</span>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: seed3 ? '#FFF' : 'rgba(255,255,255,0.45)' }}>
                    {seed3 ? seed3.name : 'TBD (Group Winner #3)'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>3rd Best Winner</div>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 700 }}>→ Elim</span>
            </div>

            {/* Seed 4 */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '3px 7px', borderRadius: '6px', background: '#F59E0B', color: '#000', fontWeight: 900, fontSize: '0.72rem' }}>#4</span>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: seed4 ? '#FFF' : 'rgba(255,255,255,0.45)' }}>
                    {seed4 ? seed4.name : 'TBD (Wildcard Winner)'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>Wildcard Winner</div>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 700 }}>→ Elim</span>
            </div>
          </div>
        </div>

        {/* ── 4-STAGE TOURNAMENT TREE (100% RESPONSIVE GRID, NO SCROLLBAR) ── */}
        <div
          className="playoff-bracket-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '18px',
            alignItems: 'stretch',
          }}
        >
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* COLUMN 1: ROUND 1 (QUALIFIER 1 & ELIMINATOR)                 */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
              <span>ROUND 1</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ color: '#C0272D' }}>SEMI-FINALS</span>
            </div>

            {/* MATCH 13: QUALIFIER 1 */}
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(24, 24, 32, 0.95) 0%, rgba(16, 16, 22, 0.98) 100%)',
                borderRadius: '14px',
                border: q1?.status === 'LIVE' ? '1.5px solid #EF4444' : q1Winner ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                boxShadow: q1?.status === 'LIVE' ? '0 0 20px rgba(239, 68, 68, 0.2)' : '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C0272D' }} />
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#C0272D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      QUALIFIER 1 · #13
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: q1?.status === 'LIVE' ? '#EF4444' : q1Winner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                      color: q1Winner ? '#10B981' : '#FFF',
                    }}
                  >
                    {q1?.status || 'SCHEDULED'}
                  </span>
                </div>

                {/* Team 1 in Q1 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: q1Winner && q1?.teamAId && q1Winner.id === q1.teamAId ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                    borderLeft: q1Winner && q1?.teamAId && q1Winner.id === q1.teamAId ? '3px solid #10B981' : '3px solid transparent',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#10B981' }}>#1</span>
                    <strong
                      style={{
                        fontSize: '0.88rem',
                        color: q1Winner && q1?.teamAId && q1Winner.id === q1.teamAId ? '#FFB800' : q1?.teamA || seed1 ? '#FFF' : 'rgba(255,255,255,0.45)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {q1?.teamA?.name || seed1?.name || 'TBD (Seed #1)'}
                    </strong>
                    {q1Winner && q1?.teamAId && q1Winner.id === q1.teamAId && <span style={{ color: '#10B981', fontSize: '0.75rem' }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800', flexShrink: 0 }}>
                    {q1?.innings?.find((i: any) => i.battingTeamId === q1?.teamAId && !i.isSuperOver)
                      ? `${q1.innings.find((i: any) => i.battingTeamId === q1.teamAId && !i.isSuperOver).runs}/${q1.innings.find((i: any) => i.battingTeamId === q1.teamAId && !i.isSuperOver).wickets}`
                      : '-'}
                  </span>
                </div>

                {/* Team 2 in Q1 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: q1Winner && q1?.teamBId && q1Winner.id === q1.teamBId ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                    borderLeft: q1Winner && q1?.teamBId && q1Winner.id === q1.teamBId ? '3px solid #10B981' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#10B981' }}>#2</span>
                    <strong
                      style={{
                        fontSize: '0.88rem',
                        color: q1Winner && q1?.teamBId && q1Winner.id === q1.teamBId ? '#FFB800' : q1?.teamB || seed2 ? '#FFF' : 'rgba(255,255,255,0.45)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {q1?.teamB?.name || seed2?.name || 'TBD (Seed #2)'}
                    </strong>
                    {q1Winner && q1?.teamBId && q1Winner.id === q1.teamBId && <span style={{ color: '#10B981', fontSize: '0.75rem' }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800', flexShrink: 0 }}>
                    {q1?.innings?.find((i: any) => i.battingTeamId === q1?.teamBId && !i.isSuperOver)
                      ? `${q1.innings.find((i: any) => i.battingTeamId === q1.teamBId && !i.isSuperOver).runs}/${q1.innings.find((i: any) => i.battingTeamId === q1.teamBId && !i.isSuperOver).wickets}`
                      : '-'}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: q1Winner ? '#10B981' : 'rgba(255,255,255,0.5)' }}>
                  {q1Winner ? `✓ ${q1Winner.shortName || q1Winner.name} → Final` : 'Winner → Final · Loser → Q2'}
                </span>
                {q1 && (
                  <Link href={`/scorecard?matchId=${q1.id}`} style={{ fontSize: '0.72rem', color: '#FFB800', fontWeight: 700, textDecoration: 'none' }}>
                    Scorecard →
                  </Link>
                )}
              </div>
            </div>

            {/* MATCH 14: ELIMINATOR */}
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(24, 24, 32, 0.95) 0%, rgba(16, 16, 22, 0.98) 100%)',
                borderRadius: '14px',
                border: elim?.status === 'LIVE' ? '1.5px solid #EF4444' : elimWinner ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                boxShadow: elim?.status === 'LIVE' ? '0 0 20px rgba(239, 68, 68, 0.2)' : '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      ELIMINATOR · #14
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: elim?.status === 'LIVE' ? '#EF4444' : elimWinner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                      color: elimWinner ? '#10B981' : '#FFF',
                    }}
                  >
                    {elim?.status || 'SCHEDULED'}
                  </span>
                </div>

                {/* Team 1 in Eliminator */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: elimWinner && elim?.teamAId && elimWinner.id === elim.teamAId ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                    borderLeft: elimWinner && elim?.teamAId && elimWinner.id === elim.teamAId ? '3px solid #10B981' : '3px solid transparent',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#F59E0B' }}>#3</span>
                    <strong
                      style={{
                        fontSize: '0.88rem',
                        color: elimWinner && elim?.teamAId && elimWinner.id === elim.teamAId ? '#FFB800' : elim?.teamA || seed3 ? '#FFF' : 'rgba(255,255,255,0.45)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {elim?.teamA?.name || seed3?.name || 'TBD (Seed #3)'}
                    </strong>
                    {elimWinner && elim?.teamAId && elimWinner.id === elim.teamAId && <span style={{ color: '#10B981', fontSize: '0.75rem' }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800', flexShrink: 0 }}>
                    {elim?.innings?.find((i: any) => i.battingTeamId === elim?.teamAId && !i.isSuperOver)
                      ? `${elim.innings.find((i: any) => i.battingTeamId === elim.teamAId && !i.isSuperOver).runs}/${elim.innings.find((i: any) => i.battingTeamId === elim.teamAId && !i.isSuperOver).wickets}`
                      : '-'}
                  </span>
                </div>

                {/* Team 2 in Eliminator */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: elimWinner && elim?.teamBId && elimWinner.id === elim.teamBId ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                    borderLeft: elimWinner && elim?.teamBId && elimWinner.id === elim.teamBId ? '3px solid #10B981' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#F59E0B' }}>#4</span>
                    <strong
                      style={{
                        fontSize: '0.88rem',
                        color: elimWinner && elim?.teamBId && elimWinner.id === elim.teamBId ? '#FFB800' : elim?.teamB || seed4 ? '#FFF' : 'rgba(255,255,255,0.45)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {elim?.teamB?.name || seed4?.name || 'TBD (Wildcard Qualifier)'}
                    </strong>
                    {elimWinner && elim?.teamBId && elimWinner.id === elim.teamBId && <span style={{ color: '#10B981', fontSize: '0.75rem' }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800', flexShrink: 0 }}>
                    {elim?.innings?.find((i: any) => i.battingTeamId === elim?.teamBId && !i.isSuperOver)
                      ? `${elim.innings.find((i: any) => i.battingTeamId === elim.teamBId && !i.isSuperOver).runs}/${elim.innings.find((i: any) => i.battingTeamId === elim.teamBId && !i.isSuperOver).wickets}`
                      : '-'}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: elimWinner ? '#10B981' : 'rgba(255,255,255,0.5)' }}>
                  {elimWinner ? `✓ ${elimWinner.shortName || elimWinner.name} → Q2` : 'Winner → Q2 · Loser Out'}
                </span>
                {elim && (
                  <Link href={`/scorecard?matchId=${elim.id}`} style={{ fontSize: '0.72rem', color: '#FFB800', fontWeight: 700, textDecoration: 'none' }}>
                    Scorecard →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* COLUMN 2: ROUND 2 (QUALIFIER 2)                              */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
              <span>ROUND 2</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ color: '#FFB800' }}>FINAL SPOT</span>
            </div>

            {/* MATCH 15: QUALIFIER 2 */}
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(24, 24, 32, 0.95) 0%, rgba(16, 16, 22, 0.98) 100%)',
                borderRadius: '14px',
                border: q2?.status === 'LIVE' ? '1.5px solid #EF4444' : q2Winner ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 184, 0, 0.25)',
                padding: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFB800' }} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#FFB800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    QUALIFIER 2 · #15
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: q2?.status === 'LIVE' ? '#EF4444' : q2Winner ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                    color: q2Winner ? '#10B981' : '#FFF',
                  }}
                >
                  {q2?.status || 'SCHEDULED'}
                </span>
              </div>

              {/* Team 1 in Q2: Loser Q1 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: q2Winner && (q2Winner.id === (q2?.teamAId || q1Loser?.id)) ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                  borderLeft: q2Winner && (q2Winner.id === (q2?.teamAId || q1Loser?.id)) ? '3px solid #10B981' : '3px solid transparent',
                  marginBottom: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>LQ1:</span>
                  <strong
                    style={{
                      fontSize: '0.88rem',
                      color: q2Winner && (q2Winner.id === (q2?.teamAId || q1Loser?.id)) ? '#FFB800' : q2?.teamA || q1Loser ? '#FFF' : 'rgba(255,255,255,0.45)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {q2?.teamA?.name || q1Loser?.name || 'TBD (Loser Qualifier 1)'}
                  </strong>
                  {q2Winner && (q2Winner.id === (q2?.teamAId || q1Loser?.id)) && <span style={{ color: '#10B981', fontSize: '0.75rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800', flexShrink: 0 }}>
                  {q2?.innings?.find((i: any) => i.battingTeamId === q2?.teamAId && !i.isSuperOver)
                    ? `${q2.innings.find((i: any) => i.battingTeamId === q2.teamAId && !i.isSuperOver).runs}/${q2.innings.find((i: any) => i.battingTeamId === q2.teamAId && !i.isSuperOver).wickets}`
                    : '-'}
                </span>
              </div>

              {/* Team 2 in Q2: Winner Eliminator */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: q2Winner && (q2Winner.id === (q2?.teamBId || elimWinner?.id)) ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                  borderLeft: q2Winner && (q2Winner.id === (q2?.teamBId || elimWinner?.id)) ? '3px solid #10B981' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>WEL:</span>
                  <strong
                    style={{
                      fontSize: '0.88rem',
                      color: q2Winner && (q2Winner.id === (q2?.teamBId || elimWinner?.id)) ? '#FFB800' : q2?.teamB || elimWinner ? '#FFF' : 'rgba(255,255,255,0.45)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {q2?.teamB?.name || elimWinner?.name || 'TBD (Winner Eliminator)'}
                  </strong>
                  {q2Winner && (q2Winner.id === (q2?.teamBId || elimWinner?.id)) && <span style={{ color: '#10B981', fontSize: '0.75rem' }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800', flexShrink: 0 }}>
                  {q2?.innings?.find((i: any) => i.battingTeamId === q2?.teamBId && !i.isSuperOver)
                    ? `${q2.innings.find((i: any) => i.battingTeamId === q2.teamBId && !i.isSuperOver).runs}/${q2.innings.find((i: any) => i.battingTeamId === q2.teamBId && !i.isSuperOver).wickets}`
                    : '-'}
                </span>
              </div>

              <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: q2Winner ? '#10B981' : 'rgba(255,255,255,0.5)' }}>
                  {q2Winner ? `✓ ${q2Winner.shortName || q2Winner.name} → Final` : 'Winner → Final · Loser Out'}
                </span>
                {q2 && (
                  <Link href={`/scorecard?matchId=${q2.id}`} style={{ fontSize: '0.72rem', color: '#FFB800', fontWeight: 700, textDecoration: 'none' }}>
                    Scorecard →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* COLUMN 3: GRAND FINAL (MATCH 16)                             */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFD700', letterSpacing: '0.08em' }}>
              <span>STAGE 4</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span>🏆 GRAND FINAL</span>
            </div>

            {/* MATCH 16: GRAND FINAL */}
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(32, 28, 16, 0.95) 0%, rgba(20, 18, 12, 0.98) 100%)',
                borderRadius: '16px',
                border: finalMatch?.status === 'LIVE' ? '2px solid #EF4444' : crownedChampion ? '2px solid #FFD700' : '1.5px solid rgba(255, 215, 0, 0.4)',
                padding: '18px',
                boxShadow: crownedChampion ? '0 0 28px rgba(255, 215, 0, 0.2)' : '0 10px 30px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1rem' }}>🏆</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    GRAND FINAL · #16
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: crownedChampion ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255,255,255,0.08)',
                    color: crownedChampion ? '#FFD700' : '#FFF',
                  }}
                >
                  {finalMatch?.status || 'SCHEDULED'}
                </span>
              </div>

              {/* Finalist 1 (Winner Q1) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  background: crownedChampion && (crownedChampion.id === (finalMatch?.teamAId || q1Winner?.id)) ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                  borderLeft: crownedChampion && (crownedChampion.id === (finalMatch?.teamAId || q1Winner?.id)) ? '3px solid #FFD700' : '3px solid transparent',
                  marginBottom: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.45)', fontWeight: 800 }}>WQ1:</span>
                  <strong
                    style={{
                      fontSize: '0.92rem',
                      color: crownedChampion && (crownedChampion.id === (finalMatch?.teamAId || q1Winner?.id)) ? '#FFD700' : finalMatch?.teamA || q1Winner ? '#FFF' : 'rgba(255,255,255,0.45)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {finalMatch?.teamA?.name || q1Winner?.name || 'TBD (Winner Qualifier 1)'}
                  </strong>
                  {crownedChampion && (crownedChampion.id === (finalMatch?.teamAId || q1Winner?.id)) && <span style={{ color: '#FFD700', fontSize: '0.85rem' }}>👑</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.85rem', fontWeight: 900, color: '#FFB800', flexShrink: 0 }}>
                  {finalMatch?.innings?.find((i: any) => i.battingTeamId === finalMatch?.teamAId && !i.isSuperOver)
                    ? `${finalMatch.innings.find((i: any) => i.battingTeamId === finalMatch.teamAId && !i.isSuperOver).runs}/${finalMatch.innings.find((i: any) => i.battingTeamId === finalMatch.teamAId && !i.isSuperOver).wickets}`
                    : '-'}
                </span>
              </div>

              {/* Finalist 2 (Winner Q2) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  background: crownedChampion && (crownedChampion.id === (finalMatch?.teamBId || q2Winner?.id)) ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                  borderLeft: crownedChampion && (crownedChampion.id === (finalMatch?.teamBId || q2Winner?.id)) ? '3px solid #FFD700' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.45)', fontWeight: 800 }}>WQ2:</span>
                  <strong
                    style={{
                      fontSize: '0.92rem',
                      color: crownedChampion && (crownedChampion.id === (finalMatch?.teamBId || q2Winner?.id)) ? '#FFD700' : finalMatch?.teamB || q2Winner ? '#FFF' : 'rgba(255,255,255,0.45)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {finalMatch?.teamB?.name || q2Winner?.name || 'TBD (Winner Qualifier 2)'}
                  </strong>
                  {crownedChampion && (crownedChampion.id === (finalMatch?.teamBId || q2Winner?.id)) && <span style={{ color: '#FFD700', fontSize: '0.85rem' }}>👑</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.85rem', fontWeight: 900, color: '#FFB800', flexShrink: 0 }}>
                  {finalMatch?.innings?.find((i: any) => i.battingTeamId === finalMatch?.teamBId && !i.isSuperOver)
                    ? `${finalMatch.innings.find((i: any) => i.battingTeamId === finalMatch.teamBId && !i.isSuperOver).runs}/${finalMatch.innings.find((i: any) => i.battingTeamId === finalMatch.teamBId && !i.isSuperOver).wickets}`
                    : '-'}
                </span>
              </div>

              <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,215,0,0.25)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#FFD700', fontWeight: 700 }}>
                  {crownedChampion ? `👑 Champion: ${crownedChampion.name}` : 'Decides CPL 2026 Champion'}
                </span>
                {finalMatch && (
                  <Link href={`/scorecard?matchId=${finalMatch.id}`} style={{ fontSize: '0.74rem', color: '#FFD700', fontWeight: 800, textDecoration: 'none' }}>
                    Scorecard →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* COLUMN 4: CHAMPION TROPHY PODIUM                             */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFD700', letterSpacing: '0.08em' }}>
              <span>HONOURS</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span>2026 TITLE</span>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(20, 18, 12, 0.98) 100%)',
                borderRadius: '16px',
                border: '2px solid rgba(255, 215, 0, 0.45)',
                padding: '24px 18px',
                textAlign: 'center',
                boxShadow: crownedChampion ? '0 0 32px rgba(255, 215, 0, 0.25)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '210px',
              }}
            >
              <div style={{ fontSize: '2.8rem', marginBottom: '8px', filter: 'drop-shadow(0 4px 12px rgba(255, 215, 0, 0.4))' }}>
                🏆
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFD700', letterSpacing: '0.12em', marginBottom: '4px' }}>
                2026 CPL CHAMPION
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: crownedChampion ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  margin: '4px 0',
                  lineHeight: 1.1,
                }}
              >
                {crownedChampion ? crownedChampion.name : 'Awaiting Final'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', margin: '6px 0 0', lineHeight: 1.3 }}>
                {crownedChampion ? 'Official Tournament Winner' : 'Winner of Match 16 Claims the Trophy'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. GROUP STAGE OVERVIEW (3 COMPACT GROUP CARDS)               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="groups" style={{ marginBottom: '54px', scrollMarginTop: '90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '8px', height: '2px', background: 'var(--color-accent, #C0272D)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--color-accent, #C0272D)' }}>
                Stage 1 · 9 Teams
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
              Group Stage <span style={{ color: 'var(--color-accent, #C0272D)' }}>Standings</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', margin: '4px 0 0' }}>
              1st place qualifies directly for Final Four (Seeds #1–#3). 2nd place enters Wildcard. 3rd place eliminated.
            </p>
          </div>
        </div>

        {/* 3 Group Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {(['groupA', 'groupB', 'groupC'] as const).map((gKey) => {
            const groupObj = groups[gKey];
            const gLabel = gKey === 'groupA' ? 'Group A' : gKey === 'groupB' ? 'Group B' : 'Group C';
            const standings = groupObj?.standings || [];
            const isGroupActive = groupObj?.matches?.some((m: any) => m.status === 'LIVE');
            const completedCount = groupObj?.matches?.filter((m: any) => m.status === 'COMPLETED').length || 0;
            const isGroupDone = completedCount === 3;

            return (
              <div
                key={gKey}
                style={{
                  background: 'rgba(15, 15, 20, 0.95)',
                  border: isGroupActive ? '1.5px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', textTransform: 'uppercase' }}>
                      {gLabel}
                    </strong>
                    {isGroupActive && (
                      <span style={{ padding: '2px 6px', borderRadius: '9999px', background: '#EF4444', color: '#FFF', fontSize: '0.65rem', fontWeight: 900 }}>
                        ● LIVE
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-data)' }}>
                    {completedCount}/3 Completed
                  </span>
                </div>

                {standings.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    Standings will compute as matches are played.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: '6px 8px', width: '30px' }}>POS</th>
                          <th style={{ padding: '6px 8px' }}>TEAM</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center' }}>P</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center', color: '#FFB800' }}>PTS</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>NRR</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{isGroupDone ? 'STATUS' : 'IN PLAY'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, idx) => {
                          const isQual = idx === 0;
                          const isWild = idx === 1;
                          const isElim = idx === 2;

                          return (
                            <tr key={s.teamId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 800, color: isQual ? '#10B981' : isWild ? '#F59E0B' : '#EF4444' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '10px 8px', fontWeight: 700, color: '#FFF' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {s.logoUrl ? (
                                    <img src={s.logoUrl} alt={s.teamName} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
                                  ) : (
                                    <span>🏏</span>
                                  )}
                                  <span>{s.teamShortName || s.teamName}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.7)' }}>
                                {s.played}
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'var(--font-data)', fontWeight: 900, color: '#FFB800' }}>
                                {s.points}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-data)', fontWeight: 800, color: s.nrr >= 0 ? '#10B981' : '#EF4444' }}>
                                {s.displayNRR}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                <span
                                  style={{
                                    fontSize: '0.66rem',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: isGroupDone
                                      ? isQual ? 'rgba(16, 185, 129, 0.15)' : isWild ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                                      : 'rgba(255, 255, 255, 0.05)',
                                    color: isGroupDone
                                      ? isQual ? '#10B981' : isWild ? '#F59E0B' : '#EF4444'
                                      : 'rgba(255, 255, 255, 0.6)',
                                  }}
                                >
                                  {isGroupDone
                                    ? isQual ? '✓ Qualified' : isWild ? '→ Wildcard' : '✕ Out'
                                    : isQual ? '1st (In Play)' : isWild ? '2nd (In Play)' : '3rd (In Play)'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. WILDCARD MINI-LEAGUE (MATCHES 10-12)                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="wildcard" style={{ marginBottom: '54px', scrollMarginTop: '90px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 15, 20, 0.98) 100%)',
            border: '1.5px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '16px',
            padding: '24px 28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
                Stage 2 · Bridge to Final Four
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
                ⚡ Wildcard Mini-League (Matches 10–12)
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
                Single round-robin between the 3 Group Stage runners-up. The team finishing 1st claims <strong>Seed #4</strong> in the Final Four.
              </p>
            </div>

            {wildcard.qualifier ? (
              <div style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#10B981', fontWeight: 800, fontSize: '0.85rem' }}>
                ✓ QUALIFIED AS SEED #4: <strong>{wildcard.qualifier.name}</strong>
              </div>
            ) : (
              <div style={{ padding: '6px 14px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                {wildcard.matches.length > 0 ? `${wildcard.matches.filter((m: any) => m.status === 'COMPLETED').length}/3 Matches Completed` : 'Awaiting Group Stage Completion'}
              </div>
            )}
          </div>

          {wildcard.standings.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
              The 3 second-placed teams from Groups A, B, and C will automatically populate this table once the 9 Group Stage fixtures conclude.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '8px 10px', width: '40px' }}>POS</th>
                    <th style={{ padding: '8px 10px' }}>TEAM</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center' }}>P</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center' }}>W</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center' }}>L</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: '#FFB800' }}>PTS</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>NRR</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>OUTCOME</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const isWildcardDone = wildcard.matches.length === 3 && wildcard.matches.every((m: any) => m.status === 'COMPLETED');
                    return wildcard.standings.map((s, idx) => (
                      <tr key={s.teamId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px', fontWeight: 800, color: idx === 0 ? '#10B981' : '#EF4444' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, color: '#FFF' }}>
                          {s.teamName} ({s.teamShortName})
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--font-data)' }}>{s.played}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--font-data)' }}>{s.won}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--font-data)' }}>{s.lost}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center', fontFamily: 'var(--font-data)', fontWeight: 900, color: '#FFB800' }}>
                          {s.points}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-data)', fontWeight: 800, color: s.nrr >= 0 ? '#10B981' : '#EF4444' }}>
                          {s.displayNRR}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: isWildcardDone
                                ? idx === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(255, 255, 255, 0.05)',
                              color: isWildcardDone
                                ? idx === 0 ? '#10B981' : '#EF4444'
                                : 'rgba(255, 255, 255, 0.6)',
                            }}
                          >
                            {isWildcardDone
                              ? idx === 0 ? '✓ Advances to Eliminator (Seed #4)' : '✕ Eliminated'
                              : idx === 0 ? '1st (In Play)' : 'In Contention'}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7 & 8. RECENT RESULTS & UPCOMING FIXTURES                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="fixtures" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '54px', scrollMarginTop: '90px' }}>
        {/* Recent Results Card */}
        <div style={{ background: 'rgba(15, 15, 20, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
              📋 Recent Match Results
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)' }}>
              {completedMatchesList.length} Completed
            </span>
          </div>

          {completedMatchesList.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              No matches completed yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {completedMatchesList.slice(0, 4).map((m: any) => {
                const teamAInn = m.innings?.find((i: any) => i.battingTeamId === m.teamA?.id && !i.isSuperOver);
                const teamBInn = m.innings?.find((i: any) => i.battingTeamId === m.teamB?.id && !i.isSuperOver);

                return (
                  <div
                    key={m.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
                      <span>Match #{m.matchNumber} · {m.stage}</span>
                      <span>{m.venue || 'Ratmalana Ground'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: m.winnerTeamId === m.teamA?.id ? 900 : 500, color: m.winnerTeamId === m.teamA?.id ? '#FFB800' : '#FFF', fontSize: '0.88rem' }}>
                        {m.teamA?.name} {m.winnerTeamId === m.teamA?.id ? '🏆' : ''}
                      </span>
                      <span style={{ fontFamily: 'var(--font-data)', fontWeight: 800, fontSize: '0.88rem', color: '#FFF' }}>
                        {teamAInn ? `${teamAInn.runs}/${teamAInn.wickets}` : '-'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: m.winnerTeamId === m.teamB?.id ? 900 : 500, color: m.winnerTeamId === m.teamB?.id ? '#FFB800' : '#FFF', fontSize: '0.88rem' }}>
                        {m.teamB?.name} {m.winnerTeamId === m.teamB?.id ? '🏆' : ''}
                      </span>
                      <span style={{ fontFamily: 'var(--font-data)', fontWeight: 800, fontSize: '0.88rem', color: '#FFF' }}>
                        {teamBInn ? `${teamBInn.runs}/${teamBInn.wickets}` : '-'}
                      </span>
                    </div>

                    {m.resultNote && (
                      <div style={{ fontSize: '0.74rem', color: '#8AB4F8', fontWeight: 700, marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                        {m.resultNote}
                      </div>
                    )}

                    <Link href={`/scorecard?matchId=${m.id}`} style={{ display: 'block', fontSize: '0.72rem', color: '#FFB800', fontWeight: 700, marginTop: '6px', textDecoration: 'none' }}>
                      Scorecard & Commentary →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Fixtures Card */}
        <div style={{ background: 'rgba(15, 15, 20, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
              📅 Upcoming Fixtures
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)' }}>
              {upcomingMatchesList.length} Scheduled
            </span>
          </div>

          {upcomingMatchesList.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              All matches completed or awaiting schedule.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingMatchesList.slice(0, 4).map((m: any) => (
                <div
                  key={m.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
                    <span>Match #{m.matchNumber} · {m.stage}</span>
                    <span>{m.venue || 'Ratmalana Ground'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontWeight: 800, color: '#FFF', fontSize: '0.9rem' }}>
                      {m.teamA?.name || 'TBD'} vs {m.teamB?.name || 'TBD'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 184, 0, 0.15)', color: '#FFB800' }}>
                      SCHEDULED
                    </span>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                    Overs: {m.oversPerInnings || 4} ov · {m.ballsPerOver || 4} balls/ov
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 9. TOURNAMENT STATISTICS                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '54px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', marginBottom: '16px' }}>
          📊 Competition Metrics
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
              Matches Played
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-accent, #C0272D)' }}>
              {progress.completedMatches} / {progress.totalMatches}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>16 Total Scheduled</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
              Remaining Fixtures
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.6rem', fontWeight: 900, color: '#FFB800' }}>
              {progress.totalMatches - progress.completedMatches}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Matches to Champion</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
              Registered Teams
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.6rem', fontWeight: 900, color: '#FFF' }}>
              9 Teams
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Across Groups A, B, C</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
              Current Stage
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.2rem', fontWeight: 900, color: '#10B981', textTransform: 'uppercase' }}>
              {progress.currentStage}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Authoritative Progression</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
              Highest Score
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.1rem', fontWeight: 900, color: '#FFB800' }}>
              {highestScoreText}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Tournament Record</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
              Top Net Run Rate
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.1rem', fontWeight: 900, color: '#10B981' }}>
              {highestNRRTeam}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Best Stage NRR</div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 10. RULES & BALL-BASED NRR EXPLAINER CARD                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>📜</span>
              <strong style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFB800' }}>
                Official CPL 2026 Match Rules & Tournament Information
              </strong>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link
                href="/rules"
                style={{
                  background: 'rgba(255, 184, 0, 0.15)',
                  border: '1px solid rgba(255, 184, 0, 0.4)',
                  borderRadius: '6px',
                  color: '#FFB800',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Full Rules Page →
              </Link>
              <button
                onClick={() => setShowNrrRules(!showNrrRules)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: '#FFF',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showNrrRules ? 'Hide Rules Breakdown' : 'Show 8 Official Rules'}
              </button>
            </div>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.45 }}>
            Key tournament regulations governing bowling allocations, extras, boundary fielding, points system, awards, and committee provisions for CPL 2026.
          </p>

          {showNrrRules && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: '#FFB800', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>🎯 1. Bowling Limits</strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, display: 'block' }}>
                  Maximum 1 over per bowler per match.
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: '#FFB800', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>🚫 2. No Ball</strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, display: 'block' }}>
                  Any delivery above chest height. Grants +1 run and an extra delivery. <strong>No Free Hit after a No Ball.</strong> Chucking / illegal bowling action strictly prohibited and called as a No Ball.
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: '#FFB800', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>↔️ 3. Wide Ball</strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, display: 'block' }}>
                  Delivery outside batter's reasonable hitting reach. Grants +1 run and an extra delivery.
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: '#FFB800', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>🛡️ 4. Boundary Fielding</strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, display: 'block' }}>
                  Maximum 3 fielders on leg side, maximum 2 fielders on off side.
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: '#FFB800', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>⚖️ 5. Authority</strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, display: 'block' }}>
                  Umpire's decision is final. Overs and balls per over may be adjusted according to match time.
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: '#FFB800', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>📊 6. Points & Standings</strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, display: 'block' }}>
                  Win = 2 pts, Tie = 1 pt, Loss = 0 pts. Minimum 2 matches per team in league stage. Points rank teams; Net Run Rate (NRR) breaks ties.
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: '#FFB800', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>🎉 7. Provided by Organizing Committee</strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, display: 'block' }}>
                  Refreshments, T4 match balls, Lunch, Post-match DJ party.
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: '#FFB800', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>🏆 8. Awards</strong>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, display: 'block' }}>
                  1st Place Trophy, 2nd Place Trophy, Best Batsman (Most Runs), Best Bowler (Most Wickets), Man of the Final (Best performance by Batter or Bowler).
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
        </div>
      </div>
    </>
  );
}
