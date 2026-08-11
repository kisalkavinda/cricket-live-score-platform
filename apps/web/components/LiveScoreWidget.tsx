'use client';

import { useState } from 'react';
import Link from 'next/link';

interface MatchScore {
  id: string;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED';
  matchName: string;
  stage: string;
  team1: { name: string; shortName: string; flag: string; score: string; overs: string };
  team2: { name: string; shortName: string; flag: string; score: string; overs: string };
  statusNote: string;
  target?: string;
  crr?: string;
  rrr?: string;
  currentBatters?: { name: string; runs: number; balls: number; fours: number; sixes: number; isStriker: boolean }[];
  currentBowler?: { name: string; overs: string; maidens: number; runs: number; wickets: number };
  recentBalls?: string[];
}

const mockMatches: MatchScore[] = [
  {
    id: 'match-1',
    status: 'LIVE',
    matchName: 'Match 05 — Group Stage',
    stage: 'Innings 2',
    team1: { name: 'Colombo Lions', shortName: 'LIONS', flag: '🦁', score: '178/6', overs: '20.0' },
    team2: { name: 'Kandy Tigers', shortName: 'TIGERS', flag: '🐯', score: '154/4', overs: '17.2' },
    statusNote: 'Kandy Tigers need 25 runs in 16 balls to win',
    target: 'Target: 179',
    crr: '8.88',
    rrr: '9.38',
    currentBatters: [
      { name: 'K. Perera', runs: 58, balls: 34, fours: 6, sixes: 3, isStriker: true },
      { name: 'D. Shanaka', runs: 24, balls: 14, fours: 2, sixes: 1, isStriker: false },
    ],
    currentBowler: { name: 'M. Pathirana', overs: '3.2', maidens: 0, runs: 28, wickets: 2 },
    recentBalls: ['4', '1', 'W', '6', '1', '2'],
  },
  {
    id: 'match-2',
    status: 'UPCOMING',
    matchName: 'Match 06 — Group Stage',
    stage: 'Starts at 7:30 PM',
    team1: { name: 'Galle Eagles', shortName: 'EAGLES', flag: '🦅', score: '—', overs: '—' },
    team2: { name: 'Jaffna Kings', shortName: 'KINGS', flag: '👑', score: '—', overs: '—' },
    statusNote: 'Toss at 7:00 PM • Mahinda Rajapaksa Stadium',
  },
];

