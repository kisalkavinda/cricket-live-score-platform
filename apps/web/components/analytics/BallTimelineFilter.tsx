'use client';

import React, { useState, useMemo } from 'react';
import {
  filterCommentaryBalls,
  computeInningsSummary,
  BallFilterMode,
  FormattedCommentaryBall,
  InningsSummaryCardData,
} from '@/lib/analytics/match-analytics';

interface BallTimelineFilterProps {
  innings: any;
  ballsPerOver?: number;
  match?: any;
}

export default function BallTimelineFilter({
  innings,
  ballsPerOver = 6,
  match,
}: BallTimelineFilterProps) {
  const [filter, setFilter] = useState<BallFilterMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'NEWEST_FIRST' | 'CHRONOLOGICAL'>('NEWEST_FIRST');

  const isSuperOver = Boolean(
    innings?.isSuperOver ||
    innings?.inningsNumber === 3 ||
    innings?.inningsNumber === 4
  );

  const [showSummary, setShowSummary] = useState<boolean>(isSuperOver);

  const rawBalls = innings?.ballEvents || [];

  // Compute rich innings / super over summary
  const summary: InningsSummaryCardData = useMemo(() => {
    return computeInningsSummary(innings, match, ballsPerOver);
  }, [innings, match, ballsPerOver]);

  // Format balls with Free Hit tracking and Super Over context
  const formattedBalls = useMemo(() => {
    return filterCommentaryBalls(rawBalls, filter, {
      isSuperOver,
      teamName: innings?.battingTeam?.name || 'Batting Team',
    });
  }, [rawBalls, filter, isSuperOver, innings?.battingTeam?.name]);

  // Apply optional search query
  const displayedBalls = useMemo(() => {
    let list = formattedBalls;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.batsmanName.toLowerCase().includes(q) ||
          b.bowlerName.toLowerCase().includes(q) ||
          (b.dismissedPlayerName && b.dismissedPlayerName.toLowerCase().includes(q)) ||
          b.commentaryText.toLowerCase().includes(q)
      );
    }

    if (sortOrder === 'CHRONOLOGICAL') {
      return [...list].reverse();
    }
    return list;
  }, [formattedBalls, searchQuery, sortOrder]);

  // Filter tab counts
  const allCount = rawBalls.length;
  const boundaryCount = useMemo(
    () => rawBalls.filter((b: any) => Number(b.runs || 0) === 4 || Number(b.runs || 0) === 6).length,
    [rawBalls]
  );
  const wicketCount = useMemo(
    () => rawBalls.filter((b: any) => Boolean(b.isWicket) && b.wicketType !== 'RETIRED_HURT').length,
    [rawBalls]
  );

  // Calculate cumulative over score maps
  const overStatsMap = useMemo(() => {
    const map = new Map<number, { runsInOver: number; wicketsInOver: number; cumRuns: number; cumWkts: number; isMaiden: boolean }>();
    let cumRuns = 0;
    let cumWkts = 0;

    const chrono = [...rawBalls].sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.overNumber * ballsPerOver + a.ballNumber) - (b.overNumber * ballsPerOver + b.ballNumber);
    });

    const byOver = new Map<number, any[]>();
    for (const b of chrono) {
      if (!byOver.has(b.overNumber)) byOver.set(b.overNumber, []);
      byOver.get(b.overNumber)!.push(b);
    }

    const sortedOvers = Array.from(byOver.keys()).sort((a, b) => a - b);
    for (const ov of sortedOvers) {
      const balls = byOver.get(ov) || [];
      const overRuns = balls.reduce((sum, b) => sum + Number(b.runs || 0) + Number(b.extras || 0), 0);
      const overWkts = balls.filter((b) => b.isWicket && b.wicketType !== 'RETIRED_HURT').length;
      const legalCount = balls.filter((b) => b.isLegal).length;
      const isMaiden = legalCount >= ballsPerOver && overRuns === 0;
      cumRuns += overRuns;
      cumWkts += overWkts;

      map.set(ov, {
        runsInOver: overRuns,
        wicketsInOver: overWkts,
        cumRuns,
        cumWkts,
        isMaiden,
      });
    }
    return map;
  }, [rawBalls, ballsPerOver]);

  // Group deliveries by overNumber
  const groupedByOver = useMemo(() => {
    const groups = new Map<number, FormattedCommentaryBall[]>();
    for (const b of displayedBalls) {
      if (!groups.has(b.overNumber)) {
        groups.set(b.overNumber, []);
      }
      groups.get(b.overNumber)!.push(b);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      sortOrder === 'NEWEST_FIRST' ? b[0] - a[0] : a[0] - b[0]
    );
  }, [displayedBalls, sortOrder]);

  if (!innings || rawBalls.length === 0) {
    return (
      <div
        style={{
          background: 'var(--color-paper-dark, #11141D)',
          border: '1.5px solid var(--color-border-dark, rgba(255,255,255,0.1))',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏏</div>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>No ball-by-ball deliveries recorded for this innings yet.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--color-paper-dark, #11141D)',
        border: '1.5px solid var(--color-border-dark, rgba(255,255,255,0.1))',
        borderRadius: '16px',
        padding: '20px 18px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* SUPER OVER BANNER (If Innings 3 or 4 / Super Over)            */}
      {/* ------------------------------------------------------------- */}
      {isSuperOver && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(192, 39, 45, 0.22))',
            border: '1.5px solid rgba(245, 158, 11, 0.6)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 0 16px rgba(245, 158, 11, 0.2)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.25rem' }}>⚡</span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '1rem',
                  color: '#F59E0B',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                SUPER OVER SHOOTOUT
              </span>
              <span
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                }}
              >
                MAX 2 WICKETS
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.75)' }}>
              1 Over (6 deliveries) tie-break. Innings ends immediately upon the fall of the 2nd wicket.
            </p>
          </div>

          {summary.targetEquationText && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontFamily: 'var(--font-data)',
                fontWeight: 800,
                fontSize: '0.82rem',
                color: '#FDE047',
              }}
            >
              {summary.targetEquationText}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* INNINGS SUMMARY TOGGLE & CARD                                 */}
      {/* ------------------------------------------------------------- */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setShowSummary((prev) => !prev)}
          style={{
            background: showSummary ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${showSummary ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
            borderRadius: '8px',
            padding: '8px 14px',
            color: showSummary ? '#F59E0B' : 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📊</span>
            <span>
              {isSuperOver ? 'SUPER OVER SUMMARY' : `INNINGS ${summary.inningsNumber} SUMMARY`} ({summary.teamShortName}: {summary.totalRuns}/{summary.totalWickets} in {summary.totalOversFormatted} Ov)
            </span>
          </span>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            {showSummary ? '▲ Hide' : '▼ Show'}
          </span>
        </button>

        {showSummary && (
          <div
            style={{
              marginTop: '10px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Top Score Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                paddingBottom: '12px',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: 'var(--color-paper, #F8FAFC)',
                  }}
                >
                  {summary.teamName} {summary.totalRuns}/{summary.totalWickets}
                </span>
                <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-data)' }}>
                  ({summary.totalOversFormatted} overs • CRR: {summary.crr})
                </span>
              </div>

              {/* Boundaries & percentage pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.78rem',
                }}
              >
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 800 }}>
                  {summary.foursCount} 4s
                </span>
                <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#C4B5FD', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(139, 92, 246, 0.3)', fontWeight: 800 }}>
                  {summary.sixesCount} 6s
                </span>
                <span style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255,255,255,0.75)', padding: '3px 8px', borderRadius: '4px' }}>
                  {summary.boundaryRuns} runs ({summary.boundaryPercentage}%)
                </span>
              </div>
            </div>

            {/* Target or Result Status */}
            {(summary.targetEquationText || summary.resultText) && (
              <div
                style={{
                  background: summary.resultText ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${summary.resultText ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: summary.resultText ? '#6EE7B7' : '#FDE047',
                  fontFamily: 'var(--font-data)',
                }}
              >
                {summary.resultText ? `🏆 ${summary.resultText}` : `🎯 ${summary.targetEquationText}`}
              </div>
            )}

            {/* Top Batters & Bowlers Split */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
              }}
            >
              {/* Top Batters */}
              {summary.topBatters.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Top Batters
                  </div>
                  {summary.topBatters.map((b, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '3px 0' }}>
                      <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {b.name}{b.isNotOut ? '*' : ''}
                      </span>
                      <span style={{ fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.8)', fontWeight: 800 }}>
                        {b.runs} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>({b.balls})</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Bowlers */}
              {summary.topBowlers.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Top Bowlers
                  </div>
                  {summary.topBowlers.map((bw, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '3px 0' }}>
                      <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {bw.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.8)', fontWeight: 800 }}>
                        {bw.wickets}/{bw.runs} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>({bw.overs} ov)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER BAR & SEARCH CONTROLS                                  */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        {/* Filter Pills */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setFilter('ALL')}
            style={{
              background: filter === 'ALL' ? 'var(--color-accent, #C0272D)' : 'transparent',
              color: filter === 'ALL' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            All Balls ({allCount})
          </button>
          <button
            onClick={() => setFilter('BOUNDARIES')}
            style={{
              background: filter === 'BOUNDARIES' ? '#10B981' : 'transparent',
              color: filter === 'BOUNDARIES' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🔥 Boundaries ({boundaryCount})
          </button>
          <button
            onClick={() => setFilter('WICKETS')}
            style={{
              background: filter === 'WICKETS' ? '#EF4444' : 'transparent',
              color: filter === 'WICKETS' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🔴 Wickets ({wicketCount})
          </button>
        </div>

        {/* Search & Sort Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search player or ball..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#FFFFFF',
              fontSize: '0.78rem',
              outline: 'none',
              width: '170px',
            }}
          />

          <button
            onClick={() =>
              setSortOrder((prev) => (prev === 'NEWEST_FIRST' ? 'CHRONOLOGICAL' : 'NEWEST_FIRST'))
            }
            title="Toggle sort order"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.74rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {sortOrder === 'NEWEST_FIRST' ? '⬇ Newest First' : '⬆ Chronological'}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TIMELINE FEED                                                 */}
      {/* ------------------------------------------------------------- */}
      {displayedBalls.length === 0 ? (
        <div
          style={{
            padding: '36px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.85rem',
            fontStyle: 'italic',
          }}
        >
          No deliveries match the selected filter or search term.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groupedByOver.map(([overNum, balls]) => {
            const overRuns = balls.reduce((sum, b) => sum + b.runs + b.extras, 0);
            const overWkts = balls.filter((b) => b.isWicket && b.wicketType !== 'RETIRED_HURT').length;
            const overStat = overStatsMap.get(overNum);

            return (
              <div
                key={`over-group-${overNum}`}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                {/* Over Header Bar */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '9px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 900,
                        fontSize: '0.84rem',
                        color: 'var(--color-gold, #F59E0B)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {isSuperOver ? 'SUPER OVER' : `OVER ${overNum + 1}`}
                    </span>

                    {overStat?.isMaiden && (
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34D399',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                        }}
                      >
                        ✨ MAIDEN
                      </span>
                    )}

                    {overRuns >= 15 && (
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#F87171',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                        }}
                      >
                        💥 {overRuns} RUNS
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: '0.78rem',
                      color: 'rgba(255,255,255,0.75)',
                      fontWeight: 700,
                    }}
                  >
                    {overRuns} {overRuns === 1 ? 'run' : 'runs'}
                    {overWkts > 0 && ` • 🔴 ${overWkts} ${overWkts === 1 ? 'wicket' : 'wickets'}`}
                  </span>
                </div>

                {/* Deliveries inside this over */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {balls.map((b, idx) => (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 14px',
                        borderBottom:
                          idx < balls.length - 1 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
                        background: b.isWicket && b.wicketType === 'RETIRED_HURT'
                          ? 'rgba(2, 132, 199, 0.08)'
                          : b.isWicket
                          ? 'rgba(239, 68, 68, 0.06)'
                          : b.runs === 6
                          ? 'rgba(139, 92, 246, 0.06)'
                          : b.runs === 4
                          ? 'rgba(16, 185, 129, 0.06)'
                          : b.isFreeHit
                          ? 'rgba(245, 158, 11, 0.05)'
                          : 'transparent',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      {/* Over & Ball Number */}
                      <div
                        style={{
                          width: '42px',
                          textAlign: 'center',
                          fontFamily: 'var(--font-data)',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          color: 'rgba(255,255,255,0.5)',
                          marginTop: '4px',
                        }}
                      >
                        {b.overDecimal}
                      </div>

                      {/* Outcome Badge */}
                      <div
                        style={{
                          minWidth: '32px',
                          width: b.outcomeBadge.label.length > 2 ? 'auto' : '32px',
                          height: '32px',
                          padding: b.outcomeBadge.label.length > 2 ? '0 6px' : '0',
                          borderRadius: b.outcomeBadge.label.length > 2 ? '16px' : '50%',
                          background: b.outcomeBadge.bg,
                          color: b.outcomeBadge.color,
                          border: `1.5px solid ${b.outcomeBadge.borderColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-data)',
                          fontWeight: 900,
                          fontSize: b.outcomeBadge.label.length > 3 ? '0.7rem' : '0.78rem',
                          boxShadow:
                            b.outcomeBadge.type === 'FOUR'
                              ? '0 0 10px rgba(16, 185, 129, 0.4)'
                              : b.outcomeBadge.type === 'SIX'
                              ? '0 0 10px rgba(139, 92, 246, 0.4)'
                              : b.outcomeBadge.type === 'WICKET'
                              ? '0 0 10px rgba(239, 68, 68, 0.5)'
                              : 'none',
                          flexShrink: 0,
                        }}
                      >
                        {b.outcomeBadge.label}
                      </div>

                      {/* Ball Detail & Commentary Text */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: 'var(--color-paper, #F8FAFC)', fontSize: '0.85rem' }}>
                            {b.bowlerName} to {b.batsmanName}
                          </span>

                          {/* Super Over Delivery Tag */}
                          {b.isSuperOver && (
                            <span
                              style={{
                                background: 'rgba(139, 92, 246, 0.25)',
                                border: '1px solid #8B5CF6',
                                color: '#E9D5FF',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.66rem',
                                fontWeight: 800,
                              }}
                            >
                              ⚡ SUPER OVER
                            </span>
                          )}

                          {b.isWicket && (
                            <span
                              style={{
                                background: b.wicketType === 'RETIRED_HURT' ? '#0284C7' : '#EF4444',
                                color: '#FFFFFF',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                              }}
                            >
                              {b.wicketType === 'RETIRED_HURT' ? 'RETIRED HURT (NOT OUT)' : `WICKET (${b.wicketType || 'OUT'})`}
                            </span>
                          )}

                          {b.runs === 6 && (
                            <span
                              style={{
                                background: '#8B5CF6',
                                color: '#FFFFFF',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                              }}
                            >
                              SIX
                            </span>
                          )}

                          {b.runs === 4 && (
                            <span
                              style={{
                                background: '#10B981',
                                color: '#FFFFFF',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                              }}
                            >
                              FOUR
                            </span>
                          )}

                          {b.extraType === 'NO_BALL' && (
                            <span
                              style={{
                                background: '#F97316',
                                color: '#000000',
                                padding: '1px 7px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 900,
                              }}
                            >
                              ⚠️ NO BALL (RE-BOWLED DELIVERY)
                            </span>
                          )}

                          {b.extraType === 'WIDE' && b.extras >= 5 && (
                            <span
                              style={{
                                background: '#F59E0B',
                                color: '#000000',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 900,
                              }}
                            >
                              5 WIDES
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            margin: '4px 0 0',
                            fontSize: '0.82rem',
                            color: 'rgba(255, 255, 255, 0.78)',
                            lineHeight: 1.45,
                          }}
                        >
                          {b.commentaryText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Over Footer Strip (Score after Over) */}
                {overStat && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.025)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      padding: '7px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.74rem',
                      color: 'rgba(255, 255, 255, 0.65)',
                      fontFamily: 'var(--font-data)',
                    }}
                  >
                    <span>
                      End of Over {overNum + 1}: <strong style={{ color: '#FFFFFF' }}>{overStat.runsInOver} runs</strong> • Score: <strong style={{ color: 'var(--color-gold, #F59E0B)' }}>{innings.battingTeam?.shortName || 'Score'} {overStat.cumRuns}/{overStat.cumWkts}</strong>
                    </span>
                    {overStat.isMaiden && (
                      <span style={{ color: '#34D399', fontWeight: 800 }}>
                        Maiden Over!
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
