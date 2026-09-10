'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tournamentConfig } from '@/config/tournament';

export default function TournamentBracket() {
  const [activeStageTab, setActiveStageTab] = useState<'all' | 'groups' | 'qualification' | 'playoffs' | 'final'>('all');

  return (
    <section
      id="fixtures"
      style={{
        padding: 'clamp(50px, 7vw, 90px) var(--space-md)',
        background: 'var(--color-paper)',
        borderTop: '1px solid var(--color-border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ marginBottom: 'clamp(28px, 4vw, 40px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '12px', height: '2.5px', background: 'var(--color-accent)', display: 'inline-block', borderRadius: '2px' }} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
              }}
            >
              Championship Roadmap
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: 'var(--color-ink)',
                  margin: 0,
                  lineHeight: 1.05,
                  letterSpacing: '0.02em',
                }}
              >
                Tournament <span style={{ color: 'var(--color-accent)' }}>Bracket</span> & Fixtures
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.92rem',
                  color: 'var(--color-ink-muted)',
                  marginTop: '6px',
                  marginBottom: 0,
                  maxWidth: '640px',
                }}
              >
                Official 8-team, 15-match championship progression across Group Stage, Playoff Qualification, 4-Team Playoffs, and the Grand Final.
              </p>
            </div>

            {/* Quick Actions & Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-accent-soft)',
                  border: '1px solid rgba(192, 39, 45, 0.25)',
                  color: 'var(--color-accent)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    boxShadow: '0 0 6px var(--color-accent)',
                  }}
                />
                <span>8 Teams · 15 Matches · 4 Stages</span>
              </div>

              <Link
                href="/tournament"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-accent)',
                  color: '#FFF',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(192, 39, 45, 0.35)',
                  transition: 'all var(--dur-fast)',
                }}
              >
                <span>🏆 Full Hub & Standings ➔</span>
              </Link>
            </div>
          </div>

          {/* Mobile Filter Tabs */}
          <div
            className="md:hidden flex"
            style={{
              marginTop: '18px',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
            }}
          >
            {[
              { id: 'all', label: 'All Stages' },
              { id: 'groups', label: 'Stage 1: Groups' },
              { id: 'qualification', label: 'Stage 2: Qualifiers' },
              { id: 'playoffs', label: 'Stage 3: Playoffs' },
              { id: 'final', label: 'Stage 4: Final' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStageTab(tab.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: activeStageTab === tab.id ? 'var(--color-accent)' : 'var(--color-paper-alt)',
                  color: activeStageTab === tab.id ? '#FFF' : 'var(--color-ink)',
                  border: activeStageTab === tab.id ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all var(--dur-fast)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outer Container for Bracket Tree */}
        <div
          style={{
            background: 'var(--color-paper-card)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(20px, 3.5vw, 32px)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* 4-Column Responsive Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
              alignItems: 'stretch',
            }}
          >
            {/* ========================================================================= */}
            {/* STAGE 1: GROUP STAGE                                                      */}
            {/* ========================================================================= */}
            {(activeStageTab === 'all' || activeStageTab === 'groups') && (
              <div
                style={{
                  background: 'var(--color-paper-alt)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-accent)', letterSpacing: '0.04em' }}>
                    Stage 1 · Groups
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'var(--color-accent-soft)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: '4px' }}>
                    M1–M8
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                  Round-robin inside 2 groups of 4. Top 3 from each group advance into the qualification paths.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {/* Group A Card */}
                  <div
                    style={{
                      background: 'var(--color-paper-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      borderLeft: '4px solid #EF4444',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-ink)' }}>Group A (4 Teams)</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>4 Matches</span>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: 700 }}>
                        <span>1st Place</span>
                        <span>Direct → Playoff Seed #1</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D97706', fontWeight: 600 }}>
                        <span>2nd Place</span>
                        <span>Advances to M9</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626', fontWeight: 600 }}>
                        <span>3rd Place</span>
                        <span>Advances to M10</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                        <span>4th Place</span>
                        <span>Eliminated</span>
                      </div>
                    </div>
                  </div>

                  {/* Group B Card */}
                  <div
                    style={{
                      background: 'var(--color-paper-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      borderLeft: '4px solid #3B82F6',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-ink)' }}>Group B (4 Teams)</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>4 Matches</span>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: 700 }}>
                        <span>1st Place</span>
                        <span>Direct → Playoff Seed #2</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D97706', fontWeight: 600 }}>
                        <span>2nd Place</span>
                        <span>Advances to M9</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626', fontWeight: 600 }}>
                        <span>3rd Place</span>
                        <span>Advances to M10</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                        <span>4th Place</span>
                        <span>Eliminated</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STAGE 2: PLAYOFF QUALIFICATION                                            */}
            {/* ========================================================================= */}
            {(activeStageTab === 'all' || activeStageTab === 'qualification') && (
              <div
                style={{
                  background: 'var(--color-paper-alt)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: '#D97706', letterSpacing: '0.04em' }}>
                    Stage 2 · Qualification
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(217, 119, 6, 0.15)', color: '#D97706', padding: '2px 8px', borderRadius: '4px' }}>
                    M9–M11
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                  Decides Seeds #3 & #4 for the 4-team playoff bracket with double-chance qualifiers.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {/* Match 09 */}
                  <div
                    style={{
                      background: 'var(--color-paper-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D97706' }}>Match 09 · 2nd vs 2nd</span>
                      <span style={{ fontSize: '0.68rem', background: 'rgba(217, 119, 6, 0.12)', color: '#D97706', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>M9</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-ink)', fontWeight: 600, marginTop: '4px' }}>
                      Group A (2nd) vs Group B (2nd)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 700, marginTop: '4px' }}>
                      Winner ➔ Seed #3 | Loser ➔ M11
                    </div>
                  </div>

                  {/* Match 10 */}
                  <div
                    style={{
                      background: 'var(--color-paper-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#DC2626' }}>Match 10 · 3rd vs 3rd</span>
                      <span style={{ fontSize: '0.68rem', background: 'rgba(220, 38, 38, 0.12)', color: '#DC2626', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>M10</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-ink)', fontWeight: 600, marginTop: '4px' }}>
                      Group A (3rd) vs Group B (3rd)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 700, marginTop: '4px' }}>
                      Winner ➔ M11 | Loser ➔ Eliminated
                    </div>
                  </div>

                  {/* Match 11 */}
                  <div
                    style={{
                      background: 'var(--color-paper-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563EB' }}>Match 11 · Final Qualifier</span>
                      <span style={{ fontSize: '0.68rem', background: 'rgba(37, 99, 235, 0.12)', color: '#2563EB', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>M11</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-ink)', fontWeight: 600, marginTop: '4px' }}>
                      M9 Loser vs M10 Winner
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 700, marginTop: '4px' }}>
                      Winner ➔ Seed #4 | Loser ➔ Eliminated
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STAGE 3: FOUR-TEAM PLAYOFFS                                               */}
            {/* ========================================================================= */}
            {(activeStageTab === 'all' || activeStageTab === 'playoffs') && (
              <div
                style={{
                  background: 'var(--color-paper-alt)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-accent)', letterSpacing: '0.04em' }}>
                    Stage 3 · Playoffs
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'var(--color-accent-soft)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: '4px' }}>
                    M12–M14
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                  IPL-style 4-team playoff format with Qualifier 1, Eliminator, and Qualifier 2.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {/* Match 12 (Qualifier 1) */}
                  <div
                    style={{
                      background: 'var(--color-paper-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-accent)' }}>M12 · Qualifier 1</span>
                      <span style={{ fontSize: '0.68rem', background: 'var(--color-accent-soft)', color: 'var(--color-accent)', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>M12</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-ink)', fontWeight: 600, marginTop: '4px' }}>
                      Seed #1 vs Seed #2
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 700, marginTop: '4px' }}>
                      Winner ➔ Final (M15) | Loser ➔ M14
                    </div>
                  </div>

                  {/* Match 13 (Eliminator) */}
                  <div
                    style={{
                      background: 'var(--color-paper-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#DC2626' }}>M13 · Eliminator</span>
                      <span style={{ fontSize: '0.68rem', background: 'rgba(220, 38, 38, 0.12)', color: '#DC2626', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>M13</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-ink)', fontWeight: 600, marginTop: '4px' }}>
                      Seed #3 vs Seed #4
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 700, marginTop: '4px' }}>
                      Winner ➔ M14 | Loser ➔ Eliminated
                    </div>
                  </div>

                  {/* Match 14 (Qualifier 2) */}
                  <div
                    style={{
                      background: 'var(--color-paper-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-accent)' }}>M14 · Qualifier 2</span>
                      <span style={{ fontSize: '0.68rem', background: 'var(--color-accent-soft)', color: 'var(--color-accent)', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>M14</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-ink)', fontWeight: 600, marginTop: '4px' }}>
                      M12 Loser vs M13 Winner
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 700, marginTop: '4px' }}>
                      Winner ➔ Final (M15) | Loser ➔ Eliminated
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STAGE 4: THE GRAND FINAL                                                  */}
            {/* ========================================================================= */}
            {(activeStageTab === 'all' || activeStageTab === 'final') && (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(254, 242, 242, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)',
                  border: '2px solid var(--color-accent)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'var(--color-accent)', color: '#FFF', padding: '2px 10px', borderRadius: 'var(--radius-pill)', textTransform: 'uppercase' }}>
                    Match 15 · Grand Final
                  </span>
                </div>

                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    margin: '10px auto',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #EF4444, #B91C1C)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  🏆
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: 'var(--color-ink)',
                    margin: '0 0 6px 0',
                    lineHeight: 1.15,
                  }}
                >
                  CPL 2026 Champion
                </h3>

                <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  Winner M12 (Qualifier 1) vs Winner M14 (Qualifier 2)
                </p>

                <div
                  style={{
                    marginTop: 'auto',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px dashed var(--color-accent)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 10px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                    👑 Ratmalana CGR Ground
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                    The ultimate championship showdown
                  </div>
                </div>

                <Link
                  href="/tournament"
                  style={{
                    marginTop: '14px',
                    height: '38px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-accent)',
                    color: '#FFF',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 2px 10px rgba(192, 39, 45, 0.3)',
                    transition: 'all var(--dur-fast)',
                  }}
                >
                  View Live Tournament Hub ➔
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
