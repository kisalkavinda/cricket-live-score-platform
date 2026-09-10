'use client';

import { useState } from 'react';
import styles from '../tournament.module.css';
import { normalizeImageUrl } from '@/lib/utils/image-utils';
import { TeamStanding } from '@/lib/tournament/nrr-engine';

interface GroupStandingsSectionProps {
  groups: {
    groupA: { teams: any[]; standings: TeamStanding[]; matches: any[] };
    groupB: { teams: any[]; standings: TeamStanding[]; matches: any[] };
  };
}

export default function GroupStandingsSection({ groups }: GroupStandingsSectionProps) {
  const [mobileGroupTab, setMobileGroupTab] = useState<'ALL' | 'A' | 'B'>('ALL');

  const renderGroupCard = (gKey: 'groupA' | 'groupB', gTitle: string) => {
    const groupObj = groups[gKey];
    const standings = groupObj?.standings || [];
    const isGroupActive = groupObj?.matches?.some((m: any) => m.status === 'LIVE');
    const completedCount = groupObj?.matches?.filter((m: any) => m.status === 'COMPLETED').length || 0;
    const totalMatches = 4;
    const isGroupDone = completedCount >= totalMatches;

    return (
      <div className={styles.cyberPanel} style={{ padding: '16px 14px' }}>
        {/* Group Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                fontWeight: 900,
                color: '#FFFFFF',
                textTransform: 'uppercase',
                margin: 0,
                letterSpacing: '0.02em',
              }}
            >
              {gTitle}
            </h3>
            {isGroupActive && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#EF4444',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-data)',
                  fontWeight: 900,
                }}
              >
                <span className={styles.beaconDot} style={{ width: '6px', height: '6px' }} />
                <span>LIVE IN PLAY</span>
              </span>
            )}
          </div>

          <span
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: '0.74rem',
              color: 'rgba(255, 255, 255, 0.45)',
              fontWeight: 700,
            }}
          >
            {completedCount}/{totalMatches} FIXTURES COMPLETED
          </span>
        </div>

        {/* Table Content */}
        {standings.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}>
            Standings will compute automatically once stage matches commence.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.66rem',
                    fontFamily: 'var(--font-data)',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '8px 4px', width: '26px' }}>POS</th>
                  <th style={{ padding: '8px 6px' }}>TEAM</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', width: '28px' }}>P</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', width: '34px', color: '#FFB800' }}>PTS</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', width: '56px' }}>NRR</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', width: '80px' }}>
                    {isGroupDone ? 'STATUS' : 'ROADMAP'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, idx) => {
                  const is1st = idx === 0;
                  const is2nd = idx === 1;
                  const is3rd = idx === 2;
                  const is4th = idx === 3;
                  const posColor = is1st ? '#10B981' : is2nd ? '#F59E0B' : is3rd ? '#FB923C' : '#EF4444';
                  const logoUrl = s.logoUrl ? normalizeImageUrl(s.logoUrl) : null;

                  return (
                    <tr key={s.teamId} className={styles.tableRow}>
                      {/* Position */}
                      <td style={{ padding: '10px 4px', fontWeight: 900, fontFamily: 'var(--font-data)' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '18px',
                            height: '18px',
                            lineHeight: '18px',
                            textAlign: 'center',
                            borderRadius: '4px',
                            background: is1st ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: posColor,
                            fontSize: '0.68rem',
                          }}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Team Info */}
                      <td style={{ padding: '10px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={s.teamName}
                              referrerPolicy="no-referrer"
                              style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.62rem',
                                fontWeight: 900,
                                color: 'rgba(255,255,255,0.7)',
                                flexShrink: 0,
                              }}
                            >
                              {s.teamShortName?.[0] || 'T'}
                            </div>
                          )}
                          <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                            {s.teamName}
                          </span>
                        </div>
                      </td>

                      {/* Matches Played */}
                      <td style={{ padding: '10px 4px', textAlign: 'center', fontFamily: 'var(--font-data)', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.78rem' }}>
                        {s.played}
                      </td>

                      {/* Points */}
                      <td style={{ padding: '10px 4px', textAlign: 'center', fontFamily: 'var(--font-data)', fontWeight: 900, fontSize: '0.88rem', color: '#FFB800' }}>
                        {s.points}
                      </td>

                      {/* NRR */}
                      <td
                        style={{
                          padding: '10px 6px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-data)',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          color: s.nrr >= 0 ? '#10B981' : '#EF4444',
                        }}
                      >
                        {s.displayNRR}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.64rem',
                            fontFamily: 'var(--font-data)',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isGroupDone
                              ? is1st
                                ? 'rgba(16, 185, 129, 0.15)'
                                : is2nd
                                ? 'rgba(245, 158, 11, 0.15)'
                                : is3rd
                                ? 'rgba(251, 146, 60, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: `1px solid ${
                              isGroupDone
                                ? is1st
                                  ? 'rgba(16, 185, 129, 0.35)'
                                  : is2nd
                                  ? 'rgba(245, 158, 11, 0.35)'
                                  : is3rd
                                  ? 'rgba(251, 146, 60, 0.35)'
                                  : 'rgba(239, 68, 68, 0.35)'
                                : 'rgba(255, 255, 255, 0.08)'
                            }`,
                            color: isGroupDone ? posColor : 'rgba(255, 255, 255, 0.65)',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isGroupDone
                            ? is1st
                              ? '✓ PLAYOFF'
                              : is2nd
                              ? '→ MATCH 9'
                              : is3rd
                              ? '→ MATCH 10'
                              : '✕ ELIMINATED'
                            : is1st
                            ? '1ST (PLAYOFF)'
                            : is2nd
                            ? '2ND (M9)'
                            : is3rd
                            ? '3RD (M10)'
                            : '4TH (OUT)'}
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
  };

  return (
    <section id="groups" style={{ marginBottom: '56px', scrollMarginTop: '90px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ width: '8px', height: '2px', background: 'var(--color-accent, #C0272D)' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--color-accent, #C0272D)' }}>
              Stage 1 · 8 Teams · 2 Groups
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
              letterSpacing: '-0.01em',
            }}
          >
            Group Stage <span style={{ color: 'var(--color-accent, #C0272D)' }}>Standings</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.6)', margin: '4px 0 0', maxWidth: '680px' }}>
            1st place advances directly to Four-Team Playoff. 2nd enters Match 9. 3rd enters Match 10. 4th eliminated.
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.72rem', fontFamily: 'var(--font-data)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Playoff Direct</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Stage 2 (M9/M10)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Eliminated</span>
          </div>
        </div>
      </div>

      {/* Mobile Group Filter Tabs (< 768px) */}
      <div className="flex md:hidden items-center gap-2 mb-3">
        {[
          { key: 'ALL', label: 'All Groups' },
          { key: 'A', label: 'Group A' },
          { key: 'B', label: 'Group B' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileGroupTab(tab.key as any)}
            className={`${styles.mobileTabPill} ${mobileGroupTab === tab.key ? styles.mobileTabPillActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dual Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(mobileGroupTab === 'ALL' || mobileGroupTab === 'A') && renderGroupCard('groupA', 'Group A')}
        {(mobileGroupTab === 'ALL' || mobileGroupTab === 'B') && renderGroupCard('groupB', 'Group B')}
      </div>
    </section>
  );
}
