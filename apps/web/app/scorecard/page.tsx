'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createClient } from '@/utils/supabase/client';
import MatchWormChart from '@/components/analytics/MatchWormChart';
import LiveEquationTicker, { HeadToHeadBoundaryCounter } from '@/components/analytics/LiveEquationTicker';
import BallTimelineFilter from '@/components/analytics/BallTimelineFilter';

function ScorecardContent() {
  const searchParams = useSearchParams();
  const requestedMatchId = searchParams.get('matchId');

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('inn1');
  const [viewMode, setViewMode] = useState<'SCORECARD' | 'WORM' | 'COMMENTARY'>('SCORECARD');
  const [lastLivePing, setLastLivePing] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const inFlightRef = useRef<boolean>(false);

  const fetchScorecard = useCallback(async (manual = false, force = false) => {
    if (inFlightRef.current && !force) return;
    inFlightRef.current = true;
    if (manual) setIsRefreshing(true);

    try {
      const cacheBust = `_t=${Date.now()}`;
      if (requestedMatchId) {
        const res = await fetch(`/api/matches/${requestedMatchId}/scorecard?${cacheBust}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.match) {
          setMatch(data.match);
          if (data.match.currentInnings && !manual) {
            setActiveTab((prev) => (!prev || prev === 'inn1' ? `inn${data.match.currentInnings}` : prev));
          }
          setLastLivePing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } else {
        const res = await fetch(`/api/matches/live?${cacheBust}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.matches && data.matches.length > 0) {
          const firstMatchId = data.matches[0].matchId;
          const matchRes = await fetch(`/api/matches/${firstMatchId}/scorecard?${cacheBust}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          });
          if (!matchRes.ok) return;
          const matchData = await matchRes.json();
          if (matchData.success && matchData.match) {
            setMatch(matchData.match);
            if (matchData.match.currentInnings && !manual) {
              setActiveTab((prev) => (!prev || prev === 'inn1' ? `inn${matchData.match.currentInnings}` : prev));
            }
            setLastLivePing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          }
        }
      }
    } catch (err) {
      console.error('[Scorecard] Fetch error:', err);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      if (manual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, [requestedMatchId]);

  useEffect(() => {
    fetchScorecard(false, true);
    // Reliable fallback polling (5s) in case WebSocket drops
    const interval = setInterval(() => {
      fetchScorecard(false, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchScorecard]);

  // Realtime Supabase Broadcast Subscription
  const activeMatchId = requestedMatchId || match?.id;
  useEffect(() => {
    if (!activeMatchId) return;
    let matchChannel: any = null;

    try {
      const supabase = createClient();
      matchChannel = supabase.channel(`match:${activeMatchId}`);
      matchChannel
        .on('broadcast', { event: 'score_update' }, (msg: any) => {
          if (msg?.payload?.currentInnings) {
            setActiveTab(`inn${msg.payload.currentInnings}`);
          }
          // Fast refresh from in-memory warm cache
          fetchScorecard(false, true);
        })
        .subscribe();
    } catch (err) {
      console.warn('[Scorecard] Realtime subscription error:', err);
    }

    return () => {
      if (matchChannel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(matchChannel);
        } catch {}
      }
    };
  }, [activeMatchId, fetchScorecard]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '120px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          border: '3px solid rgba(192, 39, 45, 0.2)',
          borderTopColor: 'var(--color-accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          Loading live match scorecard...
        </p>
      </div>
    );
  }

  if (!match) {
    return (
      <div style={{ maxWidth: '600px', margin: '100px auto', padding: '40px 24px', textAlign: 'center', background: 'var(--color-paper-dark)', border: '1.5px solid var(--color-border-dark)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏏</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-paper)', marginBottom: '8px', textTransform: 'uppercase' }}>
          Match Scorecard Not Available
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '24px' }}>
          No match details are currently available for this request. Matches will appear here with ball-by-ball updates once play begins.
        </p>
        <Link
          href="/"
          className="btn-hallmark-primary"
          style={{ textDecoration: 'none' }}
        >
          Return to Tournament Home
        </Link>
      </div>
    );
  }

  const allInnings = [...(match.innings || [])].sort((a: any, b: any) => a.inningsNumber - b.inningsNumber);
  const currentInnings = match.innings?.find((i: any) => i.inningsNumber === match.currentInnings) || allInnings[allInnings.length - 1] || allInnings[0];
  const selectedInnings = match.innings?.find((i: any) => `inn${i.inningsNumber}` === activeTab) || currentInnings || allInnings[0];

  const isFreeHit = (() => {
    const balls = currentInnings?.ballEvents;
    if (!balls || balls.length === 0) return false;
    for (const b of balls) {
      if (b.extraType === 'NO_BALL') return true;
      if (b.extraType === 'WIDE') continue;
      return false;
    }
    return false;
  })();

  const ballsPerOver = match.ballsPerOver || match.tournament?.stages?.[0]?.ballsPerOver || 6;

  const getRunRate = (runs: number = 0, overs: number = 0, balls: number = 0) => {
    const totalOvers = overs + (balls / ballsPerOver);
    return totalOvers > 0 ? (runs / totalOvers).toFixed(2) : '0.00';
  };

  // Ball badge matching LiveScoreWidget theme
  const getBallStyle = (b: any) => {
    let label = `${b.runs ?? 0}`;
    let bg = 'rgba(255, 255, 255, 0.1)';
    let color = '#FFFFFF';

    if (b.isWicket) {
      label = 'W';
      bg = '#EF4444';
    } else if (b.runs === 4) {
      label = '4';
      bg = '#10B981';
    } else if (b.runs === 6) {
      label = '6';
      bg = '#8B5CF6';
    } else if (b.extraType === 'WIDE') {
      label = b.extras > 1 ? `WD+${b.extras - 1}` : 'WD';
      bg = '#F59E0B';
      color = '#000000';
    } else if (b.extraType === 'NO_BALL') {
      label = b.runs > 0 ? `NB+${b.runs}` : 'NB';
      bg = '#F97316';
      color = '#000000';
    } else if (b.extraType === 'BYE') {
      label = `${b.extras || 1}B`;
      bg = 'rgba(255, 255, 255, 0.15)';
    } else if (b.extraType === 'LEG_BYE') {
      label = `${b.extras || 1}LB`;
      bg = 'rgba(255, 255, 255, 0.15)';
    } else if (b.runs === 0) {
      label = '•';
      bg = 'rgba(255, 255, 255, 0.05)';
      color = 'rgba(255, 255, 255, 0.4)';
    }

    return { label, bg, color };
  };

  // Target calculation for 2nd innings or Super Over 2
  let isChaseInnings = false;
  let chaseBattingTeamName = '';
  let targetRuns = 0;
  let runsNeeded = 0;
  let ballsRemaining = 0;
  let requiredRunRate = '0.00';

  if (currentInnings?.inningsNumber === 2) {
    const inn1 = match.innings?.find((i: any) => i.inningsNumber === 1);
    if (inn1) {
      isChaseInnings = true;
      chaseBattingTeamName = currentInnings.battingTeam?.name || 'Batting Team';
      targetRuns = inn1.runs + 1;
      runsNeeded = Math.max(0, targetRuns - currentInnings.runs);
      const totalBallsMatch = (match.oversPerInnings || 20) * ballsPerOver;
      const ballsBowled = (currentInnings.overs * ballsPerOver) + currentInnings.balls;
      ballsRemaining = Math.max(0, totalBallsMatch - ballsBowled);
      if (ballsRemaining > 0) {
        requiredRunRate = ((runsNeeded / ballsRemaining) * ballsPerOver).toFixed(2);
      }
    }
  } else if (currentInnings?.inningsNumber === 4) {
    const so1 = match.innings?.find((i: any) => i.inningsNumber === 3);
    if (so1) {
      isChaseInnings = true;
      chaseBattingTeamName = currentInnings.battingTeam?.name || 'Batting Team';
      targetRuns = so1.runs + 1;
      runsNeeded = Math.max(0, targetRuns - currentInnings.runs);
      const totalBallsMatch = 1 * ballsPerOver;
      const ballsBowled = (currentInnings.overs * ballsPerOver) + currentInnings.balls;
      ballsRemaining = Math.max(0, totalBallsMatch - ballsBowled);
      if (ballsRemaining > 0) {
        requiredRunRate = ((runsNeeded / ballsRemaining) * ballsPerOver).toFixed(2);
      }
    }
  }

  // Google Cricket Standard:
  // Pre-match (before toss): Show Team A (Left) vs Team B (Right)
  // Once match starts / toss decided:
  // Left: The team batting in Innings 1 (with their 1st innings score)
  // Right: The team batting in Innings 2 (with their 2nd innings score)
  // Indicator: A badge or 🏏 next to the team currently batting
  const isPreMatch = match.status === 'UPCOMING' && !match.tossWinnerId;
  const inn1 = match.innings?.find((i: any) => i.inningsNumber === 1);
  const inn2 = match.innings?.find((i: any) => i.inningsNumber === 2);

  let leftTeam = match.teamA;
  let rightTeam = match.teamB;
  let leftTeamInnings: any = null;
  let rightTeamInnings: any = null;
  let isLeftBattingCurrent = false;
  let isRightBattingCurrent = false;

  if (isPreMatch) {
    leftTeam = match.teamA;
    rightTeam = match.teamB;
  } else {
    const inn1BattingTeamId = inn1?.battingTeamId || (
      match.tossWinnerId
        ? (match.tossDecision === 'BAT' ? match.tossWinnerId : (match.tossWinnerId === match.teamAId ? match.teamBId : match.teamAId))
        : match.teamAId
    );
    const inn2BattingTeamId = inn1BattingTeamId === match.teamAId ? match.teamBId : match.teamAId;

    leftTeam = inn1BattingTeamId === match.teamBId ? match.teamB : match.teamA;
    rightTeam = inn2BattingTeamId === match.teamBId ? match.teamB : match.teamA;

    leftTeamInnings = inn1 || match.innings?.find((i: any) => i.battingTeamId === leftTeam?.id && i.inningsNumber === 1);
    rightTeamInnings = inn2 || match.innings?.find((i: any) => i.battingTeamId === rightTeam?.id && i.inningsNumber === 2);

    if (match.status === 'LIVE' && currentInnings) {
      isLeftBattingCurrent = currentInnings.battingTeamId === leftTeam?.id;
      isRightBattingCurrent = currentInnings.battingTeamId === rightTeam?.id;
    }
  }

  return (
    <main style={{ paddingTop: '86px', paddingBottom: 'var(--space-3xl)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--space-md)' }}>
        
        {/* Navigation Breadcrumbs & Live Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          gap: '10px',
          flexWrap: 'wrap',
        }}>
          <Link
            href="/"
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-body)',
              transition: 'color 0.2s',
            }}
          >
            ← Back to Tournament Home
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: match.status === 'LIVE' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-data)',
              }}
            >
              {match.status === 'LIVE' && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    display: 'inline-block',
                    animation: 'pulseDot 1.4s ease-in-out infinite',
                  }}
                />
              )}
              {match.status}
            </span>

            {match.status === 'LIVE' && isFreeHit && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#000000',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
                  fontFamily: 'var(--font-data)',
                }}
              >
                ⚡ Free Hit
              </span>
            )}

            {lastLivePing && (
              <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'var(--font-data)' }}>
                Live: {lastLivePing}
              </span>
            )}

            <button
              onClick={() => fetchScorecard(true)}
              disabled={isRefreshing}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'var(--color-paper)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ display: 'inline-block', transform: isRefreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.4s' }}>
                ↻
              </span>
              Refresh
            </button>
          </div>
        </div>

        {/* MATCH HERO SCOREBOARD CARD (100% Matching LiveScoreWidget Theme) */}
        <div
          style={{
            background: 'var(--color-paper-dark)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border-dark)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            color: 'var(--color-paper)',
            marginBottom: '18px',
          }}
        >
          {/* Header Strip */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
              fontSize: '0.82rem',
              color: 'rgba(255, 255, 255, 0.7)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-paper)' }}>{match.tournament?.name || 'CPL 2026'}</span>
              <span>•</span>
              <span>{match.venue || 'Main Stadium'}</span>
              <span>•</span>
              <span>{match.oversPerInnings} Overs {match.ballsPerOver ? `(${match.ballsPerOver}b/ov)` : ''}</span>
            </div>

            {match.tossWinner && (
              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                Toss: {match.tossWinner.name} chose to {match.tossDecision?.toLowerCase() || 'bat'}
              </div>
            )}
          </div>

          {/* Unified Scoreboard Layout (Desktop 3-Column / Mobile Google Cricket Stacked) */}
          <div style={{ padding: '16px' }}>
            {/* Desktop View (>= 768px) */}
            <div className="scorecard-desktop-view">
              <div className="scorecard-match-header-grid">
                {/* Left Team (Batting 1st - Google Cricket Standard) */}
                <div className="scorecard-team-a-box">
                  {leftTeam?.logoUrl ? (
                    <img
                      src={leftTeam.logoUrl}
                      alt={leftTeam.name}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1.5px solid rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        flexShrink: 0,
                      }}
                    >
                      🏏
                    </div>
                  )}
                  <div>
                    <div className="scorecard-team-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-paper)', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{leftTeam?.name}</span>
                      {isLeftBattingCurrent && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid #EF4444',
                            color: '#FCA5A5',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            fontFamily: 'var(--font-data)',
                          }}
                        >
                          🏏 BATTING
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                      {leftTeam?.shortName}
                    </div>
                    {leftTeamInnings ? (
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 700, marginTop: '2px' }}>
                        {leftTeamInnings.runs}/{leftTeamInnings.wickets} ({leftTeamInnings.overs}.{leftTeamInnings.balls} ov)
                      </div>
                    ) : !isPreMatch ? (
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '2px' }}>
                        Yet to bat
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Score in Center */}
                <div className="scorecard-center-score-box">
                  {currentInnings && match.status === 'LIVE' ? (
                    <div>
                      <div
                        className="scorecard-main-score"
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: '2.2rem',
                          fontWeight: 900,
                          color: 'var(--color-gold)',
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                          marginBottom: '4px',
                        }}
                      >
                        {currentInnings.runs} / {currentInnings.wickets}
                      </div>
                      <div className="scorecard-overs-text" style={{ fontFamily: 'var(--font-data)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-paper)', whiteSpace: 'nowrap' }}>
                        {currentInnings.overs}.{currentInnings.balls} / {match.oversPerInnings} Overs
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        CRR: {getRunRate(currentInnings.runs, currentInnings.overs, currentInnings.balls)} {requiredRunRate !== '0.00' ? `• RRR: ${requiredRunRate}` : ''}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.5)' }}>
                      {match.status === 'UPCOMING' ? 'NOT STARTED' : match.status}
                    </div>
                  )}
                </div>

                {/* Right Team (Batting 2nd - Google Cricket Standard) */}
                <div className="scorecard-team-b-box">
                  <div>
                    <div className="scorecard-team-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-paper)', lineHeight: 1.1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      {isRightBattingCurrent && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid #EF4444',
                            color: '#FCA5A5',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            fontFamily: 'var(--font-data)',
                          }}
                        >
                          🏏 BATTING
                        </span>
                      )}
                      <span>{rightTeam?.name}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                      {rightTeam?.shortName}
                    </div>
                    {rightTeamInnings ? (
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 700, marginTop: '2px' }}>
                        {rightTeamInnings.runs}/{rightTeamInnings.wickets} ({rightTeamInnings.overs}.{rightTeamInnings.balls} ov)
                      </div>
                    ) : !isPreMatch ? (
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '2px' }}>
                        Yet to bat
                      </div>
                    ) : null}
                  </div>
                  {rightTeam?.logoUrl ? (
                    <img
                      src={rightTeam.logoUrl}
                      alt={rightTeam.name}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1.5px solid rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        flexShrink: 0,
                      }}
                    >
                      🦁
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile View (< 768px): Google Cricket Standard Side-by-Side Dual Team View */}
            <div className="scorecard-mobile-view">
              <div className="scorecard-mobile-dual-grid">
                {/* Left Team Card (Batting 1st) */}
                <div className={`scorecard-mobile-team-card left ${isLeftBattingCurrent ? 'is-batting' : ''}`}>
                  <div className="scorecard-mobile-card-header">
                    {leftTeam?.logoUrl ? (
                      <img src={leftTeam.logoUrl} alt={leftTeam.name} className="scorecard-mobile-logo" />
                    ) : (
                      <div className="scorecard-mobile-logo-placeholder">🏏</div>
                    )}
                    <div className="scorecard-mobile-card-names">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <span className="scorecard-mobile-card-title">{leftTeam?.name || 'Team 1'}</span>
                      </div>
                      {isLeftBattingCurrent && <span className="scorecard-mobile-batting-badge">🏏 BATTING</span>}
                      <span className="scorecard-mobile-shortname">{leftTeam?.shortName}</span>
                    </div>
                  </div>

                  <div className="scorecard-mobile-card-scores left">
                    {leftTeamInnings ? (
                      <>
                        <span className="scorecard-mobile-big-score">{leftTeamInnings.runs}/{leftTeamInnings.wickets}</span>
                        <span className="scorecard-mobile-overs-tag">({leftTeamInnings.overs}.{leftTeamInnings.balls} ov)</span>
                      </>
                    ) : isLeftBattingCurrent && currentInnings ? (
                      <>
                        <span className="scorecard-mobile-big-score">{currentInnings.runs}/{currentInnings.wickets}</span>
                        <span className="scorecard-mobile-overs-tag">({currentInnings.overs}.{currentInnings.balls} ov)</span>
                      </>
                    ) : (
                      <span className="scorecard-mobile-yet-text">{isPreMatch ? leftTeam?.shortName : 'Yet to bat'}</span>
                    )}
                  </div>
                </div>

                {/* Center Divider / VS Badge */}
                <div className="scorecard-mobile-vs-divider">
                  <span className="scorecard-mobile-vs-badge">VS</span>
                </div>

                {/* Right Team Card (Batting 2nd) */}
                <div className={`scorecard-mobile-team-card right ${isRightBattingCurrent ? 'is-batting' : ''}`}>
                  <div className="scorecard-mobile-card-header right">
                    {rightTeam?.logoUrl ? (
                      <img src={rightTeam.logoUrl} alt={rightTeam.name} className="scorecard-mobile-logo" />
                    ) : (
                      <div className="scorecard-mobile-logo-placeholder">🦁</div>
                    )}
                    <div className="scorecard-mobile-card-names right">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexWrap: 'wrap' }}>
                        <span className="scorecard-mobile-card-title">{rightTeam?.name || 'Team 2'}</span>
                      </div>
                      {isRightBattingCurrent && <span className="scorecard-mobile-batting-badge">🏏 BATTING</span>}
                      <span className="scorecard-mobile-shortname">{rightTeam?.shortName}</span>
                    </div>
                  </div>

                  <div className="scorecard-mobile-card-scores right">
                    {rightTeamInnings ? (
                      <>
                        <span className="scorecard-mobile-big-score">{rightTeamInnings.runs}/{rightTeamInnings.wickets}</span>
                        <span className="scorecard-mobile-overs-tag">({rightTeamInnings.overs}.{rightTeamInnings.balls} ov)</span>
                      </>
                    ) : isRightBattingCurrent && currentInnings ? (
                      <>
                        <span className="scorecard-mobile-big-score">{currentInnings.runs}/{currentInnings.wickets}</span>
                        <span className="scorecard-mobile-overs-tag">({currentInnings.overs}.{currentInnings.balls} ov)</span>
                      </>
                    ) : (
                      <span className="scorecard-mobile-yet-text">{isPreMatch ? rightTeam?.shortName : 'Yet to bat'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Match Status & Equation Strip */}
              <div className="scorecard-mobile-status-strip">
                <div className="scorecard-mobile-status-live">
                  {match.status === 'LIVE' ? (
                    <>
                      <span className="dot" />
                      <span>INNINGS {match.currentInnings} • {currentInnings?.overs}.{currentInnings?.balls}/{match.oversPerInnings} OV</span>
                    </>
                  ) : (
                    <span>{match.status === 'UPCOMING' ? 'UPCOMING FIXTURE' : match.status}</span>
                  )}
                </div>
                {currentInnings && (
                  <div className="scorecard-mobile-rates">
                    CRR: {getRunRate(currentInnings.runs, currentInnings.overs, currentInnings.balls)} {requiredRunRate !== '0.00' ? `• RRR: ${requiredRunRate}` : ''}
                  </div>
                )}
              </div>
            </div>


            {/* Chase Equation Banner (Innings 2 or Super Over 2) */}
            {isChaseInnings && runsNeeded > 0 && (
              <div
                style={{
                  marginTop: '14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--color-border-dark)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-pill)',
                      background: currentInnings.inningsNumber >= 3 ? '#F59E0B' : 'var(--color-accent)',
                      color: currentInnings.inningsNumber >= 3 ? '#000000' : '#FFFFFF',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-data)',
                    }}
                  >
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: currentInnings.inningsNumber >= 3 ? '#000000' : '#FFFFFF',
                        display: 'inline-block',
                        animation: 'pulseDot 1.4s ease-in-out infinite',
                      }}
                    />
                    {currentInnings.inningsNumber >= 3 ? '⚡ SUPER OVER CHASE' : 'CHASE'}
                  </span>

                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-paper)' }}>
                    {chaseBattingTeamName} NEED <span style={{ color: 'var(--color-gold)' }}>{runsNeeded} RUNS</span> IN <span style={{ color: 'var(--color-gold)' }}>{ballsRemaining} BALLS</span>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-data)', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  <span>TARGET: <strong style={{ color: 'var(--color-paper)' }}>{targetRuns}</strong></span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                  <span>RRR: <strong style={{ color: 'var(--color-gold)' }}>{requiredRunRate}</strong></span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                  <span>CRR: <strong style={{ color: 'var(--color-paper)' }}>{getRunRate(currentInnings.runs, currentInnings.overs, currentInnings.balls)}</strong></span>
                </div>
              </div>
            )}

            {/* Match Result Note */}
            {match.resultNote && (
              <div style={{
                marginTop: '12px',
                background: 'rgba(192, 39, 45, 0.15)',
                border: '1px solid var(--color-accent)',
                color: 'var(--color-paper)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                textAlign: 'center',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
              }}>
                🏆 {match.resultNote}
              </div>
            )}
          </div>
        </div>

        {/* GOOGLE CRICKET STYLE COMPLETED MATCH SUMMARY CARD */}
        {match.status === 'COMPLETED' && (() => {
          const teamAId = match.teamA.id;
          const teamBId = match.teamB.id;

          const teamAReg = allInnings.find((i: any) => i.battingTeamId === teamAId && i.inningsNumber <= 2);
          const teamASO = allInnings.find((i: any) => i.battingTeamId === teamAId && i.inningsNumber >= 3);

          const teamBReg = allInnings.find((i: any) => i.battingTeamId === teamBId && i.inningsNumber <= 2);
          const teamBSO = allInnings.find((i: any) => i.battingTeamId === teamBId && i.inningsNumber >= 3);

          let teamAScoreText = teamAReg ? `${teamAReg.runs}/${teamAReg.wickets}` : '-';
          let teamAOversText = teamAReg ? `(${teamAReg.overs}${teamAReg.balls > 0 ? `.${teamAReg.balls}` : ''})` : '';
          if (teamASO) {
            teamAScoreText += ` & ${teamASO.runs}/${teamASO.wickets}`;
            teamAOversText += ` & (${teamASO.overs}.${teamASO.balls})`;
          }

          let teamBScoreText = teamBReg ? `${teamBReg.runs}/${teamBReg.wickets}` : '-';
          let teamBOversText = teamBReg ? `(${teamBReg.overs}${teamBReg.balls > 0 ? `.${teamBReg.balls}` : ''})` : '';
          if (teamBSO) {
            teamBScoreText += ` & ${teamBSO.runs}/${teamBSO.wickets}`;
            teamBOversText += ` & (${teamBSO.overs}.${teamBSO.balls})`;
          }

          return (
            <div
              style={{
                background: '#18191B',
                border: '1.5px solid #2A2B2E',
                borderRadius: '12px',
                padding: '24px 20px',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              {/* Header Tournament & Match Meta */}
              <div style={{ fontSize: '0.86rem', color: '#9E9EA7', fontWeight: 500, marginBottom: '22px' }}>
                2026 Computing Premier League • {match.venue || 'Ratmalana Ground'}
              </div>

              {/* Teams & Scores Grid */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  maxWidth: '600px',
                  margin: '0 auto 20px',
                  gap: '24px',
                }}
              >
                {/* Team A */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {match.teamA.logoUrl ? (
                    <img
                      src={match.teamA.logoUrl}
                      alt={match.teamA.name}
                      style={{
                        width: '60px',
                        height: '46px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                        border: '1.5px solid #3C4043',
                        marginBottom: '10px',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '60px',
                        height: '46px',
                        borderRadius: '6px',
                        background: '#202124',
                        border: '1.5px solid #3C4043',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        marginBottom: '10px',
                      }}
                    >
                      🏏
                    </div>
                  )}

                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontFamily: 'var(--font-data, sans-serif)', fontSize: '1.75rem', fontWeight: 800, color: '#E8EAED', lineHeight: 1.1 }}>
                      {teamAScoreText}
                    </div>
                    {teamAOversText && (
                      <div style={{ fontSize: '0.9rem', color: '#9E9EA7', marginTop: '2px', fontWeight: 500 }}>
                        {teamAOversText}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#E8EAED' }}>
                    {match.teamA.name}
                  </div>
                </div>

                {/* Team B */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {match.teamB.logoUrl ? (
                    <img
                      src={match.teamB.logoUrl}
                      alt={match.teamB.name}
                      style={{
                        width: '60px',
                        height: '46px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                        border: '1.5px solid #3C4043',
                        marginBottom: '10px',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '60px',
                        height: '46px',
                        borderRadius: '6px',
                        background: '#202124',
                        border: '1.5px solid #3C4043',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        marginBottom: '10px',
                      }}
                    >
                      🦁
                    </div>
                  )}

                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontFamily: 'var(--font-data, sans-serif)', fontSize: '1.75rem', fontWeight: 800, color: '#E8EAED', lineHeight: 1.1 }}>
                      {teamBScoreText}
                    </div>
                    {teamBOversText && (
                      <div style={{ fontSize: '0.9rem', color: '#9E9EA7', marginTop: '2px', fontWeight: 500 }}>
                        {teamBOversText}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#E8EAED' }}>
                    {match.teamB.name}
                  </div>
                </div>
              </div>

              {/* Match Result Line */}
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#8AB4F8', marginBottom: '4px' }}>
                {match.resultNote || 'Match Completed'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#9E9EA7' }}>
                Match Finished
              </div>
            </div>
          );
        })()}

        {/* SUPER OVER ACTIVE ALERT BANNER */}
        {match.status === 'LIVE' && match.currentInnings >= 3 && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
              border: '1.5px solid #F59E0B',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>⚡</span>
              <div>
                <strong style={{ color: '#FBBF24', fontSize: '0.92rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                  Super Over In Progress ({match.currentInnings === 3 ? 'Super Over 1' : 'Super Over 2'})
                </strong>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.75)' }}>
                  Viewing real-time ball-by-ball tie-breaker updates.
                </div>
              </div>
            </div>
            {activeTab !== `inn${match.currentInnings}` && (
              <button
                type="button"
                onClick={() => setActiveTab(`inn${match.currentInnings}`)}
                style={{
                  background: '#F59E0B',
                  color: '#000000',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Switch to Live Super Over →
              </button>
            )}
          </div>
        )}

        {/* 1. LIVE EQUATION TICKER & BOUNDARY COUNTER */}
        <div style={{ marginBottom: '18px' }}>
          <LiveEquationTicker match={match} ballsPerOver={ballsPerOver} />
        </div>

        {/* 2. VIEW SELECTOR TABS */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '5px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            gap: '6px',
            marginBottom: '18px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setViewMode('SCORECARD')}
            style={{
              flex: '1 1 auto',
              minHeight: '40px',
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              background: viewMode === 'SCORECARD' ? 'var(--color-accent, #C0272D)' : 'transparent',
              color: viewMode === 'SCORECARD' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontWeight: 800,
              fontSize: '0.85rem',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>📋</span> Full Scorecard
          </button>

          <button
            onClick={() => setViewMode('WORM')}
            style={{
              flex: '1 1 auto',
              minHeight: '40px',
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              background: viewMode === 'WORM' ? 'var(--color-accent, #C0272D)' : 'transparent',
              color: viewMode === 'WORM' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontWeight: 800,
              fontSize: '0.85rem',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>📈</span> Match Worm & Graph
          </button>

          <button
            onClick={() => setViewMode('COMMENTARY')}
            style={{
              flex: '1 1 auto',
              minHeight: '40px',
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              background: viewMode === 'COMMENTARY' ? 'var(--color-accent, #C0272D)' : 'transparent',
              color: viewMode === 'COMMENTARY' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
              fontWeight: 800,
              fontSize: '0.85rem',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🎙️</span> Ball-by-Ball Timeline
          </button>
        </div>

        {/* VIEW 1: MATCH WORM & GRAPH */}
        {viewMode === 'WORM' && (
          <div style={{ marginBottom: '24px' }}>
            <MatchWormChart match={match} ballsPerOver={ballsPerOver} />
          </div>
        )}

        {/* VIEW 2: BALL-BY-BALL COMMENTARY */}
        {viewMode === 'COMMENTARY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {/* Innings selector inside commentary */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {allInnings.map((inn: any) => {
                const isSelected = activeTab ? activeTab === `inn${inn.inningsNumber}` : inn.id === selectedInnings?.id;
                const label = inn.inningsNumber === 1 ? '1st Inn' : inn.inningsNumber === 2 ? '2nd Inn' : `Super Over ${inn.inningsNumber - 2}`;
                return (
                  <button
                    key={`comm-${inn.id}`}
                    onClick={() => setActiveTab(`inn${inn.inningsNumber}`)}
                    style={{
                      padding: '7px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid var(--color-gold, #F59E0B)' : '1px solid rgba(255,255,255,0.15)',
                      background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                      color: isSelected ? '#F59E0B' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {label}: {inn.battingTeam?.shortName || 'BAT'} ({inn.runs}/{inn.wickets})
                  </button>
                );
              })}
            </div>

            <BallTimelineFilter innings={selectedInnings} ballsPerOver={ballsPerOver} match={match} />
          </div>
        )}

        {/* VIEW 3: FULL SCORECARD */}
        {viewMode === 'SCORECARD' && (
          <>
            {/* INNINGS SELECTOR TABS */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              {allInnings.map((inn: any) => {
                const isSelected = activeTab ? activeTab === `inn${inn.inningsNumber}` : inn.id === selectedInnings?.id;
                const isSuperOver = inn.inningsNumber >= 3;
                const label = inn.inningsNumber === 1 ? '1st Inn' : inn.inningsNumber === 2 ? '2nd Inn' : inn.inningsNumber === 3 ? '⚡ Super Over 1' : `⚡ Super Over ${inn.inningsNumber - 2}`;
                return (
                  <button
                    key={inn.id}
                    onClick={() => setActiveTab(`inn${inn.inningsNumber}`)}
                    style={{
                      flex: '1 1 auto',
                      minWidth: '130px',
                      minHeight: '38px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                      borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      background: isSelected ? (isSuperOver ? '#F59E0B' : 'var(--color-accent)') : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? (isSuperOver ? '#000000' : 'var(--color-accent-ink)') : 'rgba(255, 255, 255, 0.75)',
                      border: isSelected ? (isSuperOver ? '1.5px solid #FBBF24' : '1.5px solid var(--color-accent-bright)') : '1.5px solid rgba(255, 255, 255, 0.15)',
                      boxShadow: isSelected ? (isSuperOver ? '0 4px 14px rgba(245, 158, 11, 0.35)' : '0 4px 14px rgba(192, 39, 45, 0.35)') : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{label}:</span>
                    <span style={{ fontFamily: 'var(--font-data)', fontWeight: 700 }}>
                      {inn.battingTeam?.shortName || 'BAT'} ({inn.runs}/{inn.wickets} in {inn.overs}.{inn.balls} ov)
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ACTIVE INNINGS SCORECARD DETAILS */}
            {selectedInnings ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* THIS OVER BREAKDOWN CARD */}
            {(() => {
              const allBalls = selectedInnings.ballEvents || [];
              const isFinishedInnings = selectedInnings.status === 'COMPLETED' || (match.status === 'COMPLETED' && selectedInnings.id === currentInnings.id);
              
              let overToShow = selectedInnings.overs ?? 0;
              const hasBallsInCurrent = allBalls.some((b: any) => b.overNumber === overToShow);
              
              if (isFinishedInnings || (!hasBallsInCurrent && selectedInnings.overs > 0 && selectedInnings.balls === 0)) {
                overToShow = Math.max(0, (selectedInnings.overs || 1) - 1);
              }

              const currentOverDeliveries = [...allBalls.filter((b: any) => b.overNumber === overToShow)].reverse();
              const currentOverRuns = currentOverDeliveries.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0);
              const legalBallsInCurrentOver = currentOverDeliveries.filter((b: any) => b.isLegal).length;
              const remainingSlots = isFinishedInnings ? 0 : Math.max(0, ballsPerOver - legalBallsInCurrentOver);
              const overTitle = isFinishedInnings
                ? `🏏 FINAL OVER (Over ${overToShow + 1})`
                : (!hasBallsInCurrent && selectedInnings.overs > 0 && selectedInnings.balls === 0)
                ? `🏏 LAST COMPLETED OVER (Over ${overToShow + 1})`
                : `🏏 THIS OVER (Over ${overToShow + 1})`;

              return (
                <div
                  style={{
                    background: 'var(--color-paper-dark)',
                    border: '1.5px solid var(--color-border-dark)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                        {overTitle}
                      </span>
                      {selectedInnings.currentBowler && (
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                          • Bowler: <strong>{selectedInnings.currentBowler.name}</strong>
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-gold)', fontFamily: 'var(--font-data)' }}>
                      {currentOverRuns} {currentOverRuns === 1 ? 'Run' : 'Runs'} in Over
                    </div>
                  </div>

                  {/* Delivery ball circles */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {currentOverDeliveries.length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                        Over starting...
                      </span>
                    ) : (
                      currentOverDeliveries.map((b: any, idx: number) => {
                        const style = getBallStyle(b);
                        return (
                          <div key={b.id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                            <span
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: style.bg,
                                color: style.color,
                                fontSize: '0.78rem',
                                fontWeight: 900,
                                fontFamily: 'var(--font-data)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              }}
                            >
                              {style.label}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, fontFamily: 'var(--font-data)' }}>
                              .{b.isLegal ? b.ballNumber || idx + 1 : 'ext'}
                            </span>
                          </div>
                        );
                      })
                    )}

                    {/* Dotted placeholders for remaining legal balls */}
                    {Array.from({ length: remainingSlots }).map((_, sIdx) => (
                      <div key={`slot-${sIdx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.02)',
                            color: 'rgba(255, 255, 255, 0.25)',
                            border: '1.5px dashed rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                          }}
                        >
                          ○
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.25)', fontWeight: 600, fontFamily: 'var(--font-data)' }}>
                          .{legalBallsInCurrentOver + sIdx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* BATTING SCORECARD CARD */}
            <div
              style={{
                background: 'var(--color-paper-dark)',
                border: '1.5px solid var(--color-border-dark)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontWeight: 800, color: 'var(--color-paper)', fontFamily: 'var(--font-display)', fontSize: '1.1rem', textTransform: 'uppercase' }}>
                  Batting: {selectedInnings.battingTeam?.name}
                </span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-gold)' }}>
                  {selectedInnings.runs} / {selectedInnings.wickets} ({selectedInnings.overs}.{selectedInnings.balls} Ov)
                </span>
              </div>

              <div className="table-responsive-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 14px', width: '40%' }}>Batter</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>R</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>B</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>4s</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>6s</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const battingList = (selectedInnings.battingScores || []).filter((b: any) => {
                        const isCurrent = b.playerId === selectedInnings.currentStrikerId || b.playerId === selectedInnings.currentNonStrikerId;
                        const hasParticipated = (b.balls > 0 || b.runs > 0 || b.isOut);
                        return isCurrent || hasParticipated;
                      });

                      if (battingList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                              Innings has not commenced or no batting entries yet.
                            </td>
                          </tr>
                        );
                      }

                      return battingList.map((b: any) => {
                        const isStriker = b.playerId === selectedInnings.currentStrikerId;
                        const isNonStriker = b.playerId === selectedInnings.currentNonStrikerId;
                        const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';

                        return (
                          <tr
                            key={b.id}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              background: isStriker || isNonStriker ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, color: isStriker ? 'var(--color-gold)' : 'var(--color-paper)', fontFamily: 'var(--font-body)', fontSize: '0.88rem' }}>
                                  {b.player?.name || 'Player'}
                                </span>
                                {isStriker && (
                                  <span style={{ color: 'var(--color-gold)', fontWeight: 900, fontSize: '0.8rem' }}>*</span>
                                )}
                              </div>
                              <div style={{ color: b.isOut ? 'rgba(255, 255, 255, 0.5)' : '#34D399', fontSize: '0.72rem', marginTop: '2px', fontFamily: 'var(--font-body)' }}>
                                {b.isOut ? (b.dismissal || 'Out') : 'not out'}
                              </div>
                            </td>

                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-paper)', fontFamily: 'var(--font-data)' }}>
                              {b.runs}
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'var(--font-data)' }}>
                              {b.balls}
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'var(--font-data)' }}>
                              {b.fours || 0}
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'var(--font-data)' }}>
                              {b.sixes || 0}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'var(--font-data)', fontWeight: 600 }}>
                              {sr}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Total & Run Rate Footer Row */}
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'var(--font-body)' }}>
                  Total (CRR: {getRunRate(selectedInnings.runs, selectedInnings.overs, selectedInnings.balls)})
                </span>
                <span style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-data)' }}>
                  {selectedInnings.runs} / {selectedInnings.wickets} ({selectedInnings.overs}.{selectedInnings.balls} Overs)
                </span>
              </div>
            </div>

            {/* BOWLING SCORECARD CARD */}
            <div
              style={{
                background: 'var(--color-paper-dark)',
                border: '1.5px solid var(--color-border-dark)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  fontWeight: 800,
                  color: 'var(--color-paper)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                }}
              >
                Bowling: {selectedInnings.bowlingTeam?.name}
              </div>

              <div className="table-responsive-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 14px', width: '40%' }}>Bowler</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>O</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>M</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>R</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>W</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>ECON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const bowlingList = (selectedInnings.bowlingScores || []).filter((b: any) => {
                        const isCurrent = b.playerId === selectedInnings.currentBowlerId || b.isCurrent;
                        const hasBowled = (b.overs > 0 || b.balls > 0 || b.runsConceded > 0 || b.wickets > 0 || b.wides > 0 || b.noBalls > 0);
                        return isCurrent || hasBowled;
                      });

                      if (bowlingList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                              No bowling entries recorded for this innings yet.
                            </td>
                          </tr>
                        );
                      }

                      return bowlingList.map((b: any) => {
                        const isCurrent = b.playerId === selectedInnings.currentBowlerId || b.isCurrent;
                        const totalOvers = b.overs + (b.balls / ballsPerOver);
                        const econ = totalOvers > 0 ? (b.runsConceded / totalOvers).toFixed(2) : '0.00';

                        return (
                          <tr
                            key={b.id}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              background: isCurrent ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontWeight: 700, color: isCurrent ? 'var(--color-gold)' : 'var(--color-paper)', fontFamily: 'var(--font-body)', fontSize: '0.88rem' }}>
                                {b.player?.name || 'Bowler'}
                              </span>
                              {isCurrent && (
                                <span style={{ color: 'var(--color-gold)', fontWeight: 900, fontSize: '0.8rem', marginLeft: '4px' }}>*</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--color-paper)', fontFamily: 'var(--font-data)' }}>
                              {b.overs}.{b.balls}
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'var(--font-data)' }}>
                              {b.maidens || 0}
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-paper)', fontFamily: 'var(--font-data)' }}>
                              {b.runsConceded || 0}
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-gold)', fontFamily: 'var(--font-data)' }}>
                              {b.wickets || 0}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'var(--font-data)' }}>
                              {econ}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
            This innings has not commenced yet.
          </div>
        )}
          </>
        )}

        {/* 3. HEAD-TO-HEAD BOUNDARY COUNTER (TOURNAMENT TIE-BREAK REGULATIONS AT THE BOTTOM) */}
        <div style={{ marginTop: '24px' }}>
          <HeadToHeadBoundaryCounter match={match} />
        </div>

      </div>
    </main>
  );
}

export default function FullScorecardPage() {
  return (
    <div style={{ background: 'var(--color-paper-dark)', minHeight: '100vh', color: 'var(--color-paper)' }}>
      <Navbar />
      <Suspense fallback={<div style={{ padding: '120px 20px', textAlign: 'center', color: '#FFF' }}>Loading Scorecard...</div>}>
        <ScorecardContent />
      </Suspense>
      <Footer />
    </div>
  );
}
