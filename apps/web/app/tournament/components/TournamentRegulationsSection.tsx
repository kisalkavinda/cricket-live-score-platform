'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../tournament.module.css';

export default function TournamentRegulationsSection() {
  const [showRulesBreakdown, setShowRulesBreakdown] = useState<boolean>(false);

  const rules = [
    {
      id: 1,
      title: 'Bowling Limits',
      tag: 'ALLOCATION',
      desc: 'Maximum 1 over per bowler per match. Bowling changes must be reported to the central scoring table.',
    },
    {
      id: 2,
      title: 'No-Ball Policy',
      tag: 'PENALTY',
      desc: 'Any delivery above chest height. Grants +1 extra run and a re-ball. No Free Hit awarded following a No-Ball. Illegal throwing/chucking actions strictly prohibited.',
    },
    {
      id: 3,
      title: 'Wide Ball Rule',
      tag: 'PENALTY',
      desc: "Deliveries outside the batter's reasonable hitting reach are penalized with +1 extra run and an additional delivery.",
    },
    {
      id: 4,
      title: 'Boundary Field Restrictions',
      tag: 'FIELDING',
      desc: 'Maximum 3 fielders permitted on the leg side; maximum 2 fielders permitted on the off side at delivery release.',
    },
    {
      id: 5,
      title: 'Official Umpire Authority',
      tag: 'GOVERNANCE',
      desc: "The field umpire's adjudication is final and binding. Overs and balls per over may be recalibrated by match referees depending on weather or light.",
    },
    {
      id: 6,
      title: 'Points & NRR Tiebreakers',
      tag: 'COMPETITION',
      desc: 'Win = 2 points, Tie = 1 point, Loss = 0 points. Ties in standing positions are resolved via ball-based Softball Net Run Rate (NRR).',
    },
    {
      id: 7,
      title: 'Committee Provisions',
      tag: 'LOGISTICS',
      desc: 'Official tournament committee provides T4 match balls, player hydration, meal arrangements, and post-tournament ceremonies.',
    },
    {
      id: 8,
      title: 'Honours & Awards',
      tag: 'CEREMONY',
      desc: 'Championship Trophy, Runners-Up Trophy, Best Batter (Most Runs), Best Bowler (Most Wickets), and Player of the Final.',
    },
  ];

  return (
    <section id="rules" style={{ marginBottom: '40px', scrollMarginTop: '90px' }}>
      <div className={styles.cyberPanel} style={{ padding: '18px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ width: '8px', height: '2px', background: 'var(--color-accent, #C0272D)' }} />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--color-accent, #C0272D)' }}>
                Official Tournament Bylaws
              </span>
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#FFFFFF',
                margin: 0,
              }}
            >
              Match Regulations & <span style={{ color: '#FFB800' }}>NRR Engine</span>
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              href="/rules"
              style={{
                background: 'rgba(255, 184, 0, 0.12)',
                border: '1px solid rgba(255, 184, 0, 0.35)',
                borderRadius: '8px',
                color: '#FFB800',
                padding: '6px 14px',
                fontFamily: 'var(--font-data)',
                fontSize: '0.74rem',
                fontWeight: 800,
                textDecoration: 'none',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Full Rules Manual →
            </Link>

            <button
              onClick={() => setShowRulesBreakdown(!showRulesBreakdown)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#FFFFFF',
                padding: '6px 14px',
                fontFamily: 'var(--font-data)',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                transition: 'all 0.15s ease',
              }}
            >
              {showRulesBreakdown ? 'Collapse Regulations' : 'Expand 8 Tournament Rules'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.65)', margin: '0 0 16px', lineHeight: 1.45, maxWidth: '780px' }}>
          Official regulations governing softball delivery specifications, bowling limits, boundary field caps, and precise ball-based Net Run Rate (NRR) computation for CPL 2026.
        </p>

        {/* NRR Formula Quick-Reference Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
              Ball-Based Softball NRR Calculation
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 700 }}>
              NRR = (Total Runs Scored / Legal Balls Faced) − (Total Runs Conceded / Legal Balls Bowled)
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-data)' }}>
            All-out innings credited as full 16 legal balls.
          </span>
        </div>

        {/* Expandable 8 Rules Grid */}
        {showRulesBreakdown && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.08]">
            {rules.map((r) => (
              <div
                key={r.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#FFFFFF' }}>
                    {r.id}. {r.title}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 184, 0, 0.12)',
                      color: '#FFB800',
                    }}
                  >
                    {r.tag}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.65)', margin: 0, lineHeight: 1.4 }}>
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
