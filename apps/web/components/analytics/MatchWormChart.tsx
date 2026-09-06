'use client';

import React, { useState, useMemo } from 'react';
import { computeInningsAnalytics, InningsAnalytics, OverSummary } from '@/lib/analytics/match-analytics';

interface MatchWormChartProps {
  match: any;
  ballsPerOver?: number;
}

type ChartMode = 'WORM' | 'MANHATTAN' | 'RUN_RATE';

export default function MatchWormChart({ match, ballsPerOver = 6 }: MatchWormChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('WORM');
  const [showInn1, setShowInn1] = useState(true);
  const [showInn2, setShowInn2] = useState(true);
  const [hoveredOver, setHoveredOver] = useState<number | null>(null);

  const inn1 = match?.innings?.find((i: any) => i.inningsNumber === 1);
  const inn2 = match?.innings?.find((i: any) => i.inningsNumber === 2);

  const inn1Analytics: InningsAnalytics | null = useMemo(
    () => (inn1 ? computeInningsAnalytics(inn1, ballsPerOver) : null),
    [inn1, ballsPerOver]
  );
  const inn2Analytics: InningsAnalytics | null = useMemo(
    () => (inn2 ? computeInningsAnalytics(inn2, ballsPerOver) : null),
    [inn2, ballsPerOver]
  );

  const maxMatchOvers = match?.oversPerInnings || 20;

  // Compute maximum runs / values for responsive scaling
  const maxCumulativeRuns = useMemo(() => {
    const max1 = inn1Analytics?.totalRuns || 0;
    const max2 = inn2Analytics?.totalRuns || 0;
    const peak = Math.max(max1, max2, 60);
    // Round up to next multiple of 20
    return Math.ceil(peak / 20) * 20;
  }, [inn1Analytics, inn2Analytics]);

  const maxOverRuns = useMemo(() => {
    let peak = 15;
    inn1Analytics?.overs.forEach((o) => {
      if (o.runsInOver > peak) peak = o.runsInOver;
    });
    inn2Analytics?.overs.forEach((o) => {
      if (o.runsInOver > peak) peak = o.runsInOver;
    });
    return Math.ceil(peak / 5) * 5;
  }, [inn1Analytics, inn2Analytics]);

  const maxRunRate = useMemo(() => {
    let peak = 12;
    inn1Analytics?.overs.forEach((o) => {
      if (o.cumulativeRunRate > peak) peak = o.cumulativeRunRate;
    });
    inn2Analytics?.overs.forEach((o) => {
      if (o.cumulativeRunRate > peak) peak = o.cumulativeRunRate;
    });
    return Math.ceil(peak / 2) * 2;
  }, [inn1Analytics, inn2Analytics]);

  // SVG Dimension parameters
  const svgWidth = 840;
  const svgHeight = 420;
  const padLeft = 60;
  const padRight = 40;
  const padTop = 45;
  const padBottom = 55;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  // Coordinate scales
  const getX = (overIndex: number) => {
    return padLeft + (overIndex / maxMatchOvers) * chartWidth;
  };

  const getYCumulative = (runs: number) => {
    const normalized = runs / maxCumulativeRuns;
    return padTop + chartHeight - normalized * chartHeight;
  };

  const getYOverRuns = (runs: number) => {
    const normalized = runs / maxOverRuns;
    return padTop + chartHeight - normalized * chartHeight;
  };

  const getYRunRate = (rr: number) => {
    const normalized = rr / maxRunRate;
    return padTop + chartHeight - normalized * chartHeight;
  };

  // Build SVG Path points for Worm
  const generatePathData = (overs: OverSummary[]) => {
    if (!overs || overs.length === 0) return '';
    let path = `M ${getX(0)} ${getYCumulative(0)}`;
    overs.forEach((o) => {
      path += ` L ${getX(o.overNumber)} ${getYCumulative(o.cumulativeRuns)}`;
    });
    return path;
  };

  const generateAreaPath = (overs: OverSummary[]) => {
    if (!overs || overs.length === 0) return '';
    const linePath = generatePathData(overs);
    const lastOver = overs[overs.length - 1];
    return `${linePath} L ${getX(lastOver.overNumber)} ${getYCumulative(0)} L ${getX(0)} ${getYCumulative(0)} Z`;
  };

  const generateRunRatePath = (overs: OverSummary[]) => {
    if (!overs || overs.length === 0) return '';
    let path = `M ${getX(overs[0].overNumber)} ${getYRunRate(overs[0].cumulativeRunRate)}`;
    overs.slice(1).forEach((o) => {
      path += ` L ${getX(o.overNumber)} ${getYRunRate(o.cumulativeRunRate)}`;
    });
    return path;
  };

  const team1Name = inn1Analytics?.teamName || match?.teamA?.name || 'Team A';
  const team1Short = inn1Analytics?.teamShortName || match?.teamA?.shortName || 'TMA';
  const team2Name = inn2Analytics?.teamName || match?.teamB?.name || 'Team B';
  const team2Short = inn2Analytics?.teamShortName || match?.teamB?.shortName || 'TMB';

  const team1Color = '#F59E0B'; // Gold / Amber
  const team2Color = '#06B6D4'; // Vibrant Cyan / Sky

  // Tooltip details for currently hovered over
  const tooltipData = useMemo(() => {
    if (hoveredOver === null) return null;
    const o1 = inn1Analytics?.overs.find((o) => o.overNumber === hoveredOver);
    const o2 = inn2Analytics?.overs.find((o) => o.overNumber === hoveredOver);
    return { over: hoveredOver, o1, o2 };
  }, [hoveredOver, inn1Analytics, inn2Analytics]);

  return (
    <div
      style={{
        background: 'var(--color-paper-dark, #11141D)',
        border: '1.5px solid var(--color-border-dark, rgba(255,255,255,0.1))',
        borderRadius: '16px',
        padding: '24px 20px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header & Mode Toggle Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📈</span>
            <h3
              style={{
                fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--color-paper, #F8FAFC)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                margin: 0,
              }}
            >
              Match Trajectory & Worm
            </h3>
          </div>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'rgba(255, 255, 255, 0.55)',
              margin: '4px 0 0',
            }}
          >
            Over-by-over comparative analysis with wicket milestones and boundary events
          </p>
        </div>

        {/* Mode Selector Buttons & Mobile View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
              onClick={() => setChartMode('WORM')}
              style={{
                background: chartMode === 'WORM' ? 'var(--color-accent, #C0272D)' : 'transparent',
                color: chartMode === 'WORM' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              📈 Worm
            </button>
            <button
              onClick={() => setChartMode('MANHATTAN')}
              style={{
                background: chartMode === 'MANHATTAN' ? 'var(--color-accent, #C0272D)' : 'transparent',
                color: chartMode === 'MANHATTAN' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              📊 Manhattan
            </button>
            <button
              onClick={() => setChartMode('RUN_RATE')}
              style={{
                background: chartMode === 'RUN_RATE' ? 'var(--color-accent, #C0272D)' : 'transparent',
                color: chartMode === 'RUN_RATE' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              ⚡ Run Rate
            </button>
          </div>
        </div>
      </div>

      {/* Legend and Active Markers Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(0,0,0,0.2)',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.78rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Team 1 Filter Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={showInn1}
              onChange={(e) => setShowInn1(e.target.checked)}
              style={{ accentColor: team1Color, cursor: 'pointer' }}
            />
            <span style={{ width: '12px', height: '3px', background: team1Color, borderRadius: '2px' }} />
            <span style={{ fontWeight: 700, color: team1Color }}>
              1st Inn: {team1Short} ({inn1Analytics?.totalRuns ?? 0}/{inn1Analytics?.totalWickets ?? 0})
            </span>
          </label>

          {/* Team 2 Filter Toggle */}
          {inn2Analytics && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={showInn2}
                onChange={(e) => setShowInn2(e.target.checked)}
                style={{ accentColor: team2Color, cursor: 'pointer' }}
              />
              <span style={{ width: '12px', height: '3px', background: team2Color, borderRadius: '2px' }} />
              <span style={{ fontWeight: 700, color: team2Color }}>
                2nd Inn: {team2Short} ({inn2Analytics.totalRuns}/{inn2Analytics.totalWickets})
              </span>
            </label>
          )}
        </div>

        {/* Milestone Indicator Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'rgba(255,255,255,0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#EF4444',
                boxShadow: '0 0 6px #EF4444',
              }}
            />
            <span>Wicket</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#8B5CF6',
                boxShadow: '0 0 6px #8B5CF6',
              }}
            />
            <span>Six (6)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#EAB308',
                boxShadow: '0 0 6px #EAB308',
              }}
            />
            <span>Maiden (M)</span>
          </div>
        </div>
      </div>

      {/* Responsive SVG Chart Container */}
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'manipulation',
          }}
          onMouseLeave={() => setHoveredOver(null)}
        >
          <defs>
            {/* Team 1 Gradient Fill */}
            <linearGradient id="team1WormGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={team1Color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={team1Color} stopOpacity="0.0" />
            </linearGradient>

            {/* Team 2 Gradient Fill */}
            <linearGradient id="team2WormGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={team2Color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={team2Color} stopOpacity="0.0" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Grid Lines (Horizontal) */}
          {(() => {
            const lines = [];
            const steps = 5;
            for (let i = 0; i <= steps; i++) {
              const yVal = padTop + (i / steps) * chartHeight;
              let label = '';
              if (chartMode === 'WORM') {
                label = `${Math.round(maxCumulativeRuns * (1 - i / steps))}`;
              } else if (chartMode === 'MANHATTAN') {
                label = `${Math.round(maxOverRuns * (1 - i / steps))}`;
              } else {
                label = `${(maxRunRate * (1 - i / steps)).toFixed(1)}`;
              }

              lines.push(
                <g key={`y-grid-${i}`}>
                  <line
                    x1={padLeft}
                    y1={yVal}
                    x2={svgWidth - padRight}
                    y2={yVal}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray={i === steps ? 'none' : '4 4'}
                    strokeWidth={i === steps ? 1.5 : 1}
                  />
                  <text
                    x={padLeft - 10}
                    y={yVal + 4}
                    textAnchor="end"
                    fill="rgba(255, 255, 255, 0.45)"
                    fontSize="11"
                    fontFamily="var(--font-data, monospace)"
                    fontWeight="600"
                  >
                    {label}
                  </text>
                </g>
              );
            }
            return lines;
          })()}

          {/* Vertical Grid Lines & Over Labels (Every 2 Overs) */}
          {Array.from({ length: maxMatchOvers + 1 }).map((_, ov) => {
            const xVal = getX(ov);
            const isLabel = ov % (maxMatchOvers > 10 ? 2 : 1) === 0 || ov === maxMatchOvers;

            return (
              <g key={`x-grid-${ov}`}>
                {ov > 0 && (
                  <line
                    x1={xVal}
                    y1={padTop}
                    x2={xVal}
                    y2={padTop + chartHeight}
                    stroke={hoveredOver === ov ? 'rgba(255,255,255,0.25)' : 'rgba(255, 255, 255, 0.05)'}
                    strokeDasharray="3 3"
                  />
                )}
                {isLabel && (
                  <text
                    x={xVal}
                    y={padTop + chartHeight + 22}
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.5)"
                    fontSize="11"
                    fontFamily="var(--font-data, monospace)"
                    fontWeight="600"
                  >
                    {ov}
                  </text>
                )}
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={padLeft + chartWidth / 2}
            y={padTop + chartHeight + 42}
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="12"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            OVERS
          </text>

          <text
            x={16}
            y={padTop + chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${padTop + chartHeight / 2})`}
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="12"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            {chartMode === 'WORM' ? 'RUNS (CUMULATIVE)' : chartMode === 'MANHATTAN' ? 'RUNS PER OVER' : 'RUN RATE (RPO)'}
          </text>

          {/* ============================================================== */}
          {/* MODE 1: WORM (CUMULATIVE RUNS)                                */}
          {/* ============================================================== */}
          {chartMode === 'WORM' && (
            <>
              {/* Team 1 Worm Area & Line */}
              {showInn1 && inn1Analytics && inn1Analytics.overs.length > 0 && (
                <>
                  <path d={generateAreaPath(inn1Analytics.overs)} fill="url(#team1WormGrad)" />
                  <path
                    d={generatePathData(inn1Analytics.overs)}
                    fill="none"
                    stroke={team1Color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Milestones on Team 1 line */}
                  {inn1Analytics.overs.map((o) => {
                    const cx = getX(o.overNumber);
                    const cy = getYCumulative(o.cumulativeRuns);
                    const isHovered = hoveredOver === o.overNumber;

                    return (
                      <g key={`t1-pt-${o.overNumber}`}>
                        {/* Normal dot */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 6 : 3.5}
                          fill={team1Color}
                          stroke="#11141D"
                          strokeWidth="2"
                        />
                        {/* Wicket marker */}
                        {o.wicketsInOver > 0 && (
                          <g filter="url(#glow)">
                            <circle cx={cx} cy={cy} r="7.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                            <text
                              x={cx}
                              y={cy + 3.5}
                              textAnchor="middle"
                              fill="#FFFFFF"
                              fontSize="9"
                              fontWeight="900"
                              fontFamily="var(--font-data)"
                            >
                              {o.wicketsInOver > 1 ? o.wicketsInOver : 'W'}
                            </text>
                          </g>
                        )}
                        {/* Six marker (if no wicket on this over) */}
                        {o.sixesInOver > 0 && o.wicketsInOver === 0 && (
                          <g>
                            <circle cx={cx} cy={cy - 10} r="5.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="1.5" />
                            <text
                              x={cx}
                              y={cy - 7}
                              textAnchor="middle"
                              fill="#FFFFFF"
                              fontSize="8"
                              fontWeight="900"
                            >
                              6
                            </text>
                          </g>
                        )}
                        {/* Maiden marker */}
                        {o.isMaiden && o.wicketsInOver === 0 && o.sixesInOver === 0 && (
                          <circle cx={cx} cy={cy + 10} r="5" fill="#EAB308" stroke="#FFFFFF" strokeWidth="1" />
                        )}
                      </g>
                    );
                  })}
                </>
              )}

              {/* Team 2 Worm Area & Line */}
              {showInn2 && inn2Analytics && inn2Analytics.overs.length > 0 && (
                <>
                  <path d={generateAreaPath(inn2Analytics.overs)} fill="url(#team2WormGrad)" />
                  <path
                    d={generatePathData(inn2Analytics.overs)}
                    fill="none"
                    stroke={team2Color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Milestones on Team 2 line */}
                  {inn2Analytics.overs.map((o) => {
                    const cx = getX(o.overNumber);
                    const cy = getYCumulative(o.cumulativeRuns);
                    const isHovered = hoveredOver === o.overNumber;

                    return (
                      <g key={`t2-pt-${o.overNumber}`}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 6 : 3.5}
                          fill={team2Color}
                          stroke="#11141D"
                          strokeWidth="2"
                        />
                        {o.wicketsInOver > 0 && (
                          <g filter="url(#glow)">
                            <circle cx={cx} cy={cy} r="7.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                            <text
                              x={cx}
                              y={cy + 3.5}
                              textAnchor="middle"
                              fill="#FFFFFF"
                              fontSize="9"
                              fontWeight="900"
                              fontFamily="var(--font-data)"
                            >
                              {o.wicketsInOver > 1 ? o.wicketsInOver : 'W'}
                            </text>
                          </g>
                        )}
                        {o.sixesInOver > 0 && o.wicketsInOver === 0 && (
                          <g>
                            <circle cx={cx} cy={cy - 10} r="5.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="1.5" />
                            <text
                              x={cx}
                              y={cy - 7}
                              textAnchor="middle"
                              fill="#FFFFFF"
                              fontSize="8"
                              fontWeight="900"
                            >
                              6
                            </text>
                          </g>
                        )}
                        {o.isMaiden && o.wicketsInOver === 0 && o.sixesInOver === 0 && (
                          <circle cx={cx} cy={cy + 10} r="5" fill="#EAB308" stroke="#FFFFFF" strokeWidth="1" />
                        )}
                      </g>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* ============================================================== */}
          {/* MODE 2: MANHATTAN (RUNS PER OVER BARS)                        */}
          {/* ============================================================== */}
          {chartMode === 'MANHATTAN' && (
            <>
              {Array.from({ length: maxMatchOvers }).map((_, ovIndex) => {
                const overNum = ovIndex + 1;
                const o1 = inn1Analytics?.overs.find((o) => o.overNumber === overNum);
                const o2 = inn2Analytics?.overs.find((o) => o.overNumber === overNum);

                const centerCenterX = getX(overNum);
                const barWidth = 10;
                const isHovered = hoveredOver === overNum;

                const t1Height = o1 ? chartHeight - (getYOverRuns(o1.runsInOver) - padTop) : 0;
                const t2Height = o2 ? chartHeight - (getYOverRuns(o2.runsInOver) - padTop) : 0;

                return (
                  <g key={`manhattan-${overNum}`}>
                    {/* Team 1 Bar */}
                    {showInn1 && o1 && (
                      <>
                        <rect
                          x={centerCenterX - barWidth - 1}
                          y={getYOverRuns(o1.runsInOver)}
                          width={barWidth}
                          height={Math.max(2, t1Height)}
                          rx="3"
                          fill={team1Color}
                          opacity={isHovered ? 1 : 0.85}
                        />
                        {o1.wicketsInOver > 0 && (
                          <circle
                            cx={centerCenterX - barWidth / 2 - 1}
                            cy={getYOverRuns(o1.runsInOver) - 7}
                            r="4.5"
                            fill="#EF4444"
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                        )}
                      </>
                    )}

                    {/* Team 2 Bar */}
                    {showInn2 && o2 && (
                      <>
                        <rect
                          x={centerCenterX + 1}
                          y={getYOverRuns(o2.runsInOver)}
                          width={barWidth}
                          height={Math.max(2, t2Height)}
                          rx="3"
                          fill={team2Color}
                          opacity={isHovered ? 1 : 0.85}
                        />
                        {o2.wicketsInOver > 0 && (
                          <circle
                            cx={centerCenterX + barWidth / 2 + 1}
                            cy={getYOverRuns(o2.runsInOver) - 7}
                            r="4.5"
                            fill="#EF4444"
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* ============================================================== */}
          {/* MODE 3: RUN RATE (CRR TRAJECTORY)                             */}
          {/* ============================================================== */}
          {chartMode === 'RUN_RATE' && (
            <>
              {/* Reference line: 8.0 RPO */}
              <line
                x1={padLeft}
                y1={getYRunRate(8)}
                x2={svgWidth - padRight}
                y2={getYRunRate(8)}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="5 5"
              />
              <text
                x={svgWidth - padRight + 5}
                y={getYRunRate(8) + 4}
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
                fontFamily="var(--font-data)"
              >
                8 RPO
              </text>

              {/* Team 1 Run Rate Curve */}
              {showInn1 && inn1Analytics && (
                <path
                  d={generateRunRatePath(inn1Analytics.overs)}
                  fill="none"
                  stroke={team1Color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Team 2 Run Rate Curve */}
              {showInn2 && inn2Analytics && (
                <path
                  d={generateRunRatePath(inn2Analytics.overs)}
                  fill="none"
                  stroke={team2Color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </>
          )}

          {/* Invisible Over Hover / Touch Detection Columns */}
          {Array.from({ length: maxMatchOvers }).map((_, ovIndex) => {
            const overNum = ovIndex + 1;
            const colX = getX(overNum) - chartWidth / (maxMatchOvers * 2);
            const colW = chartWidth / maxMatchOvers;

            return (
              <rect
                key={`hit-${overNum}`}
                x={colX}
                y={padTop}
                width={colW}
                height={chartHeight}
                fill={hoveredOver === overNum ? 'rgba(255,255,255,0.06)' : 'transparent'}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredOver(overNum)}
                onClick={() => setHoveredOver((prev) => (prev === overNum ? null : overNum))}
                onTouchStart={() => setHoveredOver((prev) => (prev === overNum ? null : overNum))}
              />
            );
          })}
        </svg>
      </div>

      {/* Interactive Tooltip / Over Breakdown Card */}
      {tooltipData && (
        <div
          style={{
            marginTop: '16px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                color: 'var(--color-gold, #F59E0B)',
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              📍 Over {tooltipData.over} Breakdown
            </span>
            <button
              onClick={() => setHoveredOver(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 900,
              }}
              title="Close breakdown"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Team 1 Snapshot at this Over */}
            {tooltipData.o1 ? (
              <div style={{ borderLeft: `3px solid ${team1Color}`, paddingLeft: '12px' }}>
                <div style={{ fontSize: '0.76rem', color: team1Color, fontWeight: 800 }}>
                  1st Inn: {team1Name} ({team1Short})
                </div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-data)', marginTop: '2px' }}>
                  {tooltipData.o1.runsInOver} runs in over • Score: {tooltipData.o1.cumulativeRuns}/{tooltipData.o1.cumulativeWickets}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                  Over Run Rate: {tooltipData.o1.cumulativeRunRate} RPO
                </div>
                {(tooltipData.o1.wicketsInOver > 0 || tooltipData.o1.sixesInOver > 0 || tooltipData.o1.isMaiden) && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {tooltipData.o1.wicketsInOver > 0 && (
                      <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                        🔴 {tooltipData.o1.wicketsInOver} {tooltipData.o1.wicketsInOver === 1 ? 'Wicket' : 'Wickets'}
                      </span>
                    )}
                    {tooltipData.o1.sixesInOver > 0 && (
                      <span style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD', border: '1px solid rgba(139, 92, 246, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                        🟣 {tooltipData.o1.sixesInOver} {tooltipData.o1.sixesInOver === 1 ? 'Six' : 'Sixes'}
                      </span>
                    )}
                    {tooltipData.o1.isMaiden && (
                      <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#FDE047', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                        ✨ Maiden Over
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ borderLeft: `3px solid ${team1Color}`, paddingLeft: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                {team1Short}: No deliveries in Over {tooltipData.over}
              </div>
            )}

            {/* Team 2 Snapshot at this Over */}
            {tooltipData.o2 ? (
              <div style={{ borderLeft: `3px solid ${team2Color}`, paddingLeft: '12px' }}>
                <div style={{ fontSize: '0.76rem', color: team2Color, fontWeight: 800 }}>
                  2nd Inn: {team2Name} ({team2Short})
                </div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-data)', marginTop: '2px' }}>
                  {tooltipData.o2.runsInOver} runs in over • Score: {tooltipData.o2.cumulativeRuns}/{tooltipData.o2.cumulativeWickets}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                  Over Run Rate: {tooltipData.o2.cumulativeRunRate} RPO
                </div>
                {(tooltipData.o2.wicketsInOver > 0 || tooltipData.o2.sixesInOver > 0 || tooltipData.o2.isMaiden) && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {tooltipData.o2.wicketsInOver > 0 && (
                      <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                        🔴 {tooltipData.o2.wicketsInOver} {tooltipData.o2.wicketsInOver === 1 ? 'Wicket' : 'Wickets'}
                      </span>
                    )}
                    {tooltipData.o2.sixesInOver > 0 && (
                      <span style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD', border: '1px solid rgba(139, 92, 246, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                        🟣 {tooltipData.o2.sixesInOver} {tooltipData.o2.sixesInOver === 1 ? 'Six' : 'Sixes'}
                      </span>
                    )}
                    {tooltipData.o2.isMaiden && (
                      <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#FDE047', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                        ✨ Maiden Over
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ borderLeft: `3px solid ${team2Color}`, paddingLeft: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                {team2Short}: Yet to bat in Over {tooltipData.over}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