export default function LiveScoreWidget() {
  const [activeMatchId, setActiveMatchId] = useState<string>(mockMatches[0].id);

  const currentMatch = mockMatches.find((m) => m.id === activeMatchId) || mockMatches[0];

  return (
    <div
      id="live-scores"
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--space-md) var(--space-md)',
      }}
    >
      {/* Container Card */}
      <div
        style={{
          background: 'var(--color-paper-dark)',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--color-border-dark)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          color: 'var(--color-paper)',
        }}
      >
        {/* Match Header Bar & Selector */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: currentMatch.status === 'LIVE' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
                color: 'var(--color-paper)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
              }}
            >
              {currentMatch.status === 'LIVE' && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'white',
                  }}
                  className="animate-pulse-dot"
                />
              )}
              {currentMatch.status}
            </span>

            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                color: 'var(--color-ink-subtle)',
                fontWeight: 600,
              }}
            >
              {currentMatch.matchName}
            </span>
          </div>

          {/* Match Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%',
            }}
          >
            {mockMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMatchId(m.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: activeMatchId === m.id ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: activeMatchId === m.id ? 'var(--color-paper)' : 'var(--color-ink-subtle)',
                  transition: 'all var(--dur-fast)',
                }}
              >
                {m.team1.shortName} vs {m.team2.shortName} {m.status === 'LIVE' && '🔴'}
              </button>
            ))}
          </div>
        </div>

        {/* Main Live Score Display */}
        <div style={{ padding: 'var(--space-md)' }}>
          {/* Teams & Scoreboard Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--space-md)',
              alignItems: 'center',
              marginBottom: 'var(--space-md)',
            }}
          >
            {/* Team 1 Score Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>{currentMatch.team1.flag}</span>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {currentMatch.team1.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.75rem',
                      color: 'var(--color-ink-subtle)',
                    }}
                  >
                    1st Innings
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: 'var(--color-paper)',
                  }}
                >
                  {currentMatch.team1.score}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.75rem',
                    color: 'var(--color-ink-subtle)',
                  }}
                >
                  ({currentMatch.team1.overs} ov)
                </div>
              </div>
            </div>

            {/* VS Divider badge */}
            <div
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '1rem',
                color: 'var(--color-accent)',
                letterSpacing: '0.1em',
              }}
            >
              VS
            </div>

            {/* Team 2 Score Card */}
            <div
              style={{
                background: currentMatch.status === 'LIVE' ? 'rgba(192, 39, 45, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: currentMatch.status === 'LIVE' ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>{currentMatch.team2.flag}</span>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {currentMatch.team2.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.75rem',
                      color: 'var(--color-ink-subtle)',
                    }}
                  >
                    {currentMatch.stage}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: 'var(--color-paper)',
                  }}
                >
                  {currentMatch.team2.score}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.75rem',
                    color: 'var(--color-accent-bright)',
                    fontWeight: 700,
                  }}
                >
                  ({currentMatch.team2.overs} ov)
                </div>
              </div>
            </div>
          </div>

          {/* Status Banner */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
              marginBottom: 'var(--space-md)',
              borderLeft: '3px solid var(--color-accent)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--color-paper)',
              }}
            >
              📢 {currentMatch.statusNote}
            </span>

            {currentMatch.crr && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.75rem',
                  color: 'var(--color-ink-subtle)',
                }}
              >
                <span>CRR: <strong style={{ color: 'white' }}>{currentMatch.crr}</strong></span>
                {currentMatch.rrr && <span>RRR: <strong style={{ color: 'var(--color-accent-bright)' }}>{currentMatch.rrr}</strong></span>}
              </div>
            )}
          </div>

          {/* Active Batters & Bowler Table (Live Match Only) */}
          {currentMatch.status === 'LIVE' && currentMatch.currentBatters && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-md)',
              }}
            >
              {/* Batters List */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--color-ink-subtle)',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Batter</span>
                  <span>R (B) • 4s • 6s</span>
                </div>

                {currentMatch.currentBatters.map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: idx === 0 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.85rem',
                        fontWeight: b.isStriker ? 700 : 500,
                        color: b.isStriker ? 'var(--color-accent-bright)' : 'var(--color-paper)',
                      }}
                    >
                      {b.name} {b.isStriker && '*'}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--color-paper)',
                      }}
                    >
                      {b.runs} ({b.balls}) • {b.fours} • {b.sixes}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bowler & Recent Over */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--color-ink-subtle)',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Current Bowler</span>
                    <span>Overs • W/R</span>
                  </div>

                  {currentMatch.currentBowler && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: 'var(--color-paper)',
                        }}
                      >
                        {currentMatch.currentBowler.name}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--color-paper)',
                        }}
                      >
                        {currentMatch.currentBowler.overs} ov • {currentMatch.currentBowler.wickets}/{currentMatch.currentBowler.runs}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recent Balls Strip */}
                {currentMatch.recentBalls && (
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--color-ink-subtle)',
                        marginBottom: '6px',
                      }}
                    >
                      Recent Balls:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {currentMatch.recentBalls.map((ball, i) => {
                        const isWicket = ball === 'W';
                        const isBoundary = ball === '4' || ball === '6';
                        return (
                          <span
                            key={i}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'var(--font-data)',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              background: isWicket
                                ? 'var(--color-accent)'
                                : isBoundary
                                ? '#22c55e'
                                : 'rgba(255, 255, 255, 0.12)',
                              color: 'white',
                            }}
                          >
                            {ball}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Link to Full Scorecard Dedicated Page */}
          <div style={{ textAlign: 'center', paddingTop: '10px' }}>
            <Link
              href="/scorecard"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-paper)',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '9999px',
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(192, 39, 45, 0.4)',
                transition: 'all var(--dur-fast)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📊 View Full Detailed Scorecard Page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
