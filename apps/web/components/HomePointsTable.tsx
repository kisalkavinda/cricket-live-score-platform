'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface StandingRow {
  pos?: number;
  rank?: number;
  teamId: string;
  teamName: string;
  teamShortName?: string;
  name?: string;
  shortName?: string;
  logoUrl?: string | null;
  teamLogoUrl?: string | null;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  runsFor: number;
  oversFor: number;
  displayOversFor?: string;
  runsAgainst: number;
  oversAgainst: number;
  displayOversAgainst?: string;
  nrr: number;
  displayNRR: string;
  qualificationStatus?: string;
}

export default function HomePointsTable() {
  const [activeGroup, setActiveGroup] = useState<'A' | 'B'>('A');
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStandings = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournament/stats?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.overview) {
        setOverview(data.overview);
      }
    } catch (err) {
      console.error('[HomePointsTable] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings();
    const interval = setInterval(fetchStandings, 15000);
    return () => clearInterval(interval);
  }, [fetchStandings]);

  const groupData = activeGroup === 'A' ? overview?.groups?.groupA : overview?.groups?.groupB;
  const standings: StandingRow[] = groupData?.standings || [];
  const format = overview?.normalizedFormat || overview?.tournamentFormat || '6_TEAM';

  // Format-aware qualification descriptions
  const getQualificationRules = () => {
    if (format === '6_TEAM') {
      return {
        first: '1st Place → Direct to Playoffs (P1)',
        second: '2nd Place → Wildcard 1 (WC1: A2 vs B2)',
        third: '3rd Place → Wildcard 2 (WC2: B3 vs A3)',
        fourth: null,
      };
    }
    if (format === '7_TEAM') {
      return {
        first: '1st Place → Direct to Playoffs (P1)',
        second: '2nd Place → Direct to Playoffs (P2)',
        third: '3rd Place → Eliminated',
        fourth: activeGroup === 'A' ? '4th Place → Eliminated' : null,
      };
    }
    // 8_TEAM default
    return {
      first: '1st Place → Direct to Playoffs (Seed #1/#2)',
      second: '2nd Place → Playoff Qualifier M9 (2nd vs 2nd)',
      third: '3rd Place → Playoff Qualifier M10 (3rd vs 3rd)',
      fourth: '4th Place → Eliminated',
    };
  };

  const qualRules = getQualificationRules();

  const getStatusBadge = (idx: number) => {
    if (format === '6_TEAM') {
      if (idx === 0) return { label: 'PLAYOFF (P1)', bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', color: '#34D399' };
      if (idx === 1) return { label: 'WILDCARD 1', bg: 'rgba(59, 130, 246, 0.2)', border: '#3B82F6', color: '#60A5FA' };
      if (idx === 2) return { label: 'WILDCARD 2', bg: 'rgba(245, 158, 11, 0.2)', border: '#F59E0B', color: '#FBBF24' };
      return { label: 'ELIMINATED', bg: 'rgba(239, 68, 68, 0.2)', border: '#EF4444', color: '#F87171' };
    }
    if (format === '7_TEAM') {
      if (idx === 0) return { label: 'PLAYOFF (P1)', bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', color: '#34D399' };
      if (idx === 1) return { label: 'PLAYOFF (P2)', bg: 'rgba(59, 130, 246, 0.2)', border: '#3B82F6', color: '#60A5FA' };
      return { label: 'ELIMINATED', bg: 'rgba(239, 68, 68, 0.2)', border: '#EF4444', color: '#F87171' };
    }
    // 8_TEAM
    if (idx === 0) return { label: 'PLAYOFF SEED', bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', color: '#34D399' };
    if (idx === 1) return { label: 'MATCH 9 (2nd)', bg: 'rgba(59, 130, 246, 0.2)', border: '#3B82F6', color: '#60A5FA' };
    if (idx === 2) return { label: 'MATCH 10 (3rd)', bg: 'rgba(245, 158, 11, 0.2)', border: '#F59E0B', color: '#FBBF24' };
    return { label: 'ELIMINATED', bg: 'rgba(239, 68, 68, 0.2)', border: '#EF4444', color: '#F87171' };
  };

  return (
    <section
      id="points-table"
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(32px, 5vw, 64px) var(--space-md)',
        position: 'relative',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #13131B 0%, #0D0D12 100%)',
          borderRadius: 'var(--radius-lg, 16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          color: '#F1F5F9',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            padding: 'clamp(18px, 3.5vw, 28px) clamp(16px, 3.5vw, 28px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.74rem',
                fontWeight: 800,
                color: 'var(--color-gold, #FFB800)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '6px',
              }}
            >
              <span>📊</span>
              <span>Official Tournament Standings</span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.4rem, 3.2vw, 2.2rem)',
                fontWeight: 900,
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                letterSpacing: '0.02em',
              }}
            >
              Points Table & <span style={{ color: 'var(--color-gold, #FFB800)' }}>Net Run Rate</span>
            </h2>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.65)',
                maxWidth: '620px',
              }}
            >
              Real-time group stage rankings calculated with official softball ball-by-ball NRR and all-out overs debit rules.
            </p>
          </div>

          {/* Quick Hub Link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href="/tournament"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, rgba(192, 39, 45, 0.95) 0%, rgba(153, 27, 27, 0.95) 100%)',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.82rem',
                textDecoration: 'none',
                letterSpacing: '0.03em',
                boxShadow: '0 4px 16px rgba(192, 39, 45, 0.4)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🏆 Full Tournament Hub</span>
              <span>↗</span>
            </Link>
          </div>
        </div>

        {/* Group Selector Pills */}
        <div
          style={{
            padding: '16px clamp(16px, 3.5vw, 28px) 12px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Segmented Buttons for Group A and Group B */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(0, 0, 0, 0.45)',
              padding: '4px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              gap: '4px',
            }}
          >
            {(['A', 'B'] as const).map((g) => {
              const isSelected = activeGroup === g;
              const count = g === 'A' ? overview?.groups?.groupA?.teams?.length || 3 : overview?.groups?.groupB?.teams?.length || 3;
              return (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '9999px',
                    border: isSelected ? '1.5px solid #FFB800' : '1px solid transparent',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(255, 184, 0, 0.28) 0%, rgba(255, 184, 0, 0.12) 100%)'
                      : 'transparent',
                    color: isSelected ? '#FFD166' : 'rgba(255, 255, 255, 0.8)',
                    fontWeight: 900,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 14px rgba(255, 184, 0, 0.3)' : 'none',
                  }}
                >
                  <span>Group {g}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 7px',
                      borderRadius: '9999px',
                      background: isSelected ? 'rgba(255, 184, 0, 0.3)' : 'rgba(255, 255, 255, 0.12)',
                      color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      fontWeight: 800,
                    }}
                  >
                    {count} Teams
                  </span>
                </button>
              );
            })}
          </div>

          {/* Qualification Summary Tag */}
          <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {qualRules.first && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                <span>{qualRules.first}</span>
              </span>
            )}
            {qualRules.second && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
                <span>{qualRules.second}</span>
              </span>
            )}
          </div>
        </div>

        {/* Standings Content */}
        <div style={{ padding: 'clamp(14px, 3vw, 24px)' }}>
          {loading && !overview ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>🔄</div>
              <div>Synchronizing live points table...</div>
            </div>
          ) : standings.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🏏</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF' }}>
                Group {activeGroup} Fixtures Scheduled
              </div>
              <p style={{ fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.5)', margin: '6px 0 0' }}>
                Points and NRR will calculate automatically as matches complete.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (≥ 680px) */}
              <div className="cpl-desktop-table" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
                  <thead>
                    <tr
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'rgba(255, 255, 255, 0.65)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <th style={{ padding: '12px 16px', width: '50px' }}>POS</th>
                      <th style={{ padding: '12px 16px' }}>TEAM</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', width: '45px' }}>P</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', width: '45px' }}>W</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', width: '45px' }}>L</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', width: '45px' }}>T</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', width: '45px' }}>NR</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', width: '65px', fontWeight: 900, color: '#FFB800' }}>PTS</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>RUNS FOR (OV)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>RUNS AGN (OV)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: '90px', fontWeight: 900, color: '#10B981' }}>NRR</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: '130px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, idx) => {
                      const badge = getStatusBadge(idx);
                      const teamName = s.teamName || s.name || 'Team';
                      const shortName = s.teamShortName || s.shortName || '';
                      const logo = s.logoUrl || s.teamLogoUrl;

                      return (
                        <tr
                          key={s.teamId || idx}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: idx === 0 ? 'rgba(255, 184, 0, 0.03)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '14px 16px', fontWeight: 900, color: idx === 0 ? '#FFB800' : '#FFFFFF' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 800, color: '#FFFFFF' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {logo ? (
                                <img
                                  src={logo}
                                  alt={teamName}
                                  referrerPolicy="no-referrer"
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1.5px solid rgba(255, 255, 255, 0.2)',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.3) 0%, rgba(255, 184, 0, 0.1) 100%)',
                                    border: '1.5px solid rgba(255, 184, 0, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.66rem',
                                    fontWeight: 900,
                                    color: '#FFB800',
                                  }}
                                >
                                  {shortName.slice(0, 2) || teamName.slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <span>{teamName}</span>
                                {shortName && (
                                  <span style={{ marginLeft: '6px', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                                    ({shortName})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 700 }}>{s.played || 0}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 700, color: '#34D399' }}>{s.won || 0}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 700, color: '#F87171' }}>{s.lost || 0}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>{s.tied || 0}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>{s.noResult || 0}</td>
                          <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 900, fontSize: '1rem', color: '#FFB800' }}>
                            {s.points || 0}
                          </td>
                          <td style={{ padding: '14px 14px', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                            {s.runsFor || 0} ({s.displayOversFor || '0.0'})
                          </td>
                          <td style={{ padding: '14px 14px', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                            {s.runsAgainst || 0} ({s.displayOversAgainst || '0.0'})
                          </td>
                          <td
                            style={{
                              padding: '14px 16px',
                              textAlign: 'center',
                              fontWeight: 900,
                              fontFamily: 'var(--font-data, monospace)',
                              color: Number(s.nrr || 0) >= 0 ? '#10B981' : '#EF4444',
                            }}
                          >
                            {Number(s.nrr || 0) > 0 ? `+${s.displayNRR || '0.000'}` : s.displayNRR || '0.000'}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                letterSpacing: '0.04em',
                                background: badge.bg,
                                border: `1px solid ${badge.border}`,
                                color: badge.color,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW (< 680px) */}
              <div className="cpl-mobile-cards" style={{ gap: '10px' }}>
                {standings.map((s, idx) => {
                  const badge = getStatusBadge(idx);
                  const teamName = s.teamName || s.name || 'Team';
                  const shortName = s.teamShortName || s.shortName || '';
                  const logo = s.logoUrl || s.teamLogoUrl;
                  const isPositiveNRR = Number(s.nrr || 0) >= 0;

                  return (
                    <div
                      key={s.teamId || idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: idx === 0 ? '1.5px solid rgba(255, 184, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Top Row: Rank, Logo, Team Name & Status Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: idx === 0 ? '#FFB800' : 'rgba(255, 255, 255, 0.12)',
                              color: idx === 0 ? '#000000' : '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.78rem',
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>
                          {logo ? (
                            <img
                              src={logo}
                              alt={teamName}
                              referrerPolicy="no-referrer"
                              style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'rgba(255, 184, 0, 0.2)',
                                border: '1px solid rgba(255, 184, 0, 0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.68rem',
                                fontWeight: 900,
                                color: '#FFB800',
                                flexShrink: 0,
                              }}
                            >
                              {shortName.slice(0, 2) || teamName.slice(0, 2)}
                            </div>
                          )}
                          <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#FFFFFF' }}>{teamName}</span>
                            {shortName && (
                              <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                                ({shortName})
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Bottom Row: Key Statistics Pill Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '6px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700 }}>PTS</div>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#FFB800', marginTop: '1px' }}>
                            {s.points || 0}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700 }}>NRR</div>
                          <div
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 900,
                              fontFamily: 'var(--font-data, monospace)',
                              color: isPositiveNRR ? '#10B981' : '#EF4444',
                              marginTop: '2px',
                            }}
                          >
                            {isPositiveNRR && Number(s.nrr || 0) > 0 ? `+${s.displayNRR || '0.00'}` : s.displayNRR || '0.00'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700 }}>P / W / L</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                            {s.played || 0} / <span style={{ color: '#34D399' }}>{s.won || 0}</span> / <span style={{ color: '#F87171' }}>{s.lost || 0}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700 }}>RUNS (OV)</div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', marginTop: '2px' }}>
                            {s.runsFor || 0} ({s.displayOversFor || '0'})
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
