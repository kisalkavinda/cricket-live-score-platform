'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../tournament.module.css';

interface FixturesAndResultsSectionProps {
  completedMatchesList: any[];
  upcomingMatchesList: any[];
}

export default function FixturesAndResultsSection({
  completedMatchesList,
  upcomingMatchesList,
}: FixturesAndResultsSectionProps) {
  const [filter, setFilter] = useState<'ALL' | 'RESULTS' | 'UPCOMING'>('ALL');

  const showResults = filter === 'ALL' || filter === 'RESULTS';
  const showUpcoming = filter === 'ALL' || filter === 'UPCOMING';

  return (
    <section id="fixtures" style={{ marginBottom: '56px', scrollMarginTop: '90px' }}>
      {/* Header & Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ width: '8px', height: '2px', background: 'var(--color-accent, #C0272D)' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--color-accent, #C0272D)' }}>
              Match Center Database
            </span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              margin: 0,
            }}
          >
            Schedule & <span style={{ color: 'var(--color-accent, #C0272D)' }}>Results</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.6)', margin: '4px 0 0' }}>
            15 total competition fixtures across group stages, playoff qualification, and finals.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 rounded-lg bg-white/[0.03] border border-white/[0.08] scrollbar-none">
          {[
            { key: 'ALL', label: 'All Fixtures' },
            { key: 'RESULTS', label: `Results (${completedMatchesList.length})` },
            { key: 'UPCOMING', label: `Upcoming (${upcomingMatchesList.length})` },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key as any)}
              style={{
                background: filter === btn.key ? 'var(--color-accent, #C0272D)' : 'transparent',
                color: filter === btn.key ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontFamily: 'var(--font-data)',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dual Panel Grid */}
      <div className={`grid ${filter === 'ALL' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-5`}>
        {/* Recent Results Panel */}
        {showResults && (
          <div className={styles.cyberPanel} style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFFFFF', margin: 0 }}>
                  Recent Completed Results
                </h3>
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 700 }}>
                {completedMatchesList.length} COMPLETED
              </span>
            </div>

            {completedMatchesList.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}>
                No matches completed yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {completedMatchesList.slice(0, 6).map((m: any) => {
                  const teamAInn = m.innings?.find((i: any) => i.battingTeamId === m.teamA?.id && !i.isSuperOver);
                  const teamBInn = m.innings?.find((i: any) => i.battingTeamId === m.teamB?.id && !i.isSuperOver);
                  const teamAWon = m.winnerTeamId === m.teamA?.id;
                  const teamBWon = m.winnerTeamId === m.teamB?.id;

                  return (
                    <div
                      key={m.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'var(--font-data)', marginBottom: '8px' }}>
                        <span>MATCH #{m.matchNumber} · {m.stage}</span>
                        <span>{m.venue || 'Ratmalana Ground'}</span>
                      </div>

                      {/* Team A */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: teamAWon ? 900 : 500, color: teamAWon ? '#FFB800' : '#FFFFFF', fontSize: '0.88rem' }}>
                          {m.teamA?.name} {teamAWon && '✓'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-data)', fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF' }}>
                          {teamAInn ? `${teamAInn.runs}/${teamAInn.wickets}` : '—'}
                        </span>
                      </div>

                      {/* Team B */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: teamBWon ? 900 : 500, color: teamBWon ? '#FFB800' : '#FFFFFF', fontSize: '0.88rem' }}>
                          {m.teamB?.name} {teamBWon && '✓'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-data)', fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF' }}>
                          {teamBInn ? `${teamBInn.runs}/${teamBInn.wickets}` : '—'}
                        </span>
                      </div>

                      {/* Result Note */}
                      {m.resultNote && (
                        <div style={{ fontSize: '0.74rem', color: '#38BDF8', fontWeight: 700, fontFamily: 'var(--font-data)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '4px' }}>
                          {m.resultNote}
                        </div>
                      )}

                      <Link
                        href={`/scorecard?matchId=${m.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-data)',
                          color: '#FFB800',
                          fontWeight: 800,
                          marginTop: '6px',
                          textDecoration: 'none',
                        }}
                      >
                        <span>FULL SCORECARD & STATS</span>
                        <span>→</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Fixtures Panel */}
        {showUpcoming && (
          <div className={styles.cyberPanel} style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFB800' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFFFFF', margin: 0 }}>
                  Upcoming Match Schedule
                </h3>
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 700 }}>
                {upcomingMatchesList.length} SCHEDULED
              </span>
            </div>

            {upcomingMatchesList.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}>
                All scheduled fixtures have concluded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {upcomingMatchesList.slice(0, 6).map((m: any) => (
                  <div
                    key={m.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'var(--font-data)', marginBottom: '8px' }}>
                      <span>MATCH #{m.matchNumber} · {m.stage}</span>
                      <span>{m.venue || 'Ratmalana Ground'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.9rem' }}>
                        {m.teamA?.name || 'TBD'} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>vs</span> {m.teamB?.name || 'TBD'}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255, 184, 0, 0.12)',
                          color: '#FFB800',
                          textTransform: 'uppercase',
                        }}
                      >
                        SCHEDULED
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.45)', fontFamily: 'var(--font-data)', marginTop: '6px' }}>
                      SPEC: {m.oversPerInnings || 4} OV · {m.ballsPerOver || 4} BALLS/OV
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
