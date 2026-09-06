'use client';

import React, { useState } from 'react';
import {
  calculateChaseEquation,
  calculateBoundaryComparison,
} from '@/lib/analytics/match-analytics';

interface LiveEquationTickerProps {
  match: any;
  ballsPerOver?: number;
  compact?: boolean;
  showBoundaryCounter?: boolean;
}

export function HeadToHeadBoundaryCounter({
  match,
  compact = false,
}: {
  match: any;
  compact?: boolean;
}) {
  const [showTiebreakDetails, setShowTiebreakDetails] = useState(false);
  const boundaries = calculateBoundaryComparison(match);

  if (!boundaries) return null;

  return (
    <div
      style={{
        background: 'var(--color-paper-dark, #11141D)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: compact ? '12px 14px' : '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1rem' }}>⚔️</span>
          <span
            style={{
              fontFamily: 'var(--font-display, sans-serif)',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: 'var(--color-paper, #F8FAFC)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Head-to-Head Boundary Counter
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '2px 6px',
              borderRadius: '4px',
              color: 'var(--color-gold, #F59E0B)',
              fontWeight: 700,
            }}
          >
            TIE-BREAK REGULATION
          </span>
        </div>

        <button
          onClick={() => setShowTiebreakDetails(!showTiebreakDetails)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.74rem',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {showTiebreakDetails ? 'Hide Rule ▴' : 'Rule Info ▾'}
        </button>
      </div>

      {showTiebreakDetails && (
        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.4,
            borderLeft: '3px solid var(--color-gold, #F59E0B)',
          }}
        >
          {boundaries.regulationRuleNote}
        </div>
      )}

      {/* Comparative Boundary Matrix Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '12px',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.25)',
          padding: '10px 14px',
          borderRadius: '8px',
        }}
      >
        {/* Team A Boundary Stats */}
        <div>
          <div style={{ fontWeight: 800, color: '#F59E0B', fontSize: '0.9rem' }}>
            {boundaries.teamA.shortName}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '4px',
              fontFamily: 'var(--font-data)',
              fontSize: '0.85rem',
            }}
          >
            <span>
              <strong style={{ color: '#10B981' }}>{boundaries.teamA.fours}</strong>{' '}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>4s</span>
            </span>
            <span>•</span>
            <span>
              <strong style={{ color: '#8B5CF6' }}>{boundaries.teamA.sixes}</strong>{' '}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>6s</span>
            </span>
            <span>•</span>
            <span>
              <strong style={{ color: '#FFFFFF' }}>{boundaries.teamA.totalBoundaries}</strong>{' '}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>Total</span>
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
            {boundaries.teamA.boundaryRuns} runs ({boundaries.teamA.boundaryPercentage})
          </div>
        </div>

        {/* Middle Versus / Lead Badge */}
        <div style={{ textAlign: 'center', padding: '0 8px' }}>
          {boundaries.leader === 'TIED' ? (
            <span
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              TIED
            </span>
          ) : (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--color-gold, #F59E0B)',
                whiteSpace: 'nowrap',
              }}
            >
              +{boundaries.leadDifference}{' '}
              {boundaries.leader === 'TEAM_A' ? boundaries.teamA.shortName : boundaries.teamB.shortName}
            </div>
          )}
        </div>

        {/* Team B Boundary Stats */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, color: '#06B6D4', fontSize: '0.9rem' }}>
            {boundaries.teamB.shortName}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '4px',
              fontFamily: 'var(--font-data)',
              fontSize: '0.85rem',
            }}
          >
            <span>
              <strong style={{ color: '#10B981' }}>{boundaries.teamB.fours}</strong>{' '}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>4s</span>
            </span>
            <span>•</span>
            <span>
              <strong style={{ color: '#8B5CF6' }}>{boundaries.teamB.sixes}</strong>{' '}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>6s</span>
            </span>
            <span>•</span>
            <span>
              <strong style={{ color: '#FFFFFF' }}>{boundaries.teamB.totalBoundaries}</strong>{' '}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>Total</span>
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
            {boundaries.teamB.boundaryRuns} runs ({boundaries.teamB.boundaryPercentage})
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveEquationTicker({
  match,
  ballsPerOver = 6,
  compact = false,
  showBoundaryCounter = false,
}: LiveEquationTickerProps) {
  const chase = calculateChaseEquation(match, ballsPerOver);

  const inn1 = match?.innings?.find((i: any) => i.inningsNumber === 1);
  const inn2 = match?.innings?.find((i: any) => i.inningsNumber === 2);

  // 1st innings projected totals
  const firstInningsProjected = (() => {
    if (!inn1 || inn2 || match?.status === 'COMPLETED') return null;
    const maxOvers = match.oversPerInnings || 20;
    const currentRuns = inn1.runs || 0;
    const oversDecimal = (inn1.overs || 0) + ((inn1.balls || 0) / ballsPerOver);
    const crr = oversDecimal > 0 ? currentRuns / oversDecimal : 0;
    const oversRemaining = Math.max(0, maxOvers - oversDecimal);

    const projectedCurrent = Math.round(currentRuns + oversRemaining * crr);
    const projected8 = Math.round(currentRuns + oversRemaining * 8);
    const projected10 = Math.round(currentRuns + oversRemaining * 10);

    return {
      crr: crr.toFixed(2),
      projectedCurrent,
      projected8,
      projected10,
    };
  })();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '8px' : '14px',
        width: '100%',
      }}
    >
      {/* 1. DYNAMIC EQUATION TICKER BANNER */}
      {chase ? (
        <div
          style={{
            background:
              chase.status === 'ACHIEVED'
                ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))'
                : chase.status === 'DEFENDED'
                ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2))'
                : parseFloat(chase.requiredRunRate) > 12.0
                ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.25), rgba(0,0,0,0.4))'
                : 'linear-gradient(90deg, rgba(245, 158, 11, 0.25), rgba(6, 182, 212, 0.2))',
            border: `1.5px solid ${
              chase.status === 'ACHIEVED'
                ? '#10B981'
                : chase.status === 'DEFENDED'
                ? '#EF4444'
                : parseFloat(chase.requiredRunRate) > 12.0
                ? '#EF4444'
                : '#F59E0B'
            }`,
            borderRadius: '12px',
            padding: compact ? '10px 14px' : '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background:
                  chase.status === 'ACHIEVED'
                    ? '#10B981'
                    : chase.status === 'DEFENDED'
                    ? '#EF4444'
                    : '#F59E0B',
                boxShadow: '0 0 8px currentColor',
                animation: match?.status === 'LIVE' ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display, sans-serif)',
                fontWeight: 900,
                fontSize: compact ? '0.95rem' : '1.1rem',
                color: '#FFFFFF',
                letterSpacing: '0.03em',
              }}
            >
              {chase.equationText}
            </span>
          </div>

          {chase.status !== 'ACHIEVED' && chase.status !== 'DEFENDED' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: compact ? '10px' : '16px',
                fontFamily: 'var(--font-data, monospace)',
                fontSize: compact ? '0.8rem' : '0.88rem',
                fontWeight: 800,
              }}
            >
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '4px' }}>RRR:</span>
                <span
                  style={{
                    color: parseFloat(chase.requiredRunRate) > 12 ? '#EF4444' : '#F59E0B',
                    fontSize: '1rem',
                  }}
                >
                  {chase.requiredRunRate}
                </span>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '4px' }}>CRR:</span>
                <span style={{ color: '#06B6D4', fontSize: '1rem' }}>{chase.currentRunRate}</span>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '4px' }}>Rem:</span>
                <span style={{ color: '#FFFFFF' }}>{chase.ballsRemaining}b</span>
              </div>
            </div>
          )}
        </div>
      ) : firstInningsProjected ? (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(0,0,0,0.3))',
            border: '1.5px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: compact ? '10px 14px' : '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: '0.9rem' }}>🎯 1ST INNINGS RUN RATE:</span>
            <span style={{ fontFamily: 'var(--font-data)', fontWeight: 800, color: '#FFFFFF' }}>
              CRR: {firstInningsProjected.crr}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <span>Projected:</span>
            <span style={{ color: 'var(--color-gold, #F59E0B)', fontWeight: 800 }}>
              {firstInningsProjected.projectedCurrent} (at CRR)
            </span>
            <span>•</span>
            <span style={{ color: '#FFFFFF' }}>{firstInningsProjected.projected8} (at 8 RPO)</span>
            <span>•</span>
            <span style={{ color: '#FFFFFF' }}>{firstInningsProjected.projected10} (at 10 RPO)</span>
          </div>
        </div>
      ) : null}

      {/* 2. HEAD-TO-HEAD BOUNDARY COUNTER (Rendered only if explicitly requested) */}
      {showBoundaryCounter && <HeadToHeadBoundaryCounter match={match} compact={compact} />}
    </div>
  );
}
