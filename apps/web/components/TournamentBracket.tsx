'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PlayoffBracketTree from '@/app/tournament/components/PlayoffBracketTree';
import PlayoffQualificationFlow from '@/app/tournament/components/PlayoffQualificationFlow';
import SixTeamWildcardSection from '@/app/tournament/components/SixTeamWildcardSection';

export default function TournamentBracket() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTournamentData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournament/stats?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.overview) {
        setOverview(data.overview);
      }
    } catch (err) {
      console.error('[TournamentBracket] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournamentData();
    const interval = setInterval(fetchTournamentData, 15000);
    return () => clearInterval(interval);
  }, [fetchTournamentData]);

  const tournamentFormat = overview?.normalizedFormat || overview?.tournamentFormat || '8_TEAM';
  const playoffs = overview?.playoffs || {};
  const progress = overview?.progress || { totalMatches: 16, completedMatches: 0, currentStage: 'GROUP' };
  const qualification = overview?.qualification || { matches: [] };
  const wildcard = overview?.wildcard;

  // Authoritative Seed Resolution
  const seed1 = playoffs.seeds?.[0]?.team;
  const seed2 = playoffs.seeds?.[1]?.team;
  const seed3 = playoffs.seeds?.[2]?.team;
  const seed4 = playoffs.seeds?.[3]?.team;

  // Authoritative Match Cards
  const q1 = playoffs.qualifier1 || playoffs.match12 || playoffs.playoff1;
  const elim = playoffs.eliminator || playoffs.match13 || playoffs.playoff2;
  const q2 = playoffs.qualifier2 || playoffs.match14 || playoffs.finalSpotPlayoff;
  const finalMatch = playoffs.final;
  const champion = playoffs.champion;

  // Outcome Resolutions
  const q1Winner = q1?.status === 'COMPLETED' && q1?.winnerTeamId ? q1.winnerTeam : null;
  const q1Loser = q1?.status === 'COMPLETED' && q1?.winnerTeamId
    ? (q1.teamAId === q1.winnerTeamId ? q1.teamB : q1.teamA)
    : null;

  const elimWinner = elim?.status === 'COMPLETED' && elim?.winnerTeamId ? elim.winnerTeam : null;
  const elimLoser = elim?.status === 'COMPLETED' && elim?.winnerTeamId
    ? (elim.teamAId === elim.winnerTeamId ? elim.teamB : elim.teamA)
    : null;

  const q2Winner = q2?.status === 'COMPLETED' && q2?.winnerTeamId ? q2.winnerTeam : null;
  const q2Loser = q2?.status === 'COMPLETED' && q2?.winnerTeamId
    ? (q2.teamAId === q2.winnerTeamId ? q2.teamB : q2.teamA)
    : null;

  const crownedChampion = champion || (finalMatch?.status === 'COMPLETED' && finalMatch?.winnerTeam ? finalMatch.winnerTeam : null);

  const formatBadgeText = tournamentFormat === '6_TEAM'
    ? '6 Teams · 13 Matches · 4 Stages'
    : tournamentFormat === '7_TEAM'
    ? '7 Teams · 11 Matches · 3 Stages'
    : '8 Teams · 16 Matches · 3 Stages';

  return (
    <section
      id="fixtures"
      style={{
        padding: 'clamp(48px, 6vw, 84px) var(--space-md)',
        background: 'linear-gradient(180deg, #090A0F 0%, #0D0F17 100%)',
        borderTop: '1.5px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        color: '#FFFFFF',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Section Header */}
        <div style={{ marginBottom: 'clamp(24px, 4vw, 36px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '12px', height: '3px', background: 'var(--color-accent, #C0272D)', display: 'inline-block', borderRadius: '2px' }} />
            <span
              style={{
                fontFamily: 'var(--font-data, monospace)',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-accent, #C0272D)',
              }}
            >
              Live Tournament Hub · Championship Roadmap
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  margin: 0,
                  lineHeight: 1.05,
                  letterSpacing: '0.02em',
                }}
              >
                Tournament <span style={{ color: 'var(--color-accent, #C0272D)' }}>Bracket</span> & Playoffs
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.92rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginTop: '6px',
                  marginBottom: 0,
                  maxWidth: '680px',
                }}
              >
                Official championship progression circuit with live stage resolution, qualification pipeline, and Grand Final honours.
              </p>
            </div>

            {/* Quick Badges & Direct Hub Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(192, 39, 45, 0.15)',
                  border: '1px solid rgba(192, 39, 45, 0.35)',
                  color: '#FCA5A5',
                  fontFamily: 'var(--font-data, monospace)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#EF4444',
                    boxShadow: '0 0 8px #EF4444',
                  }}
                />
                <span>{formatBadgeText}</span>
              </div>

              <Link
                href="/tournament"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 18px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #C0272D 0%, #991B1B 100%)',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(192, 39, 45, 0.45)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>🏆 Full Tournament Hub ➔</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Live Connected Playoff Bracket Tree */}
        {loading && !overview ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔄</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Synchronizing Live Tournament Hub Brackets...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* 1. Main Playoff Bracket Tree (Connected 5-Arrow Circuit on Desktop, Stage Selector on Mobile) */}
            <PlayoffBracketTree
              tournamentFormat={tournamentFormat}
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

            {/* 2. Stage 2 Playoff Pipeline: Wildcards (6-Team only, no qualification stage for 7-team or 8-team) */}
            {tournamentFormat === '6_TEAM' && wildcard && (
              <div style={{ marginTop: '16px' }}>
                <SixTeamWildcardSection wildcard={wildcard} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
