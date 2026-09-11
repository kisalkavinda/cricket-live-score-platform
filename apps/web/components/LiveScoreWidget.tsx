'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ScoreBroadcastPayload } from '@/lib/scoring/scoring-realtime';
import { sortMatchesByPriority } from '@/lib/scoring/scoring-rules';
import { normalizeImageUrl } from '@/lib/utils/image-utils';
import { computeStageStandings } from '@/lib/tournament/nrr-engine';

type NavTab = 'LIVE' | 'POINTS_TABLE' | 'ALL_MATCHES' | 'TOP_BATTERS' | 'TOP_BOWLERS';

export default function LiveScoreWidget() {
  const router = useRouter();
  const [navTab, setNavTab] = useState<NavTab>('LIVE');
  const [matches, setMatches] = useState<ScoreBroadcastPayload[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const inFlightRef = useRef<boolean>(false);
  const inFlightStatsRef = useRef<boolean>(false);

  // Points Table active stage selector (Group A or Group B)
  const [tableGroup, setTableGroup] = useState<'A' | 'B'>('A');

  // Tournament stats for Points Table, All Matches & Leaderboards
  const [statsData, setStatsData] = useState<{
    allMatches: any[];
    topBatters: any[];
    topBowlers: any[];
    mvpLeaderboard: any[];
    overview?: any;
  }>({
    allMatches: [],
    topBatters: [],
    topBowlers: [],
    mvpLeaderboard: [],
    overview: null,
  });
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'COMPLETED' | 'LIVE' | 'UPCOMING'>('ALL');

  const activeMatchIdRef = useRef<string | null>(activeMatchId);
  activeMatchIdRef.current = activeMatchId;

  const navTabRef = useRef<NavTab>(navTab);
  navTabRef.current = navTab;

  // 1. Fetch initial live matches from database
  const fetchLiveMatches = useCallback(async (force = false) => {
    if (inFlightRef.current && !force) {
      return;
    }
    inFlightRef.current = true;
    try {
      const res = await fetch(`/api/matches/live?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.matches && data.matches.length > 0) {
        const sorted = sortMatchesByPriority(data.matches);
        setMatches(sorted);
        setActiveMatchId((prev) => {
          const liveMatch = sorted.find((m: any) => m.status === 'LIVE');
          const prevMatch = sorted.find((m: any) => m.matchId === prev);

          // If a match is LIVE, and current selection is not LIVE (e.g. was showing completed match),
          // auto-switch to the new live match!
          if (liveMatch && prevMatch?.status !== 'LIVE') {
            return liveMatch.matchId;
          }

          // If previous selection is still valid in list, keep it
          if (prev && prevMatch) {
            return prev;
          }

          // Otherwise default to the top priority match (LIVE -> COMPLETED -> UPCOMING)
          return sorted[0]?.matchId || null;
        });
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('[LiveScoreWidget] Fetch error:', err);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  // 2. Fetch tournament stats (All Matches, Top Batters, Top Bowlers, MVP)
  const fetchTournamentStats = useCallback(async () => {
    if (inFlightStatsRef.current) return;
    inFlightStatsRef.current = true;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/tournament/stats?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setStatsData({
          allMatches: data.allMatches || [],
          topBatters: data.topBatters || [],
          topBowlers: data.topBowlers || [],
          mvpLeaderboard: data.mvpLeaderboard || [],
          overview: data.overview || null,
        });
      }
    } catch (err) {
      console.error('[LiveScoreWidget] Stats error:', err);
    } finally {
      inFlightStatsRef.current = false;
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMatches(true);
    fetchTournamentStats();
  }, [fetchLiveMatches, fetchTournamentStats]);

  // 3. Real-time Subscription via Supabase Realtime (Single persistent channel)
  useEffect(() => {
    const supabase = createClient();

    const handleBroadcastUpdate = (msg?: any) => {
      if (msg?.payload?.matchId) {
        // Instant in-memory update directly from the broadcast payload
        setMatches((prevMatches) => {
          const index = prevMatches.findIndex((m) => m.matchId === msg.payload.matchId);
          let updated: ScoreBroadcastPayload[];
          if (index !== -1) {
            updated = [...prevMatches];
            updated[index] = { ...updated[index], ...msg.payload };
          } else {
            updated = [msg.payload, ...prevMatches];
          }
          return sortMatchesByPriority(updated);
        });

        // If broadcasted match just went LIVE, auto-switch activeMatchId if not already on a live match
        if (msg.payload.status === 'LIVE') {
          setActiveMatchId((prev) => {
            const prevMatch = matches.find((m) => m.matchId === prev);
            if (!prev || !prevMatch || prevMatch.status !== 'LIVE') {
              return msg.payload.matchId;
            }
            return prev;
          });
        }

        setLastUpdated(new Date().toLocaleTimeString());
      }
      // Authoritative re-sync in background to ensure all nested relations are current
      fetchLiveMatches(true);
    };

    // Global live matches channel
    const liveChannel = supabase.channel('matches:live');

    liveChannel
      .on('broadcast', { event: 'score_update' }, handleBroadcastUpdate)
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          fetchLiveMatches(true);
        }
      });

    // 4. Reliable 4s safety sync fallback
    const interval = setInterval(() => {
      fetchLiveMatches();
      if (navTabRef.current !== 'LIVE') fetchTournamentStats();
    }, 4000);

    return () => {
      try {
        supabase.removeChannel(liveChannel);
      } catch (e) {}
      clearInterval(interval);
    };
  }, [fetchLiveMatches, fetchTournamentStats, matches]);

  const displayMatches = useMemo<ScoreBroadcastPayload[]>(() => {
    if (matches && matches.length > 0) return matches;
    if (statsData.allMatches && statsData.allMatches.length > 0) {
      return statsData.allMatches.map((m: any) => ({
        matchId: m.id,
        status: m.status,
        matchNumber: m.matchNumber,
        stage: m.stage,
        groupName: m.groupName,
        bracketSlot: m.bracketSlot,
        currentInnings: m.innings?.length || 1,
        match: {
          id: m.id,
          matchNumber: m.matchNumber,
          stage: m.stage,
          groupName: m.groupName,
          bracketSlot: m.bracketSlot,
          teamA: m.teamA,
          teamB: m.teamB,
          venue: m.venue,
          oversPerInnings: m.oversPerInnings || 4,
          ballsPerOver: m.ballsPerOver || 4,
          resultNote: m.resultNote,
          winnerTeamId: m.winnerTeamId,
          scheduledAt: m.scheduledAt,
          startedAt: m.startedAt,
          completedAt: m.completedAt,
          updatedAt: m.updatedAt,
        },
        innings: m.innings?.[m.innings.length - 1] || null,
        striker: null,
        nonStriker: null,
        bowler: null,
        recentBalls: [],
      } as unknown as ScoreBroadcastPayload));
    }
    return [];
  }, [matches, statsData.allMatches]);

  const currentMatch = useMemo(() => {
    if (displayMatches.length === 0) return null;
    const selected = displayMatches.find((m: any) => m.matchId === activeMatchId);
    if (selected) return selected;
    // Priority fallback: LIVE -> recently COMPLETED -> first match
    const live = displayMatches.find((m: any) => m.status === 'LIVE');
    if (live) return live;
    const completed = displayMatches.find((m: any) => m.status === 'COMPLETED');
    if (completed) return completed;
    return displayMatches[0];
  }, [displayMatches, activeMatchId]);
  const currentInnings = currentMatch?.innings;

  const filteredMatches = useMemo(() => {
    const list = statsData.allMatches.filter((m) => {
      if (matchFilter === 'ALL') return true;
      if (matchFilter === 'UPCOMING') return m.status === 'UPCOMING' || m.status === 'SCHEDULED';
      return m.status === matchFilter;
    });

    return sortMatchesByPriority(list);
  }, [statsData.allMatches, matchFilter]);

  return (
    <div
      id="live-scores"
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--space-md) var(--space-md)',
        scrollMarginTop: '90px',
      }}
    >
      {/* Container Card */}
      <div
        style={{
          background: 'var(--color-paper-dark)',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--color-border-dark)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          color: 'var(--color-paper)',
        }}
      >
        {/* Main Navigation Tabs: Live Match | Points Table | All Matches | Top Batsmen | Top Bowlers */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.45)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '10px 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <button
            onClick={() => setNavTab('LIVE')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: navTab === 'LIVE' ? '3px solid var(--color-accent, #C0272D)' : '3px solid transparent',
              color: navTab === 'LIVE' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: currentMatch?.status === 'LIVE' ? '#EF4444' : '#10B981',
                animation: currentMatch?.status === 'LIVE' ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            Match Center
            {currentMatch?.status === 'COMPLETED' && (
              <span
                style={{
                  fontSize: '0.66rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                Recent Result
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setNavTab('POINTS_TABLE');
              fetchTournamentStats();
            }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: navTab === 'POINTS_TABLE' ? '3px solid var(--color-gold, #FFB800)' : '3px solid transparent',
              color: navTab === 'POINTS_TABLE' ? '#FFB800' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            📊 Points Table & NRR
          </button>

          <button
            onClick={() => {
              setNavTab('ALL_MATCHES');
              fetchTournamentStats();
            }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: navTab === 'ALL_MATCHES' ? '3px solid var(--color-gold, #FFB800)' : '3px solid transparent',
              color: navTab === 'ALL_MATCHES' ? '#FFB800' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            📋 All Matches
            {statsData.allMatches.length > 0 && (
              <span
                style={{
                  background: 'rgba(255, 184, 0, 0.2)',
                  color: '#FFB800',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                }}
              >
                {statsData.allMatches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setNavTab('TOP_BATTERS');
              fetchTournamentStats();
            }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: navTab === 'TOP_BATTERS' ? '3px solid var(--color-gold, #FFB800)' : '3px solid transparent',
              color: navTab === 'TOP_BATTERS' ? '#FFB800' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            🏏 Top Run Scorers
          </button>

          <button
            onClick={() => {
              setNavTab('TOP_BOWLERS');
              fetchTournamentStats();
            }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: navTab === 'TOP_BOWLERS' ? '3px solid var(--color-gold, #FFB800)' : '3px solid transparent',
              color: navTab === 'TOP_BOWLERS' ? '#FFB800' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            🎯 Top Wicket Takers
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: LIVE MATCH / MATCH CENTER VIEW                         */}
        {/* ───────────────────────────────────────────────────────────── */}
        {navTab === 'LIVE' && (
          <>
            {/* Match Header Bar & Selector */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              {/* Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: currentMatch?.status === 'LIVE'
                      ? 'var(--color-accent)'
                      : currentMatch?.status === 'COMPLETED'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: currentMatch?.status === 'COMPLETED' ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                    color: currentMatch?.status === 'COMPLETED' ? '#34D399' : 'white',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {currentMatch?.status === 'LIVE' && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'white',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                  )}
                  {currentMatch?.status === 'COMPLETED' ? 'RECENT RESULT' : (currentMatch?.status || 'UPCOMING')}
                </span>

                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>
                  {currentMatch?.match.venue || 'Main Stadium'}
                  {currentMatch?.status === 'LIVE'
                    ? ` • ${currentMatch?.currentInnings >= 3 ? `⚡ Super Over ${Math.floor((currentMatch.currentInnings - 3) / 2) + 1} (${(currentMatch.currentInnings - 3) % 2 === 0 ? '1' : 'Chase'})` : `Innings ${currentMatch?.currentInnings || 1}`}`
                    : currentMatch?.status === 'COMPLETED'
                    ? ' • Final Result'
                    : ''}
                </span>

                {lastUpdated && (
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                    ({currentMatch?.status === 'LIVE' ? `Live: ${lastUpdated}` : `Updated: ${lastUpdated}`})
                  </span>
                )}

                {/* Points Table & NRR Quick Pill (Desktop Only) */}
                <button
                  className="scorecard-desktop-only-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNavTab('POINTS_TABLE');
                    fetchTournamentStats();
                  }}
                  style={{
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(255, 184, 0, 0.12)',
                    border: '1px solid rgba(255, 184, 0, 0.35)',
                    color: '#FFB800',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="View CPL Stage Standings & Net Run Rate"
                >
                  📊 Points Table & NRR
                </button>
              </div>

              {/* Match Switcher Tabs if multiple matches */}
              {displayMatches.length > 1 && (
                <div className="scorecard-match-chips-scroll" onClick={(e) => e.stopPropagation()}>
                  {displayMatches.map((m) => (
                    <button
                      key={m.matchId}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMatchId(m.matchId);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: m.matchId === activeMatchId
                          ? '1px solid rgba(255, 184, 0, 0.45)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        background: m.matchId === activeMatchId ? 'rgba(255, 184, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: m.matchId === activeMatchId ? '#FFB800' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {m.status === 'LIVE' && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                      )}
                      {m.status === 'COMPLETED' && (
                        <span style={{ fontSize: '0.72rem' }}>🏆</span>
                      )}
                      <span>{m.match.teamA.shortName} vs {m.match.teamB.shortName}</span>
                      <span style={{ fontSize: '0.64rem', opacity: 0.75, textTransform: 'uppercase' }}>
                        ({m.status === 'COMPLETED' ? 'Final' : m.status})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                Loading live match data...
              </div>
            ) : !currentMatch ? (
              <div style={{ padding: '44px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>🏏</div>
                <h3 style={{ fontSize: '1.28rem', fontWeight: 900, margin: '0 0 8px', color: '#FFF', letterSpacing: '-0.01em' }}>
                  CPL Live Match Center
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.65)', margin: '0 auto 20px', maxWidth: '520px', lineHeight: 1.5 }}>
                  No matches currently in progress. Select another tab above to see past results and tournament leaderboards!
                </p>

                {/* Quick Action Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setNavTab('POINTS_TABLE');
                      fetchTournamentStats();
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.22) 0%, rgba(255, 184, 0, 0.08) 100%)',
                      border: '1px solid rgba(255, 184, 0, 0.45)',
                      color: '#FFB800',
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(255, 184, 0, 0.15)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    📊 Points Table & NRR
                  </button>

                  <button
                    onClick={() => {
                      setNavTab('ALL_MATCHES');
                      fetchTournamentStats();
                    }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    📋 All Matches
                  </button>

                  <Link
                    href="/tournament"
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: 'rgba(192, 39, 45, 0.18)',
                      border: '1px solid rgba(192, 39, 45, 0.35)',
                      color: '#FCA5A5',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🏆 Tournament Hub ↗
                  </Link>
                </div>
              </div>
            ) : currentMatch.status === 'COMPLETED' ? (
              (() => {
                const teamAId = currentMatch.match.teamA.id;
                const teamBId = currentMatch.match.teamB.id;
                const allInnings = currentMatch.allInningsSummary || [];

                const isTeamAWinner = currentMatch.match.winnerTeamId === teamAId;
                const isTeamBWinner = currentMatch.match.winnerTeamId === teamBId;

                const teamAReg = allInnings.find((i) => i.battingTeamId === teamAId && !i.isSuperOver && i.inningsNumber <= 2);
                const teamASOList = allInnings.filter((i) => i.battingTeamId === teamAId && (i.isSuperOver || (i.inningsNumber && i.inningsNumber >= 3)));

                const teamBReg = allInnings.find((i) => i.battingTeamId === teamBId && !i.isSuperOver && i.inningsNumber <= 2);
                const teamBSOList = allInnings.filter((i) => i.battingTeamId === teamBId && (i.isSuperOver || (i.inningsNumber && i.inningsNumber >= 3)));

                let teamAScoreText = teamAReg ? `${teamAReg.runs}/${teamAReg.wickets}` : (currentInnings?.battingTeam?.id === teamAId ? `${currentInnings.runs}/${currentInnings.wickets}` : '-');
                let teamAOversText = teamAReg ? `(${teamAReg.overs}${teamAReg.balls > 0 ? `.${teamAReg.balls}` : ''} ov)` : '';
                teamASOList.forEach((so) => {
                  teamAScoreText += ` & ${so.runs}/${so.wickets}`;
                  teamAOversText += ` & (${so.overs}.${so.balls} ov)`;
                });

                let teamBScoreText = teamBReg ? `${teamBReg.runs}/${teamBReg.wickets}` : (currentInnings?.battingTeam?.id === teamBId ? `${currentInnings.runs}/${currentInnings.wickets}` : '-');
                let teamBOversText = teamBReg ? `(${teamBReg.overs}${teamBReg.balls > 0 ? `.${teamBReg.balls}` : ''} ov)` : '';
                teamBSOList.forEach((so) => {
                  teamBScoreText += ` & ${so.runs}/${so.wickets}`;
                  teamBOversText += ` & (${so.overs}.${so.balls} ov)`;
                });

                // Check for upcoming match teaser
                const nextUpcomingMatch = matches.find((m) => m.status === 'UPCOMING' || (m.status as string) === 'SCHEDULED');

                return (
                  <div
                    className="scorecard-interactive-card"
                    onClick={() => router.push(`/scorecard?matchId=${currentMatch.matchId}`)}
                    title="Tap to view full match scorecard"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        router.push(`/scorecard?matchId=${currentMatch.matchId}`);
                      }
                    }}
                    style={{ padding: '20px 16px 0', textAlign: 'center' }}
                  >
                    {/* Header Subtitle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#34D399',
                        background: 'rgba(16, 185, 129, 0.14)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                      }}>
                        <span>🏆</span> Most Recently Completed Match
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        Result displayed until next match starts
                      </span>
                    </div>

                    {/* Teams & Scores Grid */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        justifyContent: 'center',
                        maxWidth: '520px',
                        margin: '0 auto 18px',
                        gap: '10px',
                      }}
                    >
                      {/* Team A box */}
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        background: isTeamAWinner ? 'linear-gradient(180deg, rgba(255, 184, 0, 0.14) 0%, rgba(255,255,255,0.04) 100%)' : 'rgba(255,255,255,0.04)',
                        border: isTeamAWinner ? '1.5px solid rgba(255, 184, 0, 0.6)' : '1px solid rgba(255,255,255,0.09)',
                        boxShadow: isTeamAWinner ? '0 0 20px rgba(255, 184, 0, 0.15)' : 'none',
                        borderRadius: '10px',
                        padding: '16px 10px 14px',
                        gap: '8px',
                        position: 'relative',
                      }}>
                        {isTeamAWinner && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            background: '#FFB800',
                            color: '#000',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            padding: '1px 8px',
                            borderRadius: '9999px',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                          }}>
                            👑 Winner
                          </div>
                        )}
                        {currentMatch.match.teamA.logoUrl ? (
                          <img
                            src={currentMatch.match.teamA.logoUrl}
                            alt={currentMatch.match.teamA.name}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: isTeamAWinner ? '2px solid #FFB800' : '2px solid rgba(255,255,255,0.15)' }}
                          />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: isTeamAWinner ? '2px solid #FFB800' : '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                            🏏
                          </div>
                        )}
                        <div style={{ fontFamily: 'var(--font-data, sans-serif)', fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-gold, #FFB800)', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                          {teamAScoreText}
                        </div>
                        {teamAOversText && (
                          <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                            {teamAOversText}
                          </div>
                        )}
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isTeamAWinner ? '#FFF' : 'rgba(255,255,255,0.85)' }}>
                          {currentMatch.match.teamA.name}
                        </div>
                      </div>

                      {/* VS divider */}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 2px', color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', fontWeight: 700 }}>
                        vs
                      </div>

                      {/* Team B box */}
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        background: isTeamBWinner ? 'linear-gradient(180deg, rgba(255, 184, 0, 0.14) 0%, rgba(255,255,255,0.04) 100%)' : 'rgba(255,255,255,0.04)',
                        border: isTeamBWinner ? '1.5px solid rgba(255, 184, 0, 0.6)' : '1px solid rgba(255,255,255,0.09)',
                        boxShadow: isTeamBWinner ? '0 0 20px rgba(255, 184, 0, 0.15)' : 'none',
                        borderRadius: '10px',
                        padding: '16px 10px 14px',
                        gap: '8px',
                        position: 'relative',
                      }}>
                        {isTeamBWinner && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            background: '#FFB800',
                            color: '#000',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            padding: '1px 8px',
                            borderRadius: '9999px',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                          }}>
                            👑 Winner
                          </div>
                        )}
                        {currentMatch.match.teamB.logoUrl ? (
                          <img
                            src={currentMatch.match.teamB.logoUrl}
                            alt={currentMatch.match.teamB.name}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: isTeamBWinner ? '2px solid #FFB800' : '2px solid rgba(255,255,255,0.15)' }}
                          />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: isTeamBWinner ? '2px solid #FFB800' : '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                            🦁
                          </div>
                        )}
                        <div style={{ fontFamily: 'var(--font-data, sans-serif)', fontSize: '1.45rem', fontWeight: 900, color: 'var(--color-gold, #FFB800)', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                          {teamBScoreText}
                        </div>
                        {teamBOversText && (
                          <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                            {teamBOversText}
                          </div>
                        )}
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isTeamBWinner ? '#FFF' : 'rgba(255,255,255,0.85)' }}>
                          {currentMatch.match.teamB.name}
                        </div>
                      </div>
                    </div>

                    {/* Match Result Line */}
                    <div style={{ background: 'rgba(192,39,45,0.12)', border: '1px solid rgba(192,39,45,0.3)', borderRadius: '8px', padding: '8px 16px', display: 'inline-block', marginBottom: '6px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FCA5A5', letterSpacing: '0.01em' }}>
                        🏆 {currentMatch.match.resultNote || 'Match Completed'}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                      {currentMatch.match.venue || 'Ratmalana Ground'}
                    </div>

                    {/* Next Fixture Teaser */}
                    {nextUpcomingMatch && (
                      <div style={{
                        marginTop: '12px',
                        marginBottom: '4px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ color: '#FFB800', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                          Next Up:
                        </span>
                        <span style={{ fontWeight: 800, color: '#FFF' }}>
                          {nextUpcomingMatch.match.teamA.name} vs {nextUpcomingMatch.match.teamB.name}
                        </span>
                        {nextUpcomingMatch.match.venue && (
                          <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                            • {nextUpcomingMatch.match.venue}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.66rem',
                          background: 'rgba(255, 184, 0, 0.15)',
                          color: '#FFB800',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}>
                          Starts Soon
                        </span>
                      </div>
                    )}

                    {/* Quick navigation after completed match */}
                    <div style={{ marginTop: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNavTab('POINTS_TABLE');
                          fetchTournamentStats();
                        }}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          background: 'rgba(255, 184, 0, 0.14)',
                          border: '1px solid rgba(255, 184, 0, 0.4)',
                          color: '#FFB800',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        📊 Points Table & NRR
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNavTab('ALL_MATCHES');
                          fetchTournamentStats();
                        }}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#FFF',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        📋 All Matches
                      </button>
                    </div>

                    {/* Tap to view full scorecard indicator */}
                    <div className="scorecard-tap-indicator">
                      <span>🏆 Match Completed • Tap anywhere to view full scorecard &amp; commentary →</span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div
                className="scorecard-widget-body scorecard-interactive-card"
                onClick={() => router.push(`/scorecard?matchId=${currentMatch.matchId}`)}
                title="Tap anywhere to view full scorecard and ball-by-ball commentary"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    router.push(`/scorecard?matchId=${currentMatch.matchId}`);
                  }
                }}
              >
                {/* Scoreboard Layout: Desktop 3-column / Mobile Google Cricket 2-row Stack */}
                {(() => {
                  const isPreMatch = currentMatch.status === 'UPCOMING' && !currentMatch.match.tossWinnerId;
                  const inn1 = (currentMatch.allInningsSummary || []).find((i: any) => i.inningsNumber === 1);
                  const inn1BattingTeamId = inn1?.battingTeamId || (
                    currentMatch.match.tossWinnerId
                      ? (currentMatch.match.tossDecision === 'BAT' ? currentMatch.match.tossWinnerId : (currentMatch.match.tossWinnerId === currentMatch.match.teamA.id ? currentMatch.match.teamB.id : currentMatch.match.teamA.id))
                      : currentMatch.match.teamA.id
                  );
                  const inn2BattingTeamId = inn1BattingTeamId === currentMatch.match.teamA.id ? currentMatch.match.teamB.id : currentMatch.match.teamA.id;

                  const leftTeam = isPreMatch ? currentMatch.match.teamA : (inn1BattingTeamId === currentMatch.match.teamB.id ? currentMatch.match.teamB : currentMatch.match.teamA);
                  const rightTeam = isPreMatch ? currentMatch.match.teamB : (inn2BattingTeamId === currentMatch.match.teamB.id ? currentMatch.match.teamB : currentMatch.match.teamA);

                  const isLeftBatting = currentMatch.status === 'LIVE' && currentInnings?.battingTeam?.id === leftTeam.id;
                  const isRightBatting = currentMatch.status === 'LIVE' && currentInnings?.battingTeam?.id === rightTeam.id;

                  const isSuperOver = currentMatch.currentInnings >= 3;
                  const leftInningsSummary = (currentMatch.allInningsSummary || []).find((i: any) => i.battingTeamId === leftTeam.id && !i.isSuperOver);
                  const rightInningsSummary = (currentMatch.allInningsSummary || []).find((i: any) => i.battingTeamId === rightTeam.id && !i.isSuperOver);
                  const leftSuperOverSummary = (currentMatch.allInningsSummary || []).find((i: any) => i.battingTeamId === leftTeam.id && i.isSuperOver);
                  const rightSuperOverSummary = (currentMatch.allInningsSummary || []).find((i: any) => i.battingTeamId === rightTeam.id && i.isSuperOver);

                  return (
                    <div style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      {/* Desktop View (>= 768px): 3-Column Grid */}
                      <div className="scorecard-desktop-view">
                        <div className="scorecard-match-header-grid">
                          {/* Left Team (Batting 1st) */}
                          <div className="scorecard-team-a-box">
                            {leftTeam.logoUrl ? (
                              <img
                                src={leftTeam.logoUrl}
                                alt={leftTeam.name}
                                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.2)', flexShrink: 0 }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.4rem',
                                  flexShrink: 0,
                                }}
                              >
                                🏏
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>{leftTeam.name}</span>
                                {isLeftBatting && (
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
                                    }}
                                  >
                                    🏏 BATTING
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                                {isSuperOver ? (
                                  <div>
                                    <div style={{ color: '#F59E0B', fontWeight: 800 }}>
                                      ⚡ SO: {leftSuperOverSummary ? `${leftSuperOverSummary.runs}/${leftSuperOverSummary.wickets} (${leftSuperOverSummary.overs}.${leftSuperOverSummary.balls} ov)` : (isLeftBatting ? `${currentInnings?.runs ?? 0}/${currentInnings?.wickets ?? 0} (${currentInnings?.overs ?? 0}.${currentInnings?.balls ?? 0} ov)` : 'Yet to bat')}
                                    </div>
                                    {leftInningsSummary && (
                                      <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                                        Main: {leftInningsSummary.runs}/${leftInningsSummary.wickets} ({leftInningsSummary.overs}.${leftInningsSummary.balls} ov)
                                      </div>
                                    )}
                                  </div>
                                ) : leftInningsSummary
                                  ? `${leftInningsSummary.runs}/${leftInningsSummary.wickets} (${leftInningsSummary.overs}.${leftInningsSummary.balls} ov)`
                                  : isLeftBatting
                                  ? `${currentInnings?.runs ?? 0}/${currentInnings?.wickets ?? 0} (Batting)`
                                  : !isPreMatch
                                  ? 'Yet to bat'
                                  : leftTeam.shortName || 'Team 1'}
                              </div>
                            </div>
                          </div>

                          {/* Center Score & Overs */}
                          <div className="scorecard-center-score-box">
                            <div
                              style={{
                                fontFamily: 'var(--font-data, monospace)',
                                fontSize: '2.4rem',
                                fontWeight: 900,
                                color: 'var(--color-gold, #FFB800)',
                                letterSpacing: '-0.02em',
                                lineHeight: 1,
                              }}
                            >
                              {currentInnings ? `${currentInnings.runs}/${currentInnings.wickets}` : '0/0'}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px', fontWeight: 600 }}>
                              {currentInnings ? `Overs: ${currentInnings.overs}.${currentInnings.balls}` : '0.0 Overs'}
                              {isSuperOver ? ' / 1.0 ov' : currentMatch.match.oversPerInnings ? ` / ${currentMatch.match.oversPerInnings} ov` : ''}
                            </div>
                            {isSuperOver && (() => {
                              const curInn = currentMatch.currentInnings || 3;
                              const soRound = Math.floor((curInn - 3) / 2) + 1;
                              const soType = (curInn - 3) % 2 === 0 ? '1' : '2 (CHASE)';
                              return (
                                <div style={{ marginTop: '4px', display: 'inline-block', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #F59E0B', color: '#FBBF24', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                                  ⚡ SUPER OVER {soRound} • INNINGS {soType} (1 OV • 2 WKTS MAX)
                                </div>
                              );
                            })()}
                          </div>

                          {/* Right Team (Batting 2nd) */}
                          <div className="scorecard-team-b-box">
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                                {isRightBatting && (
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
                                    }}
                                  >
                                    🏏 BATTING
                                  </span>
                                )}
                                <span>{rightTeam.name}</span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                                {isSuperOver ? (
                                  <div>
                                    <div style={{ color: '#F59E0B', fontWeight: 800 }}>
                                      ⚡ SO: {rightSuperOverSummary ? `${rightSuperOverSummary.runs}/${rightSuperOverSummary.wickets} (${rightSuperOverSummary.overs}.${rightSuperOverSummary.balls} ov)` : (isRightBatting ? `${currentInnings?.runs ?? 0}/${currentInnings?.wickets ?? 0} (${currentInnings?.overs ?? 0}.${currentInnings?.balls ?? 0} ov)` : 'Yet to bat')}
                                    </div>
                                    {rightInningsSummary && (
                                      <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                                        Main: {rightInningsSummary.runs}/${rightInningsSummary.wickets} ({rightInningsSummary.overs}.${rightInningsSummary.balls} ov)
                                      </div>
                                    )}
                                  </div>
                                ) : rightInningsSummary
                                  ? `${rightInningsSummary.runs}/${rightInningsSummary.wickets} (${rightInningsSummary.overs}.${rightInningsSummary.balls} ov)`
                                  : isRightBatting
                                  ? `${currentInnings?.runs ?? 0}/${currentInnings?.wickets ?? 0} (Batting)`
                                  : !isPreMatch
                                  ? 'Yet to bat'
                                  : rightTeam.shortName || 'Team 2'}
                              </div>
                            </div>
                            {rightTeam.logoUrl ? (
                              <img
                                src={rightTeam.logoUrl}
                                alt={rightTeam.name}
                                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.2)', flexShrink: 0 }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.4rem',
                                  flexShrink: 0,
                                }}
                              >
                                🦁
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile View (< 768px): Google Cricket Standard Dual-Row Stacked Team Layout */}
                      <div className="scorecard-mobile-view">
                        <div className="scorecard-mobile-stacked-teams">
                          {/* Row 1: Left Team (Batting 1st) */}
                          <div className={`scorecard-mobile-team-row ${isLeftBatting ? 'is-batting' : ''}`}>
                            <div className="scorecard-mobile-team-left">
                              {leftTeam.logoUrl ? (
                                <img src={leftTeam.logoUrl} alt={leftTeam.name} className="scorecard-mobile-team-logo" />
                              ) : (
                                <div className="scorecard-mobile-team-logo-placeholder">🏏</div>
                              )}
                              <div className="scorecard-mobile-team-meta">
                                <div className="scorecard-mobile-team-name-row">
                                  <span className="scorecard-mobile-team-title">{leftTeam.name}</span>
                                  {isLeftBatting && (
                                    <span className="scorecard-mobile-batting-badge">🏏 BATTING</span>
                                  )}
                                </div>
                                <span className="scorecard-mobile-shortname">{leftTeam.shortName}</span>
                              </div>
                            </div>

                            <div className="scorecard-mobile-team-right">
                              {isSuperOver ? (
                                <>
                                  <span className="scorecard-mobile-team-score" style={{ color: '#F59E0B' }}>
                                    {leftSuperOverSummary ? `${leftSuperOverSummary.runs}/${leftSuperOverSummary.wickets}` : isLeftBatting ? `${currentInnings?.runs ?? 0}/${currentInnings?.wickets ?? 0}` : '-'}
                                  </span>
                                  <span className="scorecard-mobile-team-overs">
                                    ({leftSuperOverSummary ? `${leftSuperOverSummary.overs}.${leftSuperOverSummary.balls}` : isLeftBatting ? `${currentInnings?.overs ?? 0}.${currentInnings?.balls ?? 0}` : '0.0'} ov)
                                  </span>
                                  {leftInningsSummary && (
                                    <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '1px' }}>
                                      Main: {leftInningsSummary.runs}/{leftInningsSummary.wickets}
                                    </span>
                                  )}
                                </>
                              ) : leftInningsSummary ? (
                                <>
                                  <span className="scorecard-mobile-team-score">{leftInningsSummary.runs}/{leftInningsSummary.wickets}</span>
                                  <span className="scorecard-mobile-team-overs">({leftInningsSummary.overs}.{leftInningsSummary.balls} ov)</span>
                                </>
                              ) : isLeftBatting ? (
                                <>
                                  <span className="scorecard-mobile-team-score">{currentInnings?.runs ?? 0}/{currentInnings?.wickets ?? 0}</span>
                                  <span className="scorecard-mobile-team-overs">({currentInnings?.overs ?? 0}.{currentInnings?.balls ?? 0} ov)</span>
                                </>
                              ) : (
                                <span className="scorecard-mobile-team-yet">{isPreMatch ? 'Ready' : 'Yet to bat'}</span>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Right Team (Batting 2nd) */}
                          <div className={`scorecard-mobile-team-row ${isRightBatting ? 'is-batting' : ''}`}>
                            <div className="scorecard-mobile-team-left">
                              {rightTeam.logoUrl ? (
                                <img src={rightTeam.logoUrl} alt={rightTeam.name} className="scorecard-mobile-team-logo" />
                              ) : (
                                <div className="scorecard-mobile-team-logo-placeholder">🦁</div>
                              )}
                              <div className="scorecard-mobile-team-meta">
                                <div className="scorecard-mobile-team-name-row">
                                  <span className="scorecard-mobile-team-title">{rightTeam.name}</span>
                                  {isRightBatting && (
                                    <span className="scorecard-mobile-batting-badge">🏏 BATTING</span>
                                  )}
                                </div>
                                <span className="scorecard-mobile-shortname">{rightTeam.shortName}</span>
                              </div>
                            </div>

                            <div className="scorecard-mobile-team-right">
                              {isSuperOver ? (
                                <>
                                  <span className="scorecard-mobile-team-score" style={{ color: '#F59E0B' }}>
                                    {rightSuperOverSummary ? `${rightSuperOverSummary.runs}/${rightSuperOverSummary.wickets}` : isRightBatting ? `${currentInnings?.runs ?? 0}/${currentInnings?.wickets ?? 0}` : '-'}
                                  </span>
                                  <span className="scorecard-mobile-team-overs">
                                    ({rightSuperOverSummary ? `${rightSuperOverSummary.overs}.${rightSuperOverSummary.balls}` : isRightBatting ? `${currentInnings?.overs ?? 0}.${currentInnings?.balls ?? 0}` : '0.0'} ov)
                                  </span>
                                  {rightInningsSummary && (
                                    <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '1px' }}>
                                      Main: {rightInningsSummary.runs}/{rightInningsSummary.wickets}
                                    </span>
                                  )}
                                </>
                              ) : rightInningsSummary ? (
                                <>
                                  <span className="scorecard-mobile-team-score">{rightInningsSummary.runs}/{rightInningsSummary.wickets}</span>
                                  <span className="scorecard-mobile-team-overs">({rightInningsSummary.overs}.{rightInningsSummary.balls} ov)</span>
                                </>
                              ) : isRightBatting ? (
                                <>
                                  <span className="scorecard-mobile-team-score">{currentInnings?.runs ?? 0}/{currentInnings?.wickets ?? 0}</span>
                                  <span className="scorecard-mobile-team-overs">({currentInnings?.overs ?? 0}.{currentInnings?.balls ?? 0} ov)</span>
                                </>
                              ) : (
                                <span className="scorecard-mobile-team-yet">{isPreMatch ? 'Ready' : 'Yet to bat'}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Status Strip */}
                        <div className="scorecard-mobile-status-strip">
                          <div className="scorecard-mobile-status-live">
                            <span className="scorecard-live-dot" />
                            <span>
                              {isSuperOver
                                ? `⚡ SUPER OVER ${Math.floor(((currentMatch?.currentInnings || 3) - 3) / 2) + 1} • INNINGS ${((currentMatch?.currentInnings || 3) - 3) % 2 === 0 ? '1' : '2 (CHASE)'}`
                                : `INNINGS ${currentMatch.currentInnings}`}
                              {currentInnings ? ` (${currentInnings.overs}.${currentInnings.balls}/${isSuperOver ? '1.0' : (currentMatch.match.oversPerInnings || 4)} OV)` : ''}
                            </span>
                          </div>
                          <div className="scorecard-mobile-rates">
                            <span>CRR: <strong>{currentMatch.chase?.crr || currentInnings?.crr || '0.00'}</strong></span>
                            {currentMatch.chase?.isChase && currentMatch.chase?.target ? (
                              <span> • Target: <strong style={{ color: 'var(--color-gold)' }}>{currentMatch.chase.target}</strong></span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Match Situation & Run Rates Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.85rem',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="scorecard-desktop-only-btn" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      CRR: <strong style={{ color: '#FFF' }}>{currentMatch.chase?.crr || currentInnings?.crr || '0.00'}</strong>
                    </span>
                    {currentMatch.chase?.isChase && currentMatch.chase?.target ? (
                      <>
                        <span className="scorecard-desktop-only-btn" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          Target: <strong style={{ color: 'var(--color-gold, #FFB800)' }}>{currentMatch.chase.target}</strong>
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          RRR: <strong style={{ color: '#FFF' }}>{currentMatch.chase.rrr || '-'}</strong>
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          Need: <strong style={{ color: '#10B981' }}>{currentMatch.chase.runsNeeded}</strong> off <strong style={{ color: '#10B981' }}>{currentMatch.chase.ballsRemaining}</strong> balls
                        </span>
                      </>
                    ) : null}
                  </div>

                  {currentMatch.match.resultNote && (
                    <div style={{ color: 'var(--color-gold, #FFB800)', fontWeight: 700 }}>
                      📢 {currentMatch.match.resultNote}
                    </div>
                  )}
                </div>

                {/* Active Batters & Bowler Mini Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '16px',
                    marginTop: '16px',
                  }}
                >
                  {/* Striker & Non-Striker Card */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                      🏏 Batting
                    </div>
                    {currentMatch.status === 'UPCOMING' || (!currentMatch.striker && !currentMatch.nonStriker) ? (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', fontStyle: 'italic', padding: '4px 0' }}>
                        ⏳ Match scheduled • Active batsmen will appear when play commences
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Striker */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--color-gold, #FFB800)', fontSize: '0.9rem' }}>*</span>
                            <span style={{ fontWeight: 700, color: '#FFF', fontSize: '0.95rem' }}>
                              {currentMatch.striker?.name || 'Striker'}
                            </span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 800, color: '#FFF', fontSize: '0.95rem' }}>
                            {currentMatch.striker?.runs ?? 0}
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', fontWeight: 500 }}>
                              {' '}({currentMatch.striker?.balls ?? 0}b, {currentMatch.striker?.fours ?? 0}x4, {currentMatch.striker?.sixes ?? 0}x6{currentMatch.striker?.sr ? ` • SR: ${currentMatch.striker.sr}` : ''})
                            </span>
                          </div>
                        </div>

                        {/* Non-Striker */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'transparent', fontSize: '0.9rem' }}>*</span>
                            <span style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.95rem' }}>
                              {currentMatch.nonStriker?.name || 'Non-Striker'}
                            </span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 700, color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.95rem' }}>
                            {currentMatch.nonStriker?.runs ?? 0}
                            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem', fontWeight: 500 }}>
                              {' '}({currentMatch.nonStriker?.balls ?? 0}b • {currentMatch.nonStriker?.fours ?? 0}x4, {currentMatch.nonStriker?.sixes ?? 0}x6)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Bowler Card */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                      🎯 Bowling
                    </div>
                    {currentMatch.status === 'UPCOMING' || !currentMatch.bowler ? (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', fontStyle: 'italic', padding: '4px 0' }}>
                        🎯 Awaiting opening bowler
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#FFF', fontSize: '0.95rem' }}>
                          {currentMatch.bowler?.name || 'Bowler'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 800, color: '#FFF', fontSize: '0.95rem' }}>
                          {currentMatch.bowler?.wickets ?? 0}-{currentMatch.bowler?.runsConceded ?? 0}
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', fontWeight: 500 }}>
                            {' '}({currentMatch.bowler?.overs ?? '0.0'} ov)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Deliveries Strip */}
                {currentMatch.recentBalls && currentMatch.recentBalls.length > 0 && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', padding: '14px 16px', marginTop: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gold, #F59E0B)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        🏏 THIS OVER {currentInnings ? `(Over ${currentInnings.overs + 1})` : ''}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                        Recent Deliveries
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {currentMatch.recentBalls.map((b, idx) => {
                        const runs = Number(b.runs || 0);
                        const extraRuns = Number(b.extras || 0);
                        const displayLabel = b.display || (b.isWicket
                          ? (b.wicketType === 'RETIRED_HURT' ? (runs > 0 ? `${runs}+RH` : 'RH')
                            : b.extraType === 'WIDE' ? (runs > 0 ? `WD+${runs}+W` : (extraRuns > 1 ? `WD+${extraRuns - 1}+W` : 'WD+W'))
                            : b.extraType === 'NO_BALL' ? (runs > 0 ? `NB+${runs}+W` : 'NB+W')
                            : (runs > 0 ? `${runs}+W` : 'W'))
                          : (b.extraType === 'WIDE' ? (extraRuns > 1 ? `WD+${extraRuns - 1}` : 'WD')
                            : b.extraType === 'NO_BALL' ? (runs > 0 ? `NB+${runs}` : 'NB')
                            : b.extraType === 'BYE' ? `${extraRuns || 1}B`
                            : b.extraType === 'LEG_BYE' ? `${extraRuns || 1}LB`
                            : `${runs}`));

                        return (
                          <div key={b.id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span
                              style={{
                                minWidth: '30px',
                                width: displayLabel.length > 2 ? 'auto' : '30px',
                                height: '30px',
                                padding: displayLabel.length > 2 ? '0 6px' : '0',
                                borderRadius: displayLabel.length > 2 ? '15px' : '50%',
                                background: b.isWicket && b.wicketType === 'RETIRED_HURT' ? '#0284C7' : b.isWicket ? '#EF4444' : b.runs === 4 ? '#10B981' : b.runs === 6 ? '#8B5CF6' : b.extraType === 'WIDE' || b.extraType === 'NO_BALL' ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
                                color: b.extraType === 'WIDE' || b.extraType === 'NO_BALL' ? '#000' : '#FFF',
                                fontSize: displayLabel.length > 3 ? '0.65rem' : '0.75rem',
                                fontWeight: 900,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              }}
                            >
                              {displayLabel}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700 }}>
                              .{idx + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Extras Row */}
                {currentMatch && currentMatch.innings && currentMatch.innings.extrasBreakdown && (() => {
                  const eb = currentMatch.innings!.extrasBreakdown!;
                  return (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                        padding: '10px 16px',
                        marginTop: '14px',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Extras
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                          (b {eb.byes}, lb {eb.legByes}, w {eb.wides}, nb {eb.noBalls}{eb.penalty > 0 ? `, p ${eb.penalty}` : ''})
                        </span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 900, color: '#FFF', fontSize: '0.95rem' }}>
                        {eb.total}
                      </span>
                    </div>
                  );
                })()}

                {/* Touch to Scorecard Callout Indicator */}
                <div className="scorecard-tap-indicator" style={{ borderRadius: '8px', marginTop: '16px' }}>
                  <span>🏏 Tap anywhere for Full Scorecard, Commentary &amp; Ball-by-Ball →</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB: POINTS TABLE & NRR                                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        {navTab === 'POINTS_TABLE' && (
          <div className="scorecard-widget-body">
            {/* Header & Stage Progress Pill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 Points Table & Net Run Rate (NRR)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                  Stage standings computed from completed match data using official ball-based NRR
                </p>
              </div>

              {/* Badges / Links */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {statsData.overview?.progress && (
                  <span
                    style={{
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      background: 'rgba(192, 39, 45, 0.15)',
                      border: '1px solid rgba(192, 39, 45, 0.35)',
                      color: '#FCA5A5',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    STAGE: {statsData.overview.progress.currentStage || 'GROUP'} ({statsData.overview.progress.completedMatches || 0}/{statsData.overview.progress.totalMatches || 16})
                  </span>
                )}
                <Link
                  href="/tournament"
                  style={{
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFF',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  🏆 Bracket Hub ↗
                </Link>
              </div>
            </div>

            {/* Stage Selector Sub-tabs (Group A, Group B) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', overflowX: 'auto', paddingBottom: '4px' }}>
              {(['A', 'B'] as const).map((g) => {
                const isSelected = tableGroup === g;
                return (
                  <button
                    key={g}
                    onClick={() => setTableGroup(g)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '9999px',
                      border: isSelected ? '1px solid var(--color-gold, #FFB800)' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isSelected ? 'rgba(255, 184, 0, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#FFB800' : 'rgba(255, 255, 255, 0.7)',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {`Group ${g}`}
                  </button>
                );
              })}
            </div>

            {/* Points Table Render */}
            {(() => {
              const overview = statsData.overview;
              let activeStandings: any[] = [];
              let activeGroupMatches: any[] = [];
              let groupTitle = 'Group A Standings';
              let groupSubtitle = 'Top team qualifies directly for Final Four (Seed #1/#2). 2nd advances to Match 9. 3rd advances to Match 10. 4th eliminated.';

              if (tableGroup === 'A') {
                activeStandings =
                  overview?.groups?.groupA?.standings ||
                  (overview?.groups as any)?.['GROUP_A']?.standings ||
                  (overview?.groups as any)?.['Group A']?.standings ||
                  (overview as any)?.groupA ||
                  [];
                activeGroupMatches =
                  overview?.groups?.groupA?.matches ||
                  (overview?.groups as any)?.['GROUP_A']?.matches ||
                  [];
                groupTitle = 'Group A Standings';
                groupSubtitle = 'Top team qualifies directly for Final Four (Seed #1/#2). 2nd advances to Match 9. 3rd advances to Match 10. 4th eliminated.';
              } else {
                activeStandings =
                  overview?.groups?.groupB?.standings ||
                  (overview?.groups as any)?.['GROUP_B']?.standings ||
                  (overview?.groups as any)?.['Group B']?.standings ||
                  (overview as any)?.groupB ||
                  [];
                activeGroupMatches =
                  overview?.groups?.groupB?.matches ||
                  (overview?.groups as any)?.['GROUP_B']?.matches ||
                  [];
                groupTitle = 'Group B Standings';
                groupSubtitle = 'Top team qualifies directly for Final Four (Seed #1/#2). 2nd advances to Match 9. 3rd advances to Match 10. 4th eliminated.';
              }

              // 2. If standings array is empty but teams are in overview, synthesize initial 0-stats standings
              const targetGroupTeams = tableGroup === 'A'
                ? (overview?.groups?.groupA?.teams || (overview?.groups as any)?.['GROUP_A']?.teams || [])
                : (overview?.groups?.groupB?.teams || (overview?.groups as any)?.['GROUP_B']?.teams || []);

              if (activeStandings.length === 0 && targetGroupTeams.length > 0) {
                activeStandings = targetGroupTeams.map((tm: any, i: number) => ({
                  pos: i + 1,
                  rank: i + 1,
                  teamId: tm.id || tm.teamId,
                  teamName: tm.name || tm.teamName,
                  teamShortName: tm.shortName || tm.teamShortName || tm.name,
                  name: tm.name || tm.teamName,
                  shortName: tm.shortName || tm.teamShortName || tm.name,
                  logoUrl: tm.logoUrl,
                  played: 0,
                  won: 0,
                  lost: 0,
                  tied: 0,
                  noResult: 0,
                  points: 0,
                  runsFor: 0,
                  oversFor: 0,
                  displayOversFor: '0.00',
                  runsAgainst: 0,
                  oversAgainst: 0,
                  displayOversAgainst: '0.00',
                  nrr: 0,
                  displayNRR: '0.00',
                }));
              }

              // 3. Fallback: If overview is null/unavailable, extract from statsData.allMatches or matches
              if (activeStandings.length === 0) {
                const sourceMatches = (statsData.allMatches && statsData.allMatches.length > 0)
                  ? statsData.allMatches
                  : matches;

                if (sourceMatches && sourceMatches.length > 0) {
                  const mapTeam = (t: any) => ({
                    id: t.id,
                    name: t.name,
                    shortName: t.shortName || t.name,
                    logoUrl: t.logoUrl,
                  });

                  const teamsThisGroup = new Map<string, any>();
                  sourceMatches.forEach((m: any, idx: number) => {
                    const num = m.matchNumber || idx + 1;
                    const isTarget = tableGroup === 'A'
                      ? (m.groupName === 'GROUP_A' || m.groupName === 'Group A' || (!m.groupName && num <= 8 && num % 2 === 1))
                      : (m.groupName === 'GROUP_B' || m.groupName === 'Group B' || (!m.groupName && num <= 8 && num % 2 === 0));

                    if (isTarget) {
                      if (m.teamA?.id) teamsThisGroup.set(m.teamA.id, mapTeam(m.teamA));
                      if (m.teamB?.id) teamsThisGroup.set(m.teamB.id, mapTeam(m.teamB));
                    }
                  });

                  if (teamsThisGroup.size > 0) {
                    const filteredMatches = sourceMatches.filter((m: any, idx: number) => {
                      const num = m.matchNumber || idx + 1;
                      return tableGroup === 'A'
                        ? (m.groupName === 'GROUP_A' || m.groupName === 'Group A' || (!m.groupName && num <= 8 && num % 2 === 1))
                        : (m.groupName === 'GROUP_B' || m.groupName === 'Group B' || (!m.groupName && num <= 8 && num % 2 === 0));
                    });
                    activeGroupMatches = filteredMatches;

                    try {
                      const formattedMatches = filteredMatches.map((m: any) => ({
                        id: m.id,
                        tournamentId: m.tournamentId || 'cpl-2026',
                        stage: 'GROUP',
                        groupName: tableGroup === 'A' ? 'GROUP_A' : 'GROUP_B',
                        matchNumber: m.matchNumber,
                        teamAId: m.teamA?.id || m.teamAId,
                        teamBId: m.teamB?.id || m.teamBId,
                        status: m.status,
                        result: m.status === 'COMPLETED' ? (m.winnerTeamId ? 'WIN' : 'TIE') : null,
                        winnerTeamId: m.winnerTeamId || null,
                        oversPerInnings: m.oversPerInnings || 4,
                        ballsPerOver: m.ballsPerOver || 4,
                        innings: (m.innings || []).map((inn: any) => ({
                          id: inn.id || `${m.id}-inn-${inn.inningsNumber}`,
                          inningsNumber: inn.inningsNumber,
                          battingTeamId: inn.battingTeamId || (inn.inningsNumber === 1 ? (m.teamA?.id || m.teamAId) : (m.teamB?.id || m.teamBId)),
                          bowlingTeamId: inn.bowlingTeamId || (inn.inningsNumber === 1 ? (m.teamB?.id || m.teamBId) : (m.teamA?.id || m.teamAId)),
                          runs: inn.runs || 0,
                          wickets: inn.wickets || 0,
                          overs: inn.overs || 0,
                          balls: inn.balls || 0,
                          status: inn.status || 'COMPLETED',
                          isAllOut: inn.isAllOut,
                          ballEvents: inn.ballEvents || [],
                        })),
                      }));

                      activeStandings = computeStageStandings(
                        Array.from(teamsThisGroup.values()).map((t) => ({ ...t, groupName: tableGroup === 'A' ? 'GROUP_A' : 'GROUP_B' })),
                        formattedMatches,
                        'GROUP',
                        tableGroup === 'A' ? 'GROUP_A' : 'GROUP_B'
                      );
                    } catch {
                      activeStandings = Array.from(teamsThisGroup.values()).map((t, idx) => ({
                        pos: idx + 1,
                        rank: idx + 1,
                        teamId: t.id,
                        teamName: t.name,
                        teamShortName: t.shortName,
                        name: t.name,
                        shortName: t.shortName,
                        logoUrl: t.logoUrl,
                        played: 0,
                        won: 0,
                        lost: 0,
                        tied: 0,
                        noResult: 0,
                        points: 0,
                        runsFor: 0,
                        oversFor: 0,
                        displayOversFor: '0.00',
                        runsAgainst: 0,
                        oversAgainst: 0,
                        displayOversAgainst: '0.00',
                        nrr: 0,
                        displayNRR: '0.00',
                      }));
                    }
                  }
                }
              }

              const completedGroupMatches = activeGroupMatches.filter((m: any) => m.status === 'COMPLETED').length;
              // In CPL format, each group has 4 matches. Stage is finished once 4 matches complete or all teams played 2
              const isGroupFinished =
                (activeGroupMatches.length >= 4 && completedGroupMatches >= 4) ||
                (activeStandings.length === 4 && activeStandings.every((s: any) => Number(s.played || 0) >= 2));

              return (
                <div>
                  <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                      <strong style={{ color: '#FFF' }}>{groupTitle}:</strong> {groupSubtitle}
                    </div>
                    {activeGroupMatches.length > 0 && (
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-data, monospace)',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isGroupFinished ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${isGroupFinished ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: isGroupFinished ? '#10B981' : 'rgba(255, 255, 255, 0.6)',
                        }}
                      >
                        {isGroupFinished ? 'STAGE COMPLETED' : `IN PROGRESS (${completedGroupMatches}/4 MATCHES)`}
                      </div>
                    )}
                  </div>

                  {statsLoading && !overview ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                      Loading tournament standings & NRR...
                    </div>
                  ) : activeStandings.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📊</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>
                        Standings Pending Match Data
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0, maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
                        {`Standings for ${groupTitle} will update automatically as matches in this group are completed.`}
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            <th style={{ padding: '10px 14px', width: '40px' }}>POS</th>
                            <th style={{ padding: '10px 14px' }}>TEAM</th>
                            <th style={{ padding: '10px 10px', textAlign: 'center', width: '40px' }}>P</th>
                            <th style={{ padding: '10px 10px', textAlign: 'center', width: '40px' }}>W</th>
                            <th style={{ padding: '10px 10px', textAlign: 'center', width: '40px' }}>L</th>
                            <th style={{ padding: '10px 10px', textAlign: 'center', width: '40px' }}>T</th>
                            <th style={{ padding: '10px 10px', textAlign: 'center', width: '40px' }}>NR</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', width: '55px', fontWeight: 900, color: 'var(--color-gold, #FFB800)' }}>PTS</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>RUNS FOR (OV)</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center' }}>RUNS AGN (OV)</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', width: '85px', fontWeight: 900, color: '#10B981' }}>NRR</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', width: '110px' }}>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeStandings.map((s: any, idx: number) => {
                            const isPlayoff = idx === 0;
                            const isM9 = idx === 1;
                            const isM10 = idx === 2;
                            const isElim = idx === 3;

                            const statusColor = isPlayoff ? '#10B981' : isM9 ? '#3B82F6' : isM10 ? '#F59E0B' : '#EF4444';
                            const statusBg = isPlayoff ? 'rgba(16, 185, 129, 0.18)' : isM9 ? 'rgba(59, 130, 246, 0.18)' : isM10 ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.18)';
                            const statusBorder = isPlayoff ? 'rgba(16, 185, 129, 0.35)' : isM9 ? 'rgba(59, 130, 246, 0.35)' : isM10 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)';
                            const statusLabel = isPlayoff ? 'PLAYOFF' : isM9 ? 'MATCH 9' : isM10 ? 'MATCH 10' : 'ELIMINATED';

                            const logo = normalizeImageUrl(s.logoUrl || s.teamLogoUrl);
                            const posColor = isGroupFinished ? statusColor : idx === 0 ? 'var(--color-gold, #FFB800)' : 'rgba(255, 255, 255, 0.8)';
                            const rowBg = isGroupFinished
                              ? (isPlayoff ? 'rgba(16, 185, 129, 0.05)' : isM9 ? 'rgba(59, 130, 246, 0.04)' : isM10 ? 'rgba(245, 158, 11, 0.04)' : 'transparent')
                              : 'transparent';

                            return (
                              <tr
                                key={s.teamId || idx}
                                style={{
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                  background: rowBg,
                                }}
                              >
                                <td style={{ padding: '12px 14px', fontWeight: 800, color: posColor }}>
                                  {s.pos || idx + 1}
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: 700, color: '#FFF' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {logo ? (
                                      <img
                                        src={logo}
                                        alt={s.teamName}
                                        referrerPolicy="no-referrer"
                                        style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255, 255, 255, 0.15)' }}
                                        onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = 'none';
                                          const fallback = (e.currentTarget.parentElement as HTMLElement)?.querySelector('.team-badge-fallback');
                                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      className="team-badge-fallback"
                                      style={{
                                        display: logo ? 'none' : 'flex',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2) 0%, rgba(255, 184, 0, 0.05) 100%)',
                                        border: '1px solid rgba(255, 184, 0, 0.3)',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.62rem',
                                        fontWeight: 900,
                                        color: 'var(--color-gold, #FFB800)',
                                        flexShrink: 0,
                                        letterSpacing: '-0.02em',
                                      }}
                                    >
                                      {(s.teamShortName || s.teamName || 'T').slice(0, 2).toUpperCase()}
                                    </div>
                                    <span>{s.teamName}</span>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.76rem', fontWeight: 600 }}>({s.teamShortName})</span>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', color: 'rgba(255, 255, 255, 0.8)' }}>{s.played ?? 0}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', color: '#10B981', fontWeight: 700 }}>{s.won ?? 0}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', color: 'rgba(255, 255, 255, 0.6)' }}>{s.lost ?? 0}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', color: 'rgba(255, 255, 255, 0.6)' }}>{s.tied ?? 0}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', color: 'rgba(255, 255, 255, 0.6)' }}>{s.noResult ?? 0}</td>
                                <td style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', fontWeight: 900, fontSize: '1rem', color: 'var(--color-gold, #FFB800)' }}>
                                  {s.points ?? 0}
                                </td>
                                <td style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.75)' }}>
                                  {s.runsFor ?? 0} / {s.displayOversFor || '0.00'}
                                </td>
                                <td style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.75)' }}>
                                  {s.runsAgainst ?? 0} / {s.displayOversAgainst || '0.00'}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', fontWeight: 900, color: (typeof s.nrr === 'number' ? s.nrr : 0) >= 0 ? '#10B981' : '#EF4444' }}>
                                  {s.displayNRR || (typeof s.nrr === 'number' ? (s.nrr > 0 ? `+${s.nrr.toFixed(2)}` : s.nrr.toFixed(2)) : '0.00')}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                  {isGroupFinished ? (
                                    <span
                                      style={{
                                        padding: '3px 8px',
                                        borderRadius: '9999px',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.04em',
                                        background: statusBg,
                                        color: statusColor,
                                        border: `1px solid ${statusBorder}`,
                                        display: 'inline-block',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {statusLabel}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '0.85rem', fontWeight: 600 }}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* NRR Formula & Rules Note */}
                  <div
                    style={{
                      marginTop: '20px',
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-gold, #FFB800)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        📐 Official CPL Softball Net Run Rate Formula
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
                        NRR = (Runs Scored ÷ Effective Overs Faced) − (Runs Conceded ÷ Effective Overs Bowled).<br />
                        Effective overs = legal balls ÷ ballsPerOver. In an all-out innings, the team is debited with the full allotted overs.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link
                        href="/tournament"
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          background: 'rgba(192, 39, 45, 0.2)',
                          border: '1px solid rgba(192, 39, 45, 0.4)',
                          color: '#FCA5A5',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        🏆 Tournament Hub ↗
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: ALL MATCHES / PAST RESULTS                             */}
        {/* ───────────────────────────────────────────────────────────── */}
        {navTab === 'ALL_MATCHES' && (
          <div className="scorecard-widget-body">
            {/* Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#FFF' }}>
                  Tournament Match Schedule & Results
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                  All past completed fixtures and upcoming match cards
                </p>
              </div>

              {/* Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                {(['ALL', 'COMPLETED', 'LIVE', 'UPCOMING'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setMatchFilter(filter)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: matchFilter === filter ? 'rgba(255, 184, 0, 0.2)' : 'transparent',
                      color: matchFilter === filter ? '#FFB800' : 'rgba(255,255,255,0.6)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {filter === 'ALL' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {statsLoading && statsData.allMatches.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Loading tournament matches...
              </div>
            ) : filteredMatches.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                No matches found under this filter.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filteredMatches.map((m) => {
                  const inningsList = m.innings || [];
                  const teamAId = m.teamA?.id || m.teamAId;
                  const teamBId = m.teamB?.id || m.teamBId;
                  const teamAReg = inningsList.find((i: any) => i.battingTeamId === teamAId && !i.isSuperOver);
                  const teamASO = inningsList.find((i: any) => i.battingTeamId === teamAId && i.isSuperOver);
                  const teamBReg = inningsList.find((i: any) => i.battingTeamId === teamBId && !i.isSuperOver);
                  const teamBSO = inningsList.find((i: any) => i.battingTeamId === teamBId && i.isSuperOver);

                  let teamAScore = teamAReg ? `${teamAReg.runs}/${teamAReg.wickets} (${teamAReg.overs}.${teamAReg.balls})` : '-';
                  if (teamASO) teamAScore += ` & S/O ${teamASO.runs}/${teamASO.wickets}`;

                  let teamBScore = teamBReg ? `${teamBReg.runs}/${teamBReg.wickets} (${teamBReg.overs}.${teamBReg.balls})` : '-';
                  if (teamBSO) teamBScore += ` & S/O ${teamBSO.runs}/${teamBSO.wickets}`;

                  return (
                    <div
                      key={m.id}
                      className="scorecard-interactive-card"
                      onClick={() => router.push(`/scorecard?matchId=${m.id}`)}
                      title="Tap to view match scorecard"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          router.push(`/scorecard?matchId=${m.id}`);
                        }
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Top bar: Status & Venue */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            letterSpacing: '0.04em',
                            background: m.status === 'LIVE' ? 'rgba(239, 68, 68, 0.2)' : m.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            color: m.status === 'LIVE' ? '#EF4444' : m.status === 'COMPLETED' ? '#10B981' : 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {m.status}
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                          {m.venue || 'Ratmalana Ground'}
                        </span>
                      </div>

                      {/* Teams & Scores */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Team A Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {m.teamA.logoUrl ? (
                              <img src={m.teamA.logoUrl} alt={m.teamA.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '1rem' }}>🏏</span>
                            )}
                            <span style={{ fontWeight: m.winnerTeamId === m.teamA.id ? 800 : 600, color: m.winnerTeamId === m.teamA.id ? '#FFF' : 'rgba(255,255,255,0.8)', fontSize: '0.92rem' }}>
                              {m.teamA.name} {m.winnerTeamId === m.teamA.id && '🏆'}
                            </span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 800, fontSize: '0.92rem', color: m.winnerTeamId === m.teamA.id ? '#FFB800' : 'rgba(255,255,255,0.7)' }}>
                            {teamAScore}
                          </span>
                        </div>

                        {/* Team B Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {m.teamB.logoUrl ? (
                              <img src={m.teamB.logoUrl} alt={m.teamB.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '1rem' }}>🦁</span>
                            )}
                            <span style={{ fontWeight: m.winnerTeamId === m.teamB.id ? 800 : 600, color: m.winnerTeamId === m.teamB.id ? '#FFF' : 'rgba(255,255,255,0.8)', fontSize: '0.92rem' }}>
                              {m.teamB.name} {m.winnerTeamId === m.teamB.id && '🏆'}
                            </span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-data, monospace)', fontWeight: 800, fontSize: '0.92rem', color: m.winnerTeamId === m.teamB.id ? '#FFB800' : 'rgba(255,255,255,0.7)' }}>
                            {teamBScore}
                          </span>
                        </div>
                      </div>

                      {/* Result Note */}
                      {m.resultNote && (
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8AB4F8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                          {m.resultNote}
                        </div>
                      )}

                      {/* Scorecard Action */}
                      <Link
                        href={`/scorecard?matchId=${m.id}`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          textAlign: 'center',
                          padding: '8px',
                          borderRadius: '6px',
                          color: '#FFB800',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          marginTop: '4px',
                        }}
                      >
                        View Full Scorecard →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: TOP RUN SCORERS (BATTING LEADERBOARD)                  */}
        {/* ───────────────────────────────────────────────────────────── */}
        {navTab === 'TOP_BATTERS' && (
          <div className="scorecard-widget-body">
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#FFF' }}>
                🏏 Top Run Scorers (Orange Cap Race)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                Highest tournament run aggregates across all innings
              </p>
            </div>

            {statsData.topBatters.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                No batting statistics recorded yet.
              </div>
            ) : (
              <>
                {/* Top 3 Podium Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {statsData.topBatters.slice(0, 3).map((batter, idx) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const borders = ['#FFD700', '#C0C0C0', '#CD7F32'];
                    return (
                      <div
                        key={batter.playerId}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: `1.5px solid ${borders[idx]}44`,
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          position: 'relative',
                        }}
                      >
                        <span style={{ fontSize: '1.8rem' }}>{medals[idx]}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: borders[idx], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {idx === 0 ? 'Leading Run Scorer' : `Rank #${idx + 1}`}
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>
                            {batter.playerName}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                            {batter.teamName} ({batter.teamShortName})
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-gold, #FFB800)' }}>
                            {batter.totalRuns}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                            SR: {batter.strikeRate}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Batting Leaderboard Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <th style={{ padding: '10px 14px' }}>POS</th>
                        <th style={{ padding: '10px 14px' }}>BATTER</th>
                        <th style={{ padding: '10px 14px' }}>TEAM</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>INNS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--color-gold, #FFB800)' }}>RUNS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>BALLS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>HS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>SR</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>4s</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>6s</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>50s</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.topBatters.map((b, index) => (
                        <tr
                          key={b.playerId}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: 800, color: index < 3 ? '#FFB800' : 'rgba(255,255,255,0.4)' }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#FFF' }}>
                            {b.playerName}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {b.teamShortName}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {b.inningsCount}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', fontWeight: 900, fontSize: '1rem', color: 'var(--color-gold, #FFB800)' }}>
                            {b.totalRuns}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {b.ballsFaced}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#FFF' }}>
                            {b.highestScore}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.8)' }}>
                            {b.strikeRate}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {b.fours}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {b.sixes}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {b.fifties}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 4: TOP WICKET TAKERS (BOWLING LEADERBOARD)                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {navTab === 'TOP_BOWLERS' && (
          <div className="scorecard-widget-body">
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#FFF' }}>
                🎯 Top Wicket Takers (Purple Cap Race)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                Highest tournament wicket aggregates across all innings
              </p>
            </div>

            {statsData.topBowlers.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                No bowling statistics recorded yet.
              </div>
            ) : (
              <>
                {/* Top 3 Podium Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {statsData.topBowlers.slice(0, 3).map((bowler, idx) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const borders = ['#A855F7', '#C0C0C0', '#CD7F32'];
                    return (
                      <div
                        key={bowler.playerId}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: `1.5px solid ${borders[idx]}44`,
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          position: 'relative',
                        }}
                      >
                        <span style={{ fontSize: '1.8rem' }}>{medals[idx]}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: borders[idx], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {idx === 0 ? 'Leading Wicket Taker' : `Rank #${idx + 1}`}
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>
                            {bowler.playerName}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                            {bowler.teamName} ({bowler.teamShortName})
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '1.5rem', fontWeight: 900, color: '#A855F7' }}>
                            {bowler.wickets} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>wkts</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                            Econ: {bowler.economyRate}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bowling Leaderboard Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <th style={{ padding: '10px 14px' }}>POS</th>
                        <th style={{ padding: '10px 14px' }}>BOWLER</th>
                        <th style={{ padding: '10px 14px' }}>TEAM</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>INNS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>OVERS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>MDNS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>RUNS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', color: '#A855F7' }}>WKTS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>ECON</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>BEST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.topBowlers.map((bw, index) => (
                        <tr
                          key={bw.playerId}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: 800, color: index < 3 ? '#A855F7' : 'rgba(255,255,255,0.4)' }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#FFF' }}>
                            {bw.playerName}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {bw.teamShortName}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {bw.inningsCount}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {bw.oversFormatted}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {bw.maidens}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {bw.runsConceded}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', fontWeight: 900, fontSize: '1rem', color: '#A855F7' }}>
                            {bw.wickets}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.8)' }}>
                            {bw.economyRate}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#FFF' }}>
                            {bw.bestFigures}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
