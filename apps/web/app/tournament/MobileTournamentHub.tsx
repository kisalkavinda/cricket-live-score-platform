'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TournamentOverview } from '@/lib/tournament/tournament-service';
import { TeamStanding } from '@/lib/tournament/nrr-engine';

interface MobileTournamentHubProps {
  overview: TournamentOverview;
  liveMatch: any;
  nextMatch: any;
  completedMatchesList: any[];
  upcomingMatchesList: any[];
  highestScoreText: string;
  highestNRRTeam: string;
  highestNRR: number;
  q1: any;
  q1Winner: any;
  q1Loser: any;
  elim: any;
  elimWinner: any;
  elimLoser: any;
  q2: any;
  q2Winner: any;
  q2Loser: any;
  finalMatch: any;
  crownedChampion: any;
  seed1: any;
  seed2: any;
  seed3: any;
  seed4: any;
  isRefreshing: boolean;
  refreshTournamentData: () => void;
  lastRefreshed: string;
}

export default function MobileTournamentHub({
  overview,
  liveMatch,
  nextMatch,
  completedMatchesList,
  upcomingMatchesList,
  highestScoreText,
  highestNRRTeam,
  highestNRR,
  q1,
  q1Winner,
  q1Loser,
  elim,
  elimWinner,
  elimLoser,
  q2,
  q2Winner,
  q2Loser,
  finalMatch,
  crownedChampion,
  seed1,
  seed2,
  seed3,
  seed4,
  isRefreshing,
  refreshTournamentData,
  lastRefreshed,
}: MobileTournamentHubProps) {
  const { groups, wildcard, playoffs, matches, progress, tournament } = overview;
  const [stickyDismissed, setStickyDismissed] = useState(false);

  // Dynamic ballsPerOver from match data or default
  const ballsPerOver = matches?.[0]?.ballsPerOver || 4;
  const oversPerInnings = matches?.[0]?.oversPerInnings || 4;

  // Derive score line for a team in a match
  const getTeamScore = (match: any, teamId: string | undefined) => {
    if (!match || !teamId) return null;
    const inn = (match.innings || []).find(
      (i: any) => i.battingTeamId === teamId && !i.isSuperOver
    );
    if (!inn) return null;
    return {
      runs: inn.runs ?? 0,
      wickets: inn.wickets ?? 0,
      overs: inn.overs ?? 0,
      balls: inn.balls ?? 0,
    };
  };

  const stageOrder = ['GROUP', 'WILDCARD', 'PLAYOFFS', 'FINAL', 'COMPLETED'];
  const currentStageIdx = stageOrder.indexOf(progress.currentStage);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        padding: '0 14px 60px',
        boxSizing: 'border-box',
      }}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. COMPACT TOURNAMENT STATUS & HEADER                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '16px', paddingTop: '4px' }}>
        {crownedChampion ? (
          <div
            style={{
              marginBottom: '14px',
              padding: '16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.22) 0%, rgba(192, 39, 45, 0.18) 100%)',
              border: '1.5px solid rgba(255, 184, 0, 0.5)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>🏆</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#FFB800' }}>
              2026 Champion Crowned
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, color: '#FFF', textTransform: 'uppercase' }}>
              {crownedChampion.name}
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '2px', background: 'var(--color-accent, #C0272D)' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-accent, #C0272D)' }}>
              CPL 2026
            </span>
          </div>

          <button
            onClick={refreshTournamentData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '9999px',
              padding: '4px 10px',
              color: '#FFF',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '32px',
            }}
          >
            <span style={{ display: 'inline-block', transform: isRefreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}>
              ↻
            </span>
            <span>{isRefreshing ? 'Syncing...' : lastRefreshed || 'Live Sync'}</span>
          </button>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: '#FFFFFF',
            lineHeight: 1.1,
            margin: '0 0 8px',
            letterSpacing: '-0.01em',
          }}
        >
          Tournament Hub
        </h1>

        {/* Stage & Completion Pill Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'rgba(192, 39, 45, 0.18)',
              border: '1px solid rgba(192, 39, 45, 0.4)',
              color: '#FF4D4D',
              fontSize: '0.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#FF4D4D',
                animation: 'pulse 1.5s infinite',
              }}
            />
            {progress.currentStage === 'GROUP'
              ? 'Group Stage'
              : progress.currentStage === 'WILDCARD'
              ? 'Wildcard Mini-League'
              : progress.currentStage === 'PLAYOFFS'
              ? 'Final Four Playoffs'
              : progress.currentStage === 'FINAL'
              ? 'Championship Final'
              : 'Completed'}
          </div>

          <div
            style={{
              padding: '5px 10px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.74rem',
              fontWeight: 700,
              fontFamily: 'var(--font-data)',
            }}
          >
            {progress.completedMatches} / {progress.totalMatches} Matches
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MOBILE LIVE MATCH SPOTLIGHT (OR NEXT UP FIXTURE)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {liveMatch ? (
        <section style={{ marginBottom: '22px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(192, 39, 45, 0.15) 0%, rgba(15, 12, 12, 0.95) 100%)',
              border: '1.5px solid rgba(192, 39, 45, 0.5)',
              boxShadow: '0 8px 24px rgba(192, 39, 45, 0.25)',
            }}
          >
            {/* Live Card Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#EF4444',
                    animation: 'pulse 1.2s infinite',
                  }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  LIVE NOW · Match #{liveMatch.matchNumber}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                {liveMatch.stage}
              </span>
            </div>

            {/* Team 1 Score Row */}
            {(() => {
              const scoreA = getTeamScore(liveMatch, liveMatch.teamAId);
              const scoreB = getTeamScore(liveMatch, liveMatch.teamBId);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(192, 39, 45, 0.3)',
                          border: '1px solid rgba(192, 39, 45, 0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          color: '#FFF',
                          flexShrink: 0,
                        }}
                      >
                        {liveMatch.teamA?.shortName?.slice(0, 3) || 'A'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {liveMatch.teamA?.name || 'Team A'}
                        </div>
                        {scoreA && (
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-data)' }}>
                            {scoreA.overs}.{scoreA.balls} ov ({ballsPerOver} b/ov)
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.75rem', fontWeight: 900, color: '#FFB800', lineHeight: 1 }}>
                        {scoreA ? `${scoreA.runs}/${scoreA.wickets}` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Team 2 Score Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(255, 184, 0, 0.2)',
                          border: '1px solid rgba(255, 184, 0, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          color: '#FFB800',
                          flexShrink: 0,
                        }}
                      >
                        {liveMatch.teamB?.shortName?.slice(0, 3) || 'B'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {liveMatch.teamB?.name || 'Team B'}
                        </div>
                        {scoreB && (
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-data)' }}>
                            {scoreB.overs}.{scoreB.balls} ov ({ballsPerOver} b/ov)
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.75rem', fontWeight: 900, color: '#FFB800', lineHeight: 1 }}>
                        {scoreB ? `${scoreB.runs}/${scoreB.wickets}` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Watch Live Scorecard Button (Min 44px touch target) */}
            <Link
              href={`/scorecard?matchId=${liveMatch.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                minHeight: '44px',
                borderRadius: '10px',
                background: 'var(--color-accent, #C0272D)',
                color: '#FFFFFF',
                fontFamily: 'var(--font-display)',
                fontSize: '0.92rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(192, 39, 45, 0.35)',
              }}
            >
              <span>Watch Live Scorecard</span>
              <span style={{ fontSize: '1.1rem' }}>→</span>
            </Link>
          </div>
        </section>
      ) : nextMatch ? (
        <section style={{ marginBottom: '22px' }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 184, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 184, 0, 0.15)',
                  border: '1px solid rgba(255, 184, 0, 0.4)',
                  color: '#FFB800',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                }}
              >
                UP NEXT · #{nextMatch.matchNumber}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                {nextMatch.stage}
              </span>
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFF' }}>
              {nextMatch.teamA?.name || 'TBD'} <span style={{ color: '#FFB800', fontWeight: 600 }}>vs</span> {nextMatch.teamB?.name || 'TBD'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
              <span>{nextMatch.venue || 'Ratmalana Ground'}</span>
              <Link
                href={`/scorecard?matchId=${nextMatch.id}`}
                style={{
                  color: '#FFB800',
                  fontWeight: 700,
                  textDecoration: 'none',
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Match Details →
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. COMPACT 4-STAGE TOURNAMENT PROGRESS RIBBON                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '24px' }}>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {[
              { key: 'GROUP', label: 'GROUPS' },
              { key: 'WILDCARD', label: 'WILD' },
              { key: 'PLAYOFFS', label: 'PLAYOFF' },
              { key: 'FINAL', label: 'FINAL' },
            ].map((stage, idx) => {
              const isPast = currentStageIdx > idx;
              const isCurrent = progress.currentStage === stage.key;

              return (
                <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 2 }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isPast
                        ? '#10B981'
                        : isCurrent
                        ? 'var(--color-accent, #C0272D)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: isCurrent ? '2px solid #FFF' : '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      color: '#FFF',
                      marginBottom: '4px',
                    }}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: isCurrent ? 800 : 600,
                      color: isCurrent ? '#FFF' : isPast ? '#10B981' : 'rgba(255, 255, 255, 0.4)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MOBILE CHAMPIONSHIP PATHWAY (VERTICAL PROGRESSION)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="bracket-mobile" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#FFB800' }}>
              Knockout Tree
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
              Championship Path
            </h2>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
            4-Team Playoff
          </span>
        </div>

        {/* Step 1: Seeds Strip */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '10px',
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Final Four Qualified Seeds
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {[
              { seed: '#1', team: seed1, fallback: 'Group Winner #1' },
              { seed: '#2', team: seed2, fallback: 'Group Winner #2' },
              { seed: '#3', team: seed3, fallback: 'Group Winner #3' },
              { seed: '#4', team: seed4, fallback: 'Wildcard Winner' },
            ].map((s) => (
              <div
                key={s.seed}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: s.team ? 'rgba(255, 184, 0, 0.08)' : 'rgba(255,255,255,0.02)',
                  border: s.team ? '1px solid rgba(255, 184, 0, 0.25)' : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#FFB800' }}>{s.seed}</span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: s.team ? 700 : 500,
                    color: s.team ? '#FFF' : 'rgba(255,255,255,0.4)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.team?.shortName || s.fallback}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow Down Connector */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '1rem', margin: '4px 0' }}>
          ↓
        </div>

        {/* Step 2: Qualifier 1 Card (#13) */}
        <div
          style={{
            background: 'rgba(15, 15, 20, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FFB800', textTransform: 'uppercase' }}>
              Qualifier 1 · Match #13
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: q1?.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                color: q1?.status === 'COMPLETED' ? '#10B981' : 'rgba(255,255,255,0.5)',
                fontWeight: 700,
              }}
            >
              {q1?.status || 'SCHEDULED'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Team A (#1) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: q1Winner && q1?.teamAId && q1Winner.id === q1.teamAId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#FFB800' }}>#1</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>
                  {q1?.teamA?.name || seed1?.name || 'TBD (Seed #1)'}
                </span>
                {q1Winner && q1?.teamAId && q1Winner.id === q1.teamAId && <span style={{ color: '#10B981' }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                {(() => {
                  const s = getTeamScore(q1, q1?.teamAId);
                  return s ? `${s.runs}/${s.wickets}` : '-';
                })()}
              </span>
            </div>

            {/* Team B (#2) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: q1Winner && q1?.teamBId && q1Winner.id === q1.teamBId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#10B981' }}>#2</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>
                  {q1?.teamB?.name || seed2?.name || 'TBD (Seed #2)'}
                </span>
                {q1Winner && q1?.teamBId && q1Winner.id === q1.teamBId && <span style={{ color: '#10B981' }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                {(() => {
                  const s = getTeamScore(q1, q1?.teamBId);
                  return s ? `${s.runs}/${s.wickets}` : '-';
                })()}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: q1Winner ? '#10B981' : 'rgba(255,255,255,0.5)' }}>
              {q1Winner ? `✓ ${q1Winner.shortName || q1Winner.name} → Final` : 'Winner → Final · Loser → Q2'}
            </span>
            {q1 && (
              <Link href={`/scorecard?matchId=${q1.id}`} style={{ fontSize: '0.68rem', color: '#FFB800', textDecoration: 'none', fontWeight: 700, minHeight: '36px', display: 'inline-flex', alignItems: 'center' }}>
                Scorecard →
              </Link>
            )}
          </div>
        </div>

        {/* Arrow Down Connector */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '1rem', margin: '4px 0' }}>
          ↓
        </div>

        {/* Step 3: Eliminator Card (#14) */}
        <div
          style={{
            background: 'rgba(15, 15, 20, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' }}>
              Eliminator · Match #14
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: elim?.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                color: elim?.status === 'COMPLETED' ? '#10B981' : 'rgba(255,255,255,0.5)',
                fontWeight: 700,
              }}
            >
              {elim?.status || 'SCHEDULED'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Team A (#3) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: elimWinner && elim?.teamAId && elimWinner.id === elim.teamAId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#3B82F6' }}>#3</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>
                  {elim?.teamA?.name || seed3?.name || 'TBD (Seed #3)'}
                </span>
                {elimWinner && elim?.teamAId && elimWinner.id === elim.teamAId && <span style={{ color: '#10B981' }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                {(() => {
                  const s = getTeamScore(elim, elim?.teamAId);
                  return s ? `${s.runs}/${s.wickets}` : '-';
                })()}
              </span>
            </div>

            {/* Team B (#4) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: elimWinner && elim?.teamBId && elimWinner.id === elim.teamBId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#A855F7' }}>#4</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>
                  {elim?.teamB?.name || seed4?.name || 'TBD (Wildcard #4)'}
                </span>
                {elimWinner && elim?.teamBId && elimWinner.id === elim.teamBId && <span style={{ color: '#10B981' }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                {(() => {
                  const s = getTeamScore(elim, elim?.teamBId);
                  return s ? `${s.runs}/${s.wickets}` : '-';
                })()}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: elimWinner ? '#10B981' : 'rgba(255,255,255,0.5)' }}>
              {elimWinner ? `✓ ${elimWinner.shortName || elimWinner.name} → Q2` : 'Winner → Q2 · Loser Eliminated'}
            </span>
            {elim && (
              <Link href={`/scorecard?matchId=${elim.id}`} style={{ fontSize: '0.68rem', color: '#FFB800', textDecoration: 'none', fontWeight: 700, minHeight: '36px', display: 'inline-flex', alignItems: 'center' }}>
                Scorecard →
              </Link>
            )}
          </div>
        </div>

        {/* Arrow Down Connector */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '1rem', margin: '4px 0' }}>
          ↓
        </div>

        {/* Step 4: Qualifier 2 Card (#15) */}
        <div
          style={{
            background: 'rgba(15, 15, 20, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FFB800', textTransform: 'uppercase' }}>
              Qualifier 2 · Match #15
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: q2?.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                color: q2?.status === 'COMPLETED' ? '#10B981' : 'rgba(255,255,255,0.5)',
                fontWeight: 700,
              }}
            >
              {q2?.status || 'SCHEDULED'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Loser of Q1 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: q2Winner && q2?.teamAId && q2Winner.id === q2.teamAId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>Q1-L</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>
                  {q2?.teamA?.name || q1Loser?.name || 'Loser of Qualifier 1'}
                </span>
                {q2Winner && q2?.teamAId && q2Winner.id === q2.teamAId && <span style={{ color: '#10B981' }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                {(() => {
                  const s = getTeamScore(q2, q2?.teamAId);
                  return s ? `${s.runs}/${s.wickets}` : '-';
                })()}
              </span>
            </div>

            {/* Winner of Eliminator */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: q2Winner && q2?.teamBId && q2Winner.id === q2.teamBId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>EL-W</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFF' }}>
                  {q2?.teamB?.name || elimWinner?.name || 'Winner of Eliminator'}
                </span>
                {q2Winner && q2?.teamBId && q2Winner.id === q2.teamBId && <span style={{ color: '#10B981' }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.82rem', fontWeight: 800, color: '#FFB800' }}>
                {(() => {
                  const s = getTeamScore(q2, q2?.teamBId);
                  return s ? `${s.runs}/${s.wickets}` : '-';
                })()}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: q2Winner ? '#10B981' : 'rgba(255,255,255,0.5)' }}>
              {q2Winner ? `✓ ${q2Winner.shortName || q2Winner.name} → Final` : 'Winner → Final · Loser Eliminated'}
            </span>
            {q2 && (
              <Link href={`/scorecard?matchId=${q2.id}`} style={{ fontSize: '0.68rem', color: '#FFB800', textDecoration: 'none', fontWeight: 700, minHeight: '36px', display: 'inline-flex', alignItems: 'center' }}>
                Scorecard →
              </Link>
            )}
          </div>
        </div>

        {/* Arrow Down Connector */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '1rem', margin: '4px 0' }}>
          ↓
        </div>

        {/* Step 5: Grand Final Card (#16) */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.1) 0%, rgba(15, 15, 20, 0.98) 100%)',
            border: '1.5px solid rgba(255, 184, 0, 0.45)',
            borderRadius: '12px',
            padding: '14px',
            boxShadow: '0 6px 20px rgba(255, 184, 0, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>👑</span>
              <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#FFB800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Grand Final · Match #16
              </span>
            </div>
            <span
              style={{
                fontSize: '0.66rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: finalMatch?.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                color: finalMatch?.status === 'COMPLETED' ? '#10B981' : '#FFB800',
                fontWeight: 700,
              }}
            >
              {finalMatch?.status || 'SCHEDULED'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Winner of Q1 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: crownedChampion && finalMatch?.teamAId && crownedChampion.id === finalMatch.teamAId ? 'rgba(255, 184, 0, 0.2)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#FFB800' }}>Q1-W</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFF' }}>
                  {finalMatch?.teamA?.name || q1Winner?.name || 'Winner of Qualifier 1'}
                </span>
                {crownedChampion && finalMatch?.teamAId && crownedChampion.id === finalMatch.teamAId && <span>🏆</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.86rem', fontWeight: 900, color: '#FFB800' }}>
                {(() => {
                  const s = getTeamScore(finalMatch, finalMatch?.teamAId);
                  return s ? `${s.runs}/${s.wickets}` : '-';
                })()}
              </span>
            </div>

            {/* Winner of Q2 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: crownedChampion && finalMatch?.teamBId && crownedChampion.id === finalMatch.teamBId ? 'rgba(255, 184, 0, 0.2)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#FFB800' }}>Q2-W</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFF' }}>
                  {finalMatch?.teamB?.name || q2Winner?.name || 'Winner of Qualifier 2'}
                </span>
                {crownedChampion && finalMatch?.teamBId && crownedChampion.id === finalMatch.teamBId && <span>🏆</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.86rem', fontWeight: 900, color: '#FFB800' }}>
                {(() => {
                  const s = getTeamScore(finalMatch, finalMatch?.teamBId);
                  return s ? `${s.runs}/${s.wickets}` : '-';
                })()}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: crownedChampion ? '#FFB800' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
              {crownedChampion ? `🏆 Champion: ${crownedChampion.shortName || crownedChampion.name}` : 'Winner Crowned 2026 Champion'}
            </span>
            {finalMatch && (
              <Link href={`/scorecard?matchId=${finalMatch.id}`} style={{ fontSize: '0.68rem', color: '#FFB800', textDecoration: 'none', fontWeight: 700, minHeight: '36px', display: 'inline-flex', alignItems: 'center' }}>
                Scorecard →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MOBILE GROUP STAGE STANDINGS (STACKED VERTICAL)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="groups-mobile" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-accent, #C0272D)' }}>
              Stage 1
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
              Group Standings
            </h2>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-data)' }}>
            3 Groups × 3 Teams
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { name: 'Group A', data: groups.groupA },
            { name: 'Group B', data: groups.groupB },
            { name: 'Group C', data: groups.groupC },
          ].map((group) => (
            <div
              key={group.name}
              style={{
                background: 'rgba(15, 15, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem', fontWeight: 900, color: '#FFF', textTransform: 'uppercase' }}>
                  {group.name}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                  {group.data?.matches?.filter((m: any) => m.status === 'COMPLETED').length || 0}/3 Completed
                </span>
              </div>

              {/* Standings Table - Locked to viewport width, zero horizontal overflow */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                <thead>
                  <tr style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '4px 2px', width: '22px' }}>#</th>
                    <th style={{ padding: '4px 4px' }}>Team</th>
                    <th style={{ padding: '4px 2px', textAlign: 'center', width: '22px' }}>P</th>
                    <th style={{ padding: '4px 2px', textAlign: 'center', width: '28px', color: '#FFF' }}>PTS</th>
                    <th style={{ padding: '4px 2px', textAlign: 'right', width: '56px' }}>NRR</th>
                  </tr>
                </thead>
                <tbody>
                  {(group.data?.standings || []).map((s: TeamStanding) => {
                    const isQualified = s.qualificationStatus === 'QUALIFIED' || s.pos === 1;
                    const isWildcard = s.qualificationStatus === 'WILDCARD' || s.pos === 2;
                    const isEliminated = s.qualificationStatus === 'ELIMINATED' || s.pos === 3;

                    return (
                      <tr
                        key={s.teamId}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: isQualified
                            ? 'rgba(255, 184, 0, 0.05)'
                            : isWildcard
                            ? 'rgba(59, 130, 246, 0.04)'
                            : 'transparent',
                        }}
                      >
                        <td style={{ padding: '6px 2px', fontWeight: 800, color: isQualified ? '#FFB800' : isWildcard ? '#3B82F6' : 'rgba(255,255,255,0.4)' }}>
                          {s.pos}
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                            <span style={{ fontWeight: 700, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.teamShortName}
                            </span>
                            {isQualified && (
                              <span style={{ fontSize: '0.62rem', color: '#10B981', fontWeight: 800 }}>✓</span>
                            )}
                            {isWildcard && (
                              <span style={{ fontSize: '0.62rem', color: '#3B82F6', fontWeight: 800 }}>→</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-data)' }}>
                          {s.played}
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center', fontWeight: 900, color: '#FFF', fontFamily: 'var(--font-data)' }}>
                          {s.points}
                        </td>
                        <td
                          style={{
                            padding: '6px 2px',
                            textAlign: 'right',
                            fontFamily: 'var(--font-data)',
                            fontWeight: 800,
                            color: s.nrr > 0 ? '#10B981' : s.nrr < 0 ? '#EF4444' : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {s.displayNRR}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Group Qualification Legend */}
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ color: '#FFB800' }}>1st → Final Four</span>
                <span style={{ color: '#3B82F6' }}>2nd → Wildcard</span>
                <span style={{ color: '#EF4444' }}>3rd → Out</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MOBILE WILDCARD MINI-LEAGUE (COMPACT BRIDGE)               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="wildcard-mobile" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3B82F6' }}>
              Stage 2
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
              Wildcard Mini-League
            </h2>
          </div>
          <span style={{ fontSize: '0.68rem', color: '#FFB800', fontWeight: 700 }}>
            Winner → Seed #4
          </span>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(15, 15, 20, 0.95) 100%)',
            border: '1.5px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', lineHeight: 1.4 }}>
            The 3 runners-up from Groups A, B, and C compete in a single round-robin. The #1 team claims <strong>Seed #4</strong> in the Eliminator.
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ padding: '4px 2px', width: '22px' }}>#</th>
                <th style={{ padding: '4px 4px' }}>Team</th>
                <th style={{ padding: '4px 2px', textAlign: 'center', width: '22px' }}>P</th>
                <th style={{ padding: '4px 2px', textAlign: 'center', width: '28px', color: '#FFF' }}>PTS</th>
                <th style={{ padding: '4px 2px', textAlign: 'right', width: '56px' }}>NRR</th>
              </tr>
            </thead>
            <tbody>
              {(wildcard?.standings || []).map((s: TeamStanding) => {
                const isQualifier = s.pos === 1 && (wildcard?.matches?.filter((m: any) => m.status === 'COMPLETED').length === 3);

                return (
                  <tr
                    key={s.teamId}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: isQualifier ? 'rgba(255, 184, 0, 0.1)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '6px 2px', fontWeight: 800, color: isQualifier ? '#FFB800' : 'rgba(255,255,255,0.4)' }}>
                      {s.pos}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#FFF' }}>{s.teamShortName}</span>
                        {isQualifier && <span style={{ color: '#FFB800', fontSize: '0.65rem' }}>👑</span>}
                      </div>
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-data)' }}>
                      {s.played}
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center', fontWeight: 900, color: '#FFF', fontFamily: 'var(--font-data)' }}>
                      {s.points}
                    </td>
                    <td
                      style={{
                        padding: '6px 2px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-data)',
                        fontWeight: 800,
                        color: s.nrr > 0 ? '#10B981' : s.nrr < 0 ? '#EF4444' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {s.displayNRR}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.68rem', color: '#FFB800', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🏆</span>
            <span>Winner claims Seed #4 → Eliminator (#14)</span>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. MOBILE UPCOMING FIXTURES                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="fixtures-mobile" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#FFB800' }}>
              Schedule
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
              Upcoming Fixtures
            </h2>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
            {upcomingMatchesList.length} Remaining
          </span>
        </div>

        {upcomingMatchesList.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            All tournament matches have concluded.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingMatchesList.slice(0, 5).map((m: any) => (
              <div
                key={m.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                    Match #{m.matchNumber} · {m.stage}
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>
                    {m.teamA?.name || 'TBD'} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>vs</span> {m.teamB?.name || 'TBD'}
                  </div>
                </div>

                <Link
                  href={`/scorecard?matchId=${m.id}`}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFB800',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    minHeight: '36px',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8. MOBILE RECENT RESULTS                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="results-mobile" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-accent, #C0272D)' }}>
              Completed
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
              Recent Results
            </h2>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
            {completedMatchesList.length} Completed
          </span>
        </div>

        {completedMatchesList.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            No matches completed yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedMatchesList.slice(0, 4).map((m: any) => {
              const scoreA = getTeamScore(m, m.teamAId);
              const scoreB = getTeamScore(m, m.teamBId);
              const winner = m.winnerTeamId === m.teamAId ? m.teamA : m.winnerTeamId === m.teamBId ? m.teamB : null;

              return (
                <div
                  key={m.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                    <span>Match #{m.matchNumber} · {m.stage}</span>
                    <span>{m.venue || 'Ratmalana Ground'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontWeight: m.winnerTeamId === m.teamAId ? 900 : 600, color: m.winnerTeamId === m.teamAId ? '#FFB800' : '#FFF', fontSize: '0.84rem' }}>
                      {m.teamA?.shortName || m.teamA?.name} {m.winnerTeamId === m.teamAId ? '🏆' : ''}
                    </span>
                    <span style={{ fontFamily: 'var(--font-data)', fontWeight: 800, fontSize: '0.84rem', color: '#FFF' }}>
                      {scoreA ? `${scoreA.runs}/${scoreA.wickets}` : '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: m.winnerTeamId === m.teamBId ? 900 : 600, color: m.winnerTeamId === m.teamBId ? '#FFB800' : '#FFF', fontSize: '0.84rem' }}>
                      {m.teamB?.shortName || m.teamB?.name} {m.winnerTeamId === m.teamBId ? '🏆' : ''}
                    </span>
                    <span style={{ fontFamily: 'var(--font-data)', fontWeight: 800, fontSize: '0.84rem', color: '#FFF' }}>
                      {scoreB ? `${scoreB.runs}/${scoreB.wickets}` : '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>
                      {winner ? `✓ ${winner.shortName || winner.name} won` : 'Match Completed'}
                    </span>
                    <Link
                      href={`/scorecard?matchId=${m.id}`}
                      style={{
                        fontSize: '0.68rem',
                        color: '#FFB800',
                        textDecoration: 'none',
                        fontWeight: 700,
                        minHeight: '36px',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      Scorecard →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 9. MOBILE TOURNAMENT STATISTICS                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#FFB800' }}>
              Insights
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFF', margin: 0 }}>
              Tournament Stats
            </h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Matches Played
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.2rem', fontWeight: 900, color: '#FFF' }}>
              {progress.completedMatches} / {progress.totalMatches}
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Remaining
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1.2rem', fontWeight: 900, color: '#FFB800' }}>
              {progress.totalMatches - progress.completedMatches}
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>
              High Score
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1rem', fontWeight: 900, color: '#10B981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {highestScoreText}
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Top NRR
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '1rem', fontWeight: 900, color: '#3B82F6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {highestNRRTeam}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 10. MOBILE COLLAPSIBLE TOURNAMENT RULES & FORMAT              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '28px' }}>
        <details
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 14px',
          }}
        >
          <summary
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '44px',
              outline: 'none',
              listStyle: 'none',
            }}
          >
            <span>📜 TOURNAMENT RULES & FORMAT</span>
            <span style={{ fontSize: '0.8rem', color: '#FFB800' }}>▼</span>
          </summary>

          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px' }}>
              <strong style={{ color: '#FFF' }}>1. Format Structure:</strong> 3 Groups of 3 teams (9 matches) → Wildcard Mini-League (3 matches) → Final Four Playoffs (4 matches) = 16 total matches.
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong style={{ color: '#FFF' }}>2. Match Settings:</strong> {oversPerInnings} overs per innings with {ballsPerOver} balls per over.
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong style={{ color: '#FFF' }}>3. Ball-Based NRR:</strong> Calculated using actual legal balls bowled (e.g. 5 balls bowled in a 4-ball over = 1.25 effective overs).
            </p>
            <p style={{ margin: '0 0 8px' }}>
              <strong style={{ color: '#FFF' }}>4. All-Out Rule:</strong> If a team is bowled all-out, the full allotted {oversPerInnings} overs are charged against them for NRR calculation.
            </p>
            <p style={{ margin: '0' }}>
              <strong style={{ color: '#FFF' }}>5. Stage Isolation:</strong> Group Stage NRR and Wildcard Mini-League NRR are strictly isolated and calculated independently.
            </p>
          </div>
        </details>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 11. STICKY LIVE BOTTOM PILL (ONLY WHEN MATCH IS LIVE)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {liveMatch && !stickyDismissed && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '12px',
            right: '12px',
            maxWidth: '440px',
            margin: '0 auto',
            zIndex: 99,
            borderRadius: '9999px',
            background: 'rgba(15, 12, 12, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(192, 39, 45, 0.6)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#EF4444',
                animation: 'pulse 1.2s infinite',
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {liveMatch.teamA?.shortName || 'A'} vs {liveMatch.teamB?.shortName || 'B'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <Link
              href={`/scorecard?matchId=${liveMatch.id}`}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'var(--color-accent, #C0272D)',
                color: '#FFF',
                fontSize: '0.74rem',
                fontWeight: 800,
                textDecoration: 'none',
                minHeight: '36px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Watch →
            </Link>

            <button
              onClick={() => setStickyDismissed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Dismiss sticky live score"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
