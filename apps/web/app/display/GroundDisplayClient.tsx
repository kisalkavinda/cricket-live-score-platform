'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ScoreBroadcastPayload } from '@/lib/scoring/scoring-realtime';
import { TournamentOverview } from '@/lib/tournament/tournament-service';
import { normalizeImageUrl } from '@/lib/utils/image-utils';

interface Props {
  initialOverview: TournamentOverview | null;
  initialStats: any | null;
  initialMatches: ScoreBroadcastPayload[];
  initialScorecard: any | null;
}

export default function GroundDisplayClient({
  initialOverview,
  initialStats,
  initialMatches,
  initialScorecard,
}: Props) {
  const [matches, setMatches] = useState<ScoreBroadcastPayload[]>(initialMatches);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(
    initialMatches[0]?.matchId || initialScorecard?.id || null
  );
  const [scorecard, setScorecard] = useState<any | null>(initialScorecard);
  const [activeInningsTab, setActiveInningsTab] = useState<string>('inn1');
  const [overview, setOverview] = useState<TournamentOverview | null>(initialOverview);
  const [stats, setStats] = useState<any | null>(initialStats);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('');

  const inFlightScorecardRef = useRef<boolean>(false);
  const inFlightMatchesRef = useRef<boolean>(false);
  const inFlightStatsRef = useRef<boolean>(false);

  // Live ticking clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('[GroundDisplay] Fullscreen request error:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // 1. Fetch live matches payload
  const fetchLiveMatches = useCallback(async () => {
    if (inFlightMatchesRef.current) return;
    inFlightMatchesRef.current = true;
    try {
      const res = await fetch(`/api/matches/live?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.matches && data.matches.length > 0) {
        setMatches(data.matches);
        setActiveMatchId((prev) => prev || data.matches[0].matchId);
      }
    } catch (err) {
      console.warn('[GroundDisplay] Matches fetch error:', err);
    } finally {
      inFlightMatchesRef.current = false;
    }
  }, []);

  // 2. Fetch scorecard details for active match
  const fetchActiveScorecard = useCallback(async (matchId: string) => {
    if (!matchId || inFlightScorecardRef.current) return;
    inFlightScorecardRef.current = true;
    try {
      const res = await fetch(`/api/matches/${matchId}/scorecard?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.match) {
        setScorecard(data.match);
        setLastSync(new Date().toLocaleTimeString());
        // Default to active innings
        if (data.match.currentInnings) {
          setActiveInningsTab((prev) => prev || `inn${data.match.currentInnings}`);
        }
      }
    } catch (err) {
      console.warn('[GroundDisplay] Scorecard fetch error:', err);
    } finally {
      inFlightScorecardRef.current = false;
    }
  }, []);

  // 3. Fetch tournament stats (Top Batters, Top Bowlers, Overview Standings)
  const fetchTournamentStats = useCallback(async () => {
    if (inFlightStatsRef.current) return;
    inFlightStatsRef.current = true;
    try {
      const res = await fetch(`/api/tournament/stats?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setStats(data);
        if (data.overview) {
          setOverview(data.overview);
        }
      }
    } catch (err) {
      console.warn('[GroundDisplay] Stats fetch error:', err);
    } finally {
      inFlightStatsRef.current = false;
    }
  }, []);

  const activeMatchIdRef = useRef<string | null>(activeMatchId);
  activeMatchIdRef.current = activeMatchId;

  // Auto-refresh loop: every 4 seconds
  useEffect(() => {
    fetchLiveMatches();
    fetchTournamentStats();
    if (activeMatchId) {
      fetchActiveScorecard(activeMatchId);
    }

    const interval = setInterval(() => {
      fetchLiveMatches();
      fetchTournamentStats();
      if (activeMatchIdRef.current) {
        fetchActiveScorecard(activeMatchIdRef.current);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchLiveMatches, fetchActiveScorecard, fetchTournamentStats]);

  // Supabase Realtime subscription for instantaneous ball-by-ball updates
  useEffect(() => {
    let channel: any = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel('realtime:ground_display')
        .on('broadcast', { event: 'score_update' }, (msg: any) => {
          if (msg?.payload) {
            setMatches((prev) => {
              const matchId = msg.payload.matchId;
              const idx = prev.findIndex((m) => m.matchId === matchId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = msg.payload;
                return next;
              }
              return [msg.payload, ...prev];
            });
            if (activeMatchIdRef.current) {
              fetchActiveScorecard(activeMatchIdRef.current);
            }
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('[GroundDisplay] Supabase Realtime channel error:', err);
    }

    return () => {
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [fetchActiveScorecard]);

  // Currently active match payload
  const currentMatch = useMemo(() => {
    return matches.find((m) => m.matchId === activeMatchId) || matches[0] || null;
  }, [matches, activeMatchId]);

  // Current innings of live match
  const currentInnings = currentMatch?.innings;

  // Active scorecard innings data
  const allScorecardInnings = useMemo(() => {
    return [...(scorecard?.innings || [])].sort((a: any, b: any) => a.inningsNumber - b.inningsNumber);
  }, [scorecard]);

  const selectedScorecardInnings = useMemo(() => {
    if (!allScorecardInnings.length) return null;
    const match = allScorecardInnings.find((i: any) => `inn${i.inningsNumber}` === activeInningsTab);
    return match || allScorecardInnings[allScorecardInnings.length - 1];
  }, [allScorecardInnings, activeInningsTab]);

  // Top 3 Batters & Bowlers
  const top3Batters = useMemo(() => {
    return (stats?.topBatters || []).slice(0, 3);
  }, [stats]);

  const top3Bowlers = useMemo(() => {
    return (stats?.topBowlers || []).slice(0, 3);
  }, [stats]);

  // Groups
  const groupA = overview?.groups?.groupA?.standings || (overview as any)?.groupA || [];
  const groupB = overview?.groups?.groupB?.standings || (overview as any)?.groupB || [];

  return (
    <div style={{ padding: '16px 24px', maxWidth: '1800px', margin: '0 auto' }}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. BROADCAST TOP HUD BAR                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px 20px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Brand & Stage Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #C0272D 0%, #7F1D1D 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 0 16px rgba(192, 39, 45, 0.5)',
            }}
          >
            🏏
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#FFF' }}>
                CPL 2026 STADIUM MONITOR
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #EF4444',
                  color: '#FCA5A5',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.4s infinite' }} />
                LIVE
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
              {currentMatch?.match.venue || 'Ratmalana Ground'} • Official Ground Pavilion Screen
            </div>
          </div>
        </div>

        {/* Center: Match Switcher Tabs (if multiple matches) */}
        {matches.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '480px' }}>
            {matches.map((m) => {
              const isSelected = m.matchId === activeMatchId;
              return (
                <button
                  key={m.matchId}
                  onClick={() => {
                    setActiveMatchId(m.matchId);
                    fetchActiveScorecard(m.matchId);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: isSelected ? '1.5px solid #FFB800' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isSelected ? 'rgba(255, 184, 0, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#FFB800' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m.match.teamA.shortName} vs {m.match.teamB.shortName}
                </button>
              );
            })}
          </div>
        )}

        {/* Right Controls: Clock, Sync, Fullscreen & Hub Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Live Clock */}
          <div
            style={{
              fontFamily: 'var(--font-data, monospace)',
              fontSize: '1.15rem',
              fontWeight: 900,
              color: '#FFB800',
              letterSpacing: '0.04em',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 184, 0, 0.3)',
            }}
          >
            🕒 {currentTime || '--:--:--'}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: isFullscreen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: isFullscreen ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isFullscreen ? '#6EE7B7' : '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title="Toggle TV Fullscreen Mode"
          >
            ⛶ {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen TV'}
          </button>

          {/* Back link */}
          <Link
            href="/tournament"
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: 'rgba(192, 39, 45, 0.2)',
              border: '1px solid rgba(192, 39, 45, 0.4)',
              color: '#FCA5A5',
              fontSize: '0.82rem',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🏆 Tournament Hub ↗
          </Link>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SECTION: LIVE MATCH JUMBOTRON SCOREBOARD                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentMatch ? (
        <section
          style={{
            background: 'linear-gradient(135deg, rgba(20, 21, 26, 0.95) 0%, rgba(11, 11, 15, 0.98) 100%)',
            border: '1.5px solid rgba(255, 184, 0, 0.35)',
            borderRadius: '16px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            padding: '24px 32px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle gold highlight aura */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '400px',
              height: '100px',
              background: 'radial-gradient(ellipse, rgba(255, 184, 0, 0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Teams and Giant Center Scoreboard */}
          {(() => {
            const teamA = currentMatch.match.teamA;
            const teamB = currentMatch.match.teamB;
            const isLeftBatting = currentMatch.status === 'LIVE' && currentInnings?.battingTeam?.id === teamA.id;
            const isRightBatting = currentMatch.status === 'LIVE' && currentInnings?.battingTeam?.id === teamB.id;

            const allInnings = currentMatch.allInningsSummary || [];
            const teamAInnings = allInnings.find((i: any) => i.battingTeamId === teamA.id && !i.isSuperOver);
            const teamBInnings = allInnings.find((i: any) => i.battingTeamId === teamB.id && !i.isSuperOver);

            const teamAScore = teamAInnings ? `${teamAInnings.runs}/${teamAInnings.wickets}` : (isLeftBatting ? `${currentInnings?.runs ?? 0}/${currentInnings?.wickets ?? 0}` : '-');
            const teamAOvers = teamAInnings ? `(${teamAInnings.overs}.${teamAInnings.balls} ov)` : (isLeftBatting ? `(${currentInnings?.overs ?? 0}.${currentInnings?.balls ?? 0} ov)` : '');

            const teamBScore = teamBInnings ? `${teamBInnings.runs}/${teamBInnings.wickets}` : (isRightBatting ? `${currentInnings?.runs ?? 0}/${currentInnings?.wickets ?? 0}` : '-');
            const teamBOvers = teamBInnings ? `(${teamBInnings.overs}.${teamBInnings.balls} ov)` : (isRightBatting ? `(${currentInnings?.overs ?? 0}.${currentInnings?.balls ?? 0} ov)` : '');

            return (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: '24px',
                    marginBottom: '20px',
                  }}
                >
                  {/* Left Team: Team A */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    {teamA.logoUrl ? (
                      <img
                        src={teamA.logoUrl}
                        alt={teamA.name}
                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid rgba(255, 255, 255, 0.25)', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}
                      />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                        🏏
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FFF', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                          {teamA.name}
                        </span>
                        {isLeftBatting && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                            🏏 BATTING
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '1.35rem', fontWeight: 800, color: '#FFB800', marginTop: '4px' }}>
                        {teamAScore} <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>{teamAOvers}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Score Jumbotron Box */}
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '14px',
                      padding: '14px 28px',
                      textAlign: 'center',
                      minWidth: '260px',
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      {currentMatch.status === 'LIVE' ? `⚡ INNINGS ${currentMatch.currentInnings}` : currentMatch.status}
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-data, monospace)',
                        fontSize: '3.2rem',
                        fontWeight: 900,
                        color: 'var(--color-gold, #FFB800)',
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        textShadow: '0 0 20px rgba(255, 184, 0, 0.35)',
                      }}
                    >
                      {currentInnings ? `${currentInnings.runs}/${currentInnings.wickets}` : '0/0'}
                    </div>

                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.8)', marginTop: '6px' }}>
                      {currentInnings ? `Overs: ${currentInnings.overs}.${currentInnings.balls}` : '0.0 Overs'}
                      <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.85rem' }}>
                        {' '}/ {currentMatch.match.oversPerInnings || 4} ov
                      </span>
                    </div>
                  </div>

                  {/* Right Team: Team B */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '18px', textAlign: 'right' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                        {isRightBatting && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.25)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                            🏏 BATTING
                          </span>
                        )}
                        <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FFF', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                          {teamB.name}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '1.35rem', fontWeight: 800, color: '#FFB800', marginTop: '4px' }}>
                        {teamBScore} <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>{teamBOvers}</span>
                      </div>
                    </div>

                    {teamB.logoUrl ? (
                      <img
                        src={teamB.logoUrl}
                        alt={teamB.name}
                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid rgba(255, 255, 255, 0.25)', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}
                      />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                        🦁
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Situation / Chase Equation Banner */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.92rem' }}>
                    <span>
                      CRR: <strong style={{ color: '#FFF' }}>{currentMatch.chase?.crr || currentInnings?.crr || '0.00'}</strong>
                    </span>

                    {currentMatch.chase?.isChase && currentMatch.chase?.target ? (
                      <>
                        <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                        <span>
                          Target: <strong style={{ color: '#FFB800' }}>{currentMatch.chase.target}</strong>
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                        <span>
                          RRR: <strong style={{ color: '#FFF' }}>{currentMatch.chase.rrr || '-'}</strong>
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                        <span style={{ color: '#10B981', fontWeight: 800 }}>
                          Need {currentMatch.chase.runsNeeded} runs from {currentMatch.chase.ballsRemaining} balls
                        </span>
                      </>
                    ) : null}
                  </div>

                  {currentMatch.match.resultNote && (
                    <div style={{ color: '#FFB800', fontWeight: 800, fontSize: '0.92rem' }}>
                      📢 {currentMatch.match.resultNote}
                    </div>
                  )}
                </div>

                {/* Active Batters, Bowler & This Over Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {/* Active Batters */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      🏏 Active Batters
                    </div>
                    {currentMatch.status === 'UPCOMING' || (!currentMatch.striker && !currentMatch.nonStriker) ? (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.84rem', fontStyle: 'italic', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⏳</span> Match scheduled • Active batsmen will appear when play commences
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#FFB800' }}>*</span> {currentMatch.striker?.name || 'Striker'}
                          </span>
                          <span style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 800, color: '#FFB800', fontSize: '1rem' }}>
                            {currentMatch.striker?.runs ?? 0}
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                              {' '}({currentMatch.striker?.balls ?? 0}b • {currentMatch.striker?.fours ?? 0}x4, {currentMatch.striker?.sixes ?? 0}x6{currentMatch.striker?.sr ? ` • SR: ${currentMatch.striker.sr}` : ''})
                            </span>
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.92rem', paddingLeft: '12px' }}>
                            {currentMatch.nonStriker?.name || 'Non-Striker'}
                          </span>
                          <span style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.92rem' }}>
                            {currentMatch.nonStriker?.runs ?? 0}
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>
                              {' '}({currentMatch.nonStriker?.balls ?? 0}b • {currentMatch.nonStriker?.fours ?? 0}x4, {currentMatch.nonStriker?.sixes ?? 0}x6)
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Bowler */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      🎯 Current Bowler
                    </div>
                    {currentMatch.status === 'UPCOMING' || !currentMatch.bowler ? (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.84rem', fontStyle: 'italic', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎯</span> Awaiting opening bowler
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1rem' }}>
                            {currentMatch.bowler?.name || 'Bowler'}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                            Bowling this spell {currentMatch.bowler?.econ ? `• Econ: ${currentMatch.bowler.econ}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 900, color: '#A855F7', fontSize: '1.2rem' }}>
                            {currentMatch.bowler?.wickets ?? 0}-{currentMatch.bowler?.runsConceded ?? 0}
                          </div>
                          <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {currentMatch.bowler?.overs ?? '0.0'} ov
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recent Deliveries Strip */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-gold, #FFB800)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        🏏 THIS OVER {currentInnings ? `(Over ${currentInnings.overs + 1})` : ''}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                        Recent Balls
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {currentMatch.recentBalls && currentMatch.recentBalls.length > 0 ? (
                        currentMatch.recentBalls.map((b, idx) => {
                          const runs = Number(b.runs || 0);
                          const extraRuns = Number(b.extras || 0);
                          const displayLabel = b.display || (b.isWicket
                            ? (b.extraType === 'WIDE' ? (runs > 0 ? `WD+${runs}+W` : (extraRuns > 1 ? `WD+${extraRuns - 1}+W` : 'WD+W'))
                              : b.extraType === 'NO_BALL' ? (runs > 0 ? `NB+${runs}+W` : 'NB+W')
                              : (runs > 0 ? `${runs}+W` : 'W'))
                            : (b.extraType === 'WIDE' ? (extraRuns > 1 ? `WD+${extraRuns - 1}` : 'WD')
                              : b.extraType === 'NO_BALL' ? (runs > 0 ? `NB+${runs}` : 'NB')
                              : b.extraType === 'BYE' ? `${extraRuns || 1}B`
                              : b.extraType === 'LEG_BYE' ? `${extraRuns || 1}LB`
                              : `${runs}`));

                          return (
                            <span
                              key={b.id || idx}
                              style={{
                                minWidth: '32px',
                                height: '32px',
                                padding: displayLabel.length > 2 ? '0 6px' : '0',
                                borderRadius: displayLabel.length > 2 ? '16px' : '50%',
                                background: b.isWicket ? '#EF4444' : b.runs === 4 ? '#10B981' : b.runs === 6 ? '#8B5CF6' : b.extraType === 'WIDE' || b.extraType === 'NO_BALL' ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
                                color: b.extraType === 'WIDE' || b.extraType === 'NO_BALL' ? '#000' : '#FFF',
                                fontSize: displayLabel.length > 3 ? '0.68rem' : '0.82rem',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                flexShrink: 0,
                              }}
                            >
                              {displayLabel}
                            </span>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                          Over starting...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      ) : (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '36px',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏏</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFF', margin: '0 0 8px' }}>
            No Live Match Currently in Progress
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '500px', margin: '0 auto' }}>
            The monitor will automatically sync and display the live scoreboard as soon as a match commences.
          </p>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SECTION: SPLIT SCREEN (FULL SCORECARD & TOURNAMENT PULSE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
          gap: '20px',
        }}
      >
        {/* ─────────────────────────────────────────────────────────── */}
        {/* LEFT COLUMN: ACTIVE MATCH FULL SCORECARD                     */}
        {/* ─────────────────────────────────────────────────────────── */}
        <section
          style={{
            background: 'rgba(20, 21, 26, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Header & Inning Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 Match Scorecard
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                Detailed ball-by-ball individual batting and bowling figures
              </span>
            </div>

            {/* Inning Switcher Buttons */}
            {allScorecardInnings.length > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {allScorecardInnings.map((inn: any) => {
                  const isSelected = `inn${inn.inningsNumber}` === activeInningsTab;
                  const label = inn.inningsNumber === 1 ? '1st Inn' : inn.inningsNumber === 2 ? '2nd Inn' : `SO ${inn.inningsNumber - 2}`;
                  return (
                    <button
                      key={inn.id || inn.inningsNumber}
                      onClick={() => setActiveInningsTab(`inn${inn.inningsNumber}`)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: isSelected ? '1.5px solid #FFB800' : '1px solid rgba(255, 255, 255, 0.12)',
                        background: isSelected ? 'rgba(255, 184, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? '#FFB800' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {label}: {inn.battingTeam?.shortName || 'BAT'} ({inn.runs}/{inn.wickets})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Batting Card Table */}
          {selectedScorecardInnings ? (
            <div>
              <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      <th style={{ padding: '8px 10px' }}>BATTER</th>
                      <th style={{ padding: '8px 10px' }}>HOW OUT</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: '#FFB800' }}>R</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>B</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>4s</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>6s</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedScorecardInnings.battingScores || []).length > 0 ? (
                      selectedScorecardInnings.battingScores.map((b: any, idx: number) => {
                        const isNotOut = !b.isOut;
                        return (
                          <tr
                            key={b.id || idx}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              background: isNotOut ? 'rgba(255, 184, 0, 0.03)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontWeight: 800, color: '#FFF' }}>
                              {b.player?.name || 'Batter'} {isNotOut && <span style={{ color: '#FFB800' }}>*</span>}
                            </td>
                            <td style={{ padding: '8px 10px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                              {isNotOut ? (
                                <span style={{ color: '#10B981', fontWeight: 700 }}>not out</span>
                              ) : (
                                b.dismissal || b.dismissalType || 'out'
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', fontWeight: 900, fontSize: '0.95rem', color: '#FFB800' }}>
                              {b.runs ?? 0}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>
                              {b.balls ?? 0}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>
                              {b.fours ?? 0}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>
                              {b.sixes ?? 0}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>
                              {b.strikeRate || (b.balls > 0 ? ((Number(b.runs || 0) / b.balls) * 100).toFixed(1) : '0.0')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)' }}>
                          Innings batting yet to commence.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bowling Card Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      <th style={{ padding: '8px 10px' }}>BOWLER</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>O</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>M</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>R</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: '#A855F7' }}>W</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>ECON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedScorecardInnings.bowlingScores || []).length > 0 ? (
                      selectedScorecardInnings.bowlingScores.map((bw: any, idx: number) => {
                        return (
                          <tr key={bw.id || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 800, color: '#FFF' }}>
                              {bw.player?.name || 'Bowler'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', color: 'rgba(255, 255, 255, 0.8)' }}>
                              {bw.overs}.{bw.balls}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>
                              {bw.maidens}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>
                              {bw.runsConceded}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', fontWeight: 900, color: '#A855F7', fontSize: '0.95rem' }}>
                              {bw.wickets}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', color: 'rgba(255, 255, 255, 0.85)' }}>
                              {bw.economy || (bw.overs > 0 ? (bw.runsConceded / bw.overs).toFixed(2) : '0.00')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)' }}>
                          Bowling data not recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)' }}>
              No detailed scorecard available for this match.
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* RIGHT COLUMN: TOURNAMENT PULSE & GROUP STANDINGS             */}
        {/* ─────────────────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top 3 Batsmen & Top 3 Bowlers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Top 3 Batters */}
            <div
              style={{
                background: 'rgba(20, 21, 26, 0.85)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '14px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#FFB800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👑 Top 3 Run Scorers
                </span>
                <span style={{ fontSize: '0.68rem', color: '#FBBF24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                  ORANGE CAP
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {top3Batters.length > 0 ? (
                  top3Batters.map((b: any, idx: number) => {
                    const crowns = ['👑', '🥈', '🥉'];
                    return (
                      <div
                        key={b.playerId || idx}
                        style={{
                          background: idx === 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                          border: idx === 0 ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.9rem' }}>{crowns[idx]}</span>
                          <div>
                            <div style={{ fontWeight: 800, color: '#FFF', fontSize: '0.84rem' }}>
                              {b.playerName || b.name || 'Batter'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                              {b.teamShortName || b.teamName} • HS: {b.highestScore || '-'} • SR: {b.strikeRate ?? '0.0'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 900, color: '#FFB800', fontSize: '1rem' }}>
                            {b.totalRuns ?? b.runs ?? 0}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                            RUNS
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.78rem' }}>
                    No stats accumulated yet.
                  </div>
                )}
              </div>
            </div>

            {/* Top 3 Bowlers */}
            <div
              style={{
                background: 'rgba(20, 21, 26, 0.85)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '14px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#C084FC', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎯 Top 3 Wicket Takers
                </span>
                <span style={{ fontSize: '0.68rem', color: '#C084FC', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                  PURPLE CAP
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {top3Bowlers.length > 0 ? (
                  top3Bowlers.map((bw: any, idx: number) => {
                    const crowns = ['👑', '🥈', '🥉'];
                    return (
                      <div
                        key={bw.playerId || idx}
                        style={{
                          background: idx === 0 ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                          border: idx === 0 ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.9rem' }}>{crowns[idx]}</span>
                          <div>
                            <div style={{ fontWeight: 800, color: '#FFF', fontSize: '0.84rem' }}>
                              {bw.playerName}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                              {bw.teamShortName} • Best: {bw.bestBowling || '-'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 900, color: '#A855F7', fontSize: '1rem' }}>
                            {bw.wickets}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                            WKTS
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.78rem' }}>
                    No stats accumulated yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group Stages Standings Tables (Group A & Group B side-by-side) */}
          <div
            style={{
              background: 'rgba(20, 21, 26, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Group Stage Points Table
              </span>
              <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 800 }}>
                ● TOP 2 ADVANCE TO PLAYOFFS
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Group A */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FFB800', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  GROUP A
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '6px 8px' }}>POS</th>
                      <th style={{ padding: '6px 8px' }}>TEAM</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>P</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>W</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>L</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', color: '#FFB800' }}>PTS</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>NRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupA.length > 0 ? (
                      groupA.map((t: any) => {
                        const groupAMatches = overview?.groups?.groupA?.matches || [];
                        const groupACompleted = groupAMatches.filter((m: any) => m.status === 'COMPLETED').length;
                        const isGroupADone = groupACompleted >= 4 || (groupA.length === 4 && groupA.every((x: any) => Number(x.played || 0) >= 2));
                        const isQualifying = isGroupADone && t.rank <= 2;
                        const logo = normalizeImageUrl(t.logoUrl || t.teamLogoUrl);

                        return (
                          <tr
                            key={t.teamId}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              background: isQualifying ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '6px 8px', fontWeight: 800, color: isQualifying ? '#10B981' : t.rank === 1 ? '#FFB800' : 'rgba(255,255,255,0.7)' }}>
                              #{t.rank}
                            </td>
                            <td style={{ padding: '6px 8px', fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt={t.shortName || t.name}
                                    referrerPolicy="no-referrer"
                                    style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.12)' }}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                      const fallback = (e.currentTarget.parentElement as HTMLElement)?.querySelector('.gda-fallback');
                                      if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="gda-fallback"
                                  style={{
                                    display: logo ? 'none' : 'flex',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 184, 0, 0.15)',
                                    border: '1px solid rgba(255, 184, 0, 0.3)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.58rem',
                                    fontWeight: 900,
                                    color: '#FFB800',
                                    flexShrink: 0,
                                  }}
                                >
                                  {(t.shortName || t.name || 'T').slice(0, 2).toUpperCase()}
                                </div>
                                <span>{t.shortName || t.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>
                              {t.played}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#10B981', fontWeight: 700 }}>
                              {t.won}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#EF4444', fontWeight: 700 }}>
                              {t.lost}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', fontWeight: 900, color: '#FFB800' }}>
                              {t.points}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', color: t.nrr >= 0 ? '#10B981' : '#EF4444' }}>
                              {t.nrr > 0 ? `+${t.nrr.toFixed(3)}` : t.nrr.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                          No standings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Group B */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#60A5FA', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  GROUP B
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '6px 8px' }}>POS</th>
                      <th style={{ padding: '6px 8px' }}>TEAM</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>P</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>W</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>L</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', color: '#FFB800' }}>PTS</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>NRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupB.length > 0 ? (
                      groupB.map((t: any) => {
                        const groupBMatches = overview?.groups?.groupB?.matches || [];
                        const groupBCompleted = groupBMatches.filter((m: any) => m.status === 'COMPLETED').length;
                        const isGroupBDone = groupBCompleted >= 4 || (groupB.length === 4 && groupB.every((x: any) => Number(x.played || 0) >= 2));
                        const isQualifying = isGroupBDone && t.rank <= 2;
                        const logo = normalizeImageUrl(t.logoUrl || t.teamLogoUrl);

                        return (
                          <tr
                            key={t.teamId}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              background: isQualifying ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '6px 8px', fontWeight: 800, color: isQualifying ? '#10B981' : t.rank === 1 ? '#FFB800' : 'rgba(255,255,255,0.7)' }}>
                              #{t.rank}
                            </td>
                            <td style={{ padding: '6px 8px', fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt={t.shortName || t.name}
                                    referrerPolicy="no-referrer"
                                    style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.12)' }}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                      const fallback = (e.currentTarget.parentElement as HTMLElement)?.querySelector('.gdb-fallback');
                                      if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="gdb-fallback"
                                  style={{
                                    display: logo ? 'none' : 'flex',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 184, 0, 0.15)',
                                    border: '1px solid rgba(255, 184, 0, 0.3)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.58rem',
                                    fontWeight: 900,
                                    color: '#FFB800',
                                    flexShrink: 0,
                                  }}
                                >
                                  {(t.shortName || t.name || 'T').slice(0, 2).toUpperCase()}
                                </div>
                                <span>{t.shortName || t.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>
                              {t.played}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#10B981', fontWeight: 700 }}>
                              {t.won}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#EF4444', fontWeight: 700 }}>
                              {t.lost}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', fontWeight: 900, color: '#FFB800' }}>
                              {t.points}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', color: t.nrr >= 0 ? '#10B981' : '#EF4444' }}>
                              {t.nrr > 0 ? `+${t.nrr.toFixed(3)}` : t.nrr.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                          No standings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer monitor status strip */}
      <footer
        style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.4)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '12px',
        }}
      >
        <span>
          🟢 Ground Monitor Active • Real-time Sync via Supabase Realtime • Last sync: {lastSync || 'Active'}
        </span>
        <span>
          2026 Computing Premier League • Ratmalana Ground Official Display
        </span>
      </footer>
    </div>
  );
}
