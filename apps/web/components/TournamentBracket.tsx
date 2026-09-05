'use client';

import Link from 'next/link';
import { tournamentConfig } from '@/config/tournament';

export default function TournamentBracket() {
  const quarterFinals = [
    { id: 'QF1', title: 'Quarter-Final 01', time: '08:30 AM', pitch: 'Pitch 01' },
    { id: 'QF2', title: 'Quarter-Final 02', time: '09:45 AM', pitch: 'Pitch 02' },
    { id: 'QF3', title: 'Quarter-Final 03', time: '11:00 AM', pitch: 'Pitch 01' },
    { id: 'QF4', title: 'Quarter-Final 04', time: '12:15 PM', pitch: 'Pitch 02' },
  ];

  const semiFinals = [
    { id: 'SF1', title: 'Semi-Final 01', time: '02:00 PM', match: 'Winner QF1 vs Winner QF2' },
    { id: 'SF2', title: 'Semi-Final 02', time: '03:15 PM', match: 'Winner QF3 vs Winner QF4' },
  ];

  return (
    <section
      id="fixtures"
      style={{
        padding: 'clamp(60px, 8vw, 100px) var(--space-md)',
        background: 'var(--color-paper)',
        borderTop: '1px solid var(--color-border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section Header (Hallmark Sport Red & White Style) */}
        <div style={{ marginBottom: 'clamp(32px, 5vw, 48px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '12px', height: '2px', background: 'var(--color-accent)', display: 'inline-block' }} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 700,
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
                  fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: 'var(--color-ink)',
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                Tournament <span style={{ color: 'var(--color-accent)' }}>Bracket</span> & Fixtures
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.95rem',
                  color: 'var(--color-ink-muted)',
                  marginTop: '8px',
                  marginBottom: 0,
                  maxWidth: '620px',
                }}
              >
                Knockout elimination tree and match roadmap for {tournamentConfig.name} at Ratmalana CGR Ground.
              </p>
            </div>

            {/* Stage Status Badge */}
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
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--color-accent)',
                }}
              />
              <span>Registration Closed · Draw Underway</span>
            </div>
          </div>
        </div>

        {/* Outer Container with Stylized Stadium Glass Overlay */}
        <div
          className="bracket-container"
          style={{
            position: 'relative',
            background: 'var(--color-paper-card)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(24px, 4vw, 40px)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* ========================================================================= */}
          {/* SKELETON BRACKET TREE (SUBTLE BACKGROUND PREVIEW)                          */}
          {/* ========================================================================= */}
          <div
            className="bracket-skeleton hidden md:block"
            style={{
              filter: 'blur(3px)',
              opacity: 0.55,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div
              className="bracket-grid"
              style={{
                display: 'grid',
                gap: '24px',
                alignItems: 'center',
              }}
            >
              {/* Column 1: Stage 1 Groups */}
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '12px', letterSpacing: '0.06em' }}>
                  Stage 1 · Groups A, B, C (M1–M9)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {['Group A (3 Teams)', 'Group B (3 Teams)', 'Group C (3 Teams)'].map((grp, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--color-paper-alt)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-ink)' }}>{grp}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                        Top 1 → Final Four · 2nd → Wildcard
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Stage 2 Wildcard */}
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: '#D97706', marginBottom: '12px', letterSpacing: '0.06em' }}>
                  Stage 2 · Wildcard (M10–M12)
                </div>
                <div style={{ background: 'var(--color-paper-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '4px' }}>
                    3 Group Runners-Up
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                    Single Round-Robin (3 matches). Winner advances as <strong>Seed #4</strong> into Final Four.
                  </div>
                </div>
              </div>

              {/* Column 3: Stage 3 Final Four */}
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '12px', letterSpacing: '0.06em' }}>
                  Stage 3 · Final Four (M13–M15)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ background: 'var(--color-paper-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>Q1 (M13)</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Seed #1 vs Seed #2</div>
                  </div>
                  <div style={{ background: 'var(--color-paper-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626' }}>ELIM (M14)</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Seed #3 vs Seed #4 [Wildcard]</div>
                  </div>
                  <div style={{ background: 'var(--color-paper-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>Q2 (M15)</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Loser Q1 vs Winner Elim</div>
                  </div>
                </div>
              </div>

              {/* Column 4: The Grand Final */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gold)', marginBottom: '12px', letterSpacing: '0.06em' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
                    <path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" />
                  </svg>
                  <span>Grand Final (M16)</span>
                </div>
                <div
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent-soft) 0%, var(--color-paper-card) 100%)',
                    border: '2px solid var(--color-accent)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px 16px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ width: '36px', height: '36px', margin: '0 auto 6px', borderRadius: '50%', background: 'var(--color-accent)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🏆
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-ink)' }}>
                    CPL 2026 Final
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                    Winner Q1 vs Winner Q2
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HALLMARK TEASER OVERLAY & CTA CARD                                        */}
          {/* ========================================================================= */}
          <div
            className="bracket-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(10px, 3vw, 24px)',
              background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.94) 20%, rgba(248, 249, 250, 0.98) 100%)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <div
              className="bracket-notice-card"
              style={{
                width: '100%',
                maxWidth: '540px',
                textAlign: 'center',
                background: 'var(--color-paper-card)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(20px, 4.5vw, 36px) clamp(16px, 4vw, 32px)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(192, 39, 45, 0.12)',
              }}
            >
              {/* Seal Icon */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--color-accent-soft)',
                  border: '1.5px solid var(--color-accent)',
                  color: 'var(--color-accent)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '10px', height: '2px', background: 'var(--color-accent)', display: 'inline-block' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent)',
                  }}
                >
                  Live Draw Coming Soon
                </span>
                <span style={{ width: '10px', height: '2px', background: 'var(--color-accent)', display: 'inline-block' }} />
              </div>

              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.4rem, 4.5vw, 2.2rem)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                  color: 'var(--color-ink)',
                  margin: '0 0 8px 0',
                  lineHeight: 1.15,
                }}
              >
                Fixture Pairings & Pitch Allocations
              </h3>

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.86rem',
                  color: 'var(--color-ink-muted)',
                  lineHeight: 1.5,
                  margin: '0 0 18px 0',
                }}
              >
                Team registrations are officially closed and squad rosters have been locked. The knockout bracket and pitch pairings will be announced here once the tournament draw concludes.
              </p>

              {/* Action Buttons */}
              <div className="bracket-overlay-cta-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <Link
                  href="/tournament"
                  style={{
                    height: '42px',
                    padding: '0 20px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'var(--color-accent)',
                    color: '#FFF',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(192, 39, 45, 0.3)',
                    transition: 'all var(--dur-fast)',
                  }}
                >
                  <span>🏆 Open Full Tournament Hub & Standings</span>
                </Link>

                <a
                  href="#details"
                  style={{
                    height: '42px',
                    padding: '0 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-paper-alt)',
                    color: 'var(--color-ink)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition: 'all var(--dur-fast)',
                  }}
                >
                  <span>View Guidelines</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
