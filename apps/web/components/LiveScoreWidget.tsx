'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ScoreBroadcastPayload } from '@/lib/scoring/scoring-realtime';

type NavTab = 'LIVE' | 'ALL_MATCHES' | 'TOP_BATTERS' | 'TOP_BOWLERS' | 'MVP';

export default function LiveScoreWidget() {
  const [navTab, setNavTab] = useState<NavTab>('LIVE');
  const [matches, setMatches] = useState<ScoreBroadcastPayload[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const inFlightRef = useRef<boolean>(false);

  // Tournament stats for All Matches & Leaderboards
  const [statsData, setStatsData] = useState<{
    allMatches: any[];
    topBatters: any[];
    topBowlers: any[];
    mvpLeaderboard: any[];
  }>({
    allMatches: [],
    topBatters: [],
    topBowlers: [],
    mvpLeaderboard: [],
  });
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'COMPLETED' | 'LIVE' | 'UPCOMING'>('ALL');

  // 1. Fetch initial live matches from database
  const fetchLiveMatches = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch(`/api/matches/live?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.matches && data.matches.length > 0) {
        setMatches(data.matches);
        setActiveMatchId((prev) => prev || data.matches[0].matchId);
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
        });
      }
    } catch (err) {
      console.error('[LiveScoreWidget] Stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMatches();
    fetchTournamentStats();
  }, [fetchLiveMatches, fetchTournamentStats]);

  // 3. Real-time Subscription via Supabase Realtime
  useEffect(() => {
    const supabase = createClient();

    // Global live matches channel
    const liveChannel = supabase.channel('matches:live');

    liveChannel
      .on('broadcast', { event: 'score_update' }, ({ payload }: { payload: ScoreBroadcastPayload }) => {
        if (!payload || !payload.matchId) return;

        setMatches((prevMatches) => {
          const exists = prevMatches.some((m) => m.matchId === payload.matchId);
          if (exists) {
            return prevMatches.map((m) => (m.matchId === payload.matchId ? payload : m));
          } else {
            return [payload, ...prevMatches];
          }
        });

        setActiveMatchId((prev) => prev || payload.matchId);
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Re-sync on fresh subscription / reconnect
          fetchLiveMatches();
          fetchTournamentStats();
        }
      });

    // Also subscribe specifically to active match channel if set
    let matchChannel: any = null;
    if (activeMatchId) {
      matchChannel = supabase.channel(`match:${activeMatchId}`);
      matchChannel
        .on('broadcast', { event: 'score_update' }, ({ payload }: { payload: ScoreBroadcastPayload }) => {
          if (!payload) return;
          setMatches((prev) => prev.map((m) => (m.matchId === payload.matchId ? payload : m)));
          setLastUpdated(new Date().toLocaleTimeString());
        })
        .subscribe();
    }

    // Relaxed 12s safety sync (Supabase Realtime handles instant 0ms score updates)
    const interval = setInterval(() => {
      fetchLiveMatches();
      if (navTab !== 'LIVE') fetchTournamentStats();
    }, 12000);

    return () => {
      try {
        supabase.removeChannel(liveChannel);
        if (matchChannel) supabase.removeChannel(matchChannel);
      } catch (e) {}
      clearInterval(interval);
    };
  }, [activeMatchId, fetchLiveMatches, fetchTournamentStats, navTab]);

  const currentMatch = matches.find((m) => m.matchId === activeMatchId) || matches[0];
  const currentInnings = currentMatch?.innings;

  const filteredMatches = statsData.allMatches.filter((m) => {
    if (matchFilter === 'ALL') return true;
    return m.status === matchFilter;
  });

  return (
    <div
      id="live-scores"
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--space-md) var(--space-md)',
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
        {/* Main Navigation Tabs: Live Match | All Matches | Top Batsmen | Top Bowlers | Man of the Series */}
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

          <button
            onClick={() => {
              setNavTab('MVP');
              fetchTournamentStats();
            }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: navTab === 'MVP' ? '3px solid #F59E0B' : '3px solid transparent',
              color: navTab === 'MVP' ? '#F59E0B' : 'rgba(255, 255, 255, 0.6)',
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
            ⭐ Man of the Series
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
                    background: currentMatch?.status === 'LIVE' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
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
                  {currentMatch?.status || 'COMPLETED'}
                </span>

                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>
                  {currentMatch?.match.venue || 'Main Stadium'} • {currentMatch?.currentInnings >= 3 ? `⚡ Super Over ${currentMatch.currentInnings - 2}` : `Innings ${currentMatch?.currentInnings || 1}`}
                </span>

                {lastUpdated && (
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                    (Live: {lastUpdated})
                  </span>
                )}
              </div>

              {/* Match Switcher Tabs if multiple matches */}
              {matches.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                  {matches.map((m) => (
                    <button
                      key={m.matchId}
                      onClick={() => setActiveMatchId(m.matchId)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: m.matchId === activeMatchId ? 'rgba(255, 184, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: m.matchId === activeMatchId ? '#FFB800' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.match.teamA.shortName} vs {m.match.teamB.shortName}
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
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏏</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px', color: '#FFF' }}>CPL Live Match Center</h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                  No matches currently in progress. Select another tab above to see past results and tournament leaderboards!
                </p>
              </div>
            ) : currentMatch.status === 'COMPLETED' ? (
              (() => {
                const teamAId = currentMatch.match.teamA.id;
                const teamBId = currentMatch.match.teamB.id;
                const allInnings = currentMatch.allInningsSummary || [];

                const teamAReg = allInnings.find((i) => i.battingTeamId === teamAId && !i.isSuperOver);
                const teamASO = allInnings.find((i) => i.battingTeamId === teamAId && i.isSuperOver);

                const teamBReg = allInnings.find((i) => i.battingTeamId === teamBId && !i.isSuperOver);
                const teamBSO = allInnings.find((i) => i.battingTeamId === teamBId && i.isSuperOver);

                let teamAScoreText = teamAReg ? `${teamAReg.runs}/${teamAReg.wickets}` : (currentInnings?.battingTeam?.id === teamAId ? `${currentInnings.runs}/${currentInnings.wickets}` : '-');
                let teamAOversText = teamAReg ? `(${teamAReg.overs}${teamAReg.balls > 0 ? `.${teamAReg.balls}` : ''})` : '';
                if (teamASO) {
                  teamAScoreText += ` & ${teamASO.runs}/${teamASO.wickets}`;
                  teamAOversText += ` & (${teamASO.overs}.${teamASO.balls})`;
                }

                let teamBScoreText = teamBReg ? `${teamBReg.runs}/${teamBReg.wickets}` : (currentInnings?.battingTeam?.id === teamBId ? `${currentInnings.runs}/${currentInnings.wickets}` : '-');
                let teamBOversText = teamBReg ? `(${teamBReg.overs}${teamBReg.balls > 0 ? `.${teamBReg.balls}` : ''})` : '';
                if (teamBSO) {
                  teamBScoreText += ` & ${teamBSO.runs}/${teamBSO.wickets}`;
                  teamBOversText += ` & (${teamBSO.overs}.${teamBSO.balls})`;
                }

                return (
                  <div style={{ padding: '20px 20px 24px', textAlign: 'center' }}>
                    {/* Header Subtitle */}
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '18px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      2026 Computing Premier League &nbsp;•&nbsp; Match Completed
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
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: '10px',
                        padding: '14px 10px',
                        gap: '8px',
                      }}>
                        {currentMatch.match.teamA.logoUrl ? (
                          <img
                            src={currentMatch.match.teamA.logoUrl}
                            alt={currentMatch.match.teamA.name}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }}
                          />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
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
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
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
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: '10px',
                        padding: '14px 10px',
                        gap: '8px',
                      }}>
                        {currentMatch.match.teamB.logoUrl ? (
                          <img
                            src={currentMatch.match.teamB.logoUrl}
                            alt={currentMatch.match.teamB.name}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }}
                          />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
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
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
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
                  </div>
                );
              })()
            ) : (
              <div style={{ padding: '24px' }}>
                {/* Dual Team Score Header Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Team A Score Block */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {currentMatch.match.teamA.logoUrl ? (
                      <img
                        src={currentMatch.match.teamA.logoUrl}
                        alt={currentMatch.match.teamA.name}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.2)' }}
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
                        }}
                      >
                        🏏
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF' }}>
                        {currentMatch.match.teamA.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {currentInnings?.battingTeam?.id === currentMatch.match.teamA.id ? 'Batting' : 'Fielding'}
                      </div>
                    </div>
                  </div>

                  {/* Center Score & Overs */}
                  <div style={{ textAlign: 'center' }}>
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
                      {currentMatch.match.oversPerInnings ? ` / ${currentMatch.match.oversPerInnings} ov` : ''}
                    </div>
                    {currentMatch.currentInnings >= 3 && (
                      <div style={{ marginTop: '4px', display: 'inline-block', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #F59E0B', color: '#FBBF24', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                        ⚡ SUPER OVER
                      </div>
                    )}
                    {currentMatch.isFreeHit && (
                      <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(234, 88, 12, 0.3) 100%)', border: '1.5px solid #F59E0B', color: '#FEF08A', fontSize: '0.72rem', fontWeight: 900, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)' }}>
                        ⚡ FREE HIT
                      </div>
                    )}
                  </div>

                  {/* Team B Score Block */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexDirection: 'row-reverse' }}>
                    {currentMatch.match.teamB.logoUrl ? (
                      <img
                        src={currentMatch.match.teamB.logoUrl}
                        alt={currentMatch.match.teamB.name}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.2)' }}
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
                        }}
                      >
                        🦁
                      </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF' }}>
                        {currentMatch.match.teamB.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {currentInnings?.battingTeam?.id === currentMatch.match.teamB.id ? 'Batting' : 'Fielding'}
                      </div>
                    </div>
                  </div>
                </div>

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
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      CRR: <strong style={{ color: '#FFF' }}>{currentMatch.chase?.crr || currentInnings?.crr || '0.00'}</strong>
                    </span>
                    {currentMatch.chase?.isChase && currentMatch.chase?.target ? (
                      <>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
                            {' '}({currentMatch.striker?.balls ?? 0}b, {currentMatch.striker?.fours ?? 0}x4, {currentMatch.striker?.sixes ?? 0}x6)
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
                            {' '}({currentMatch.nonStriker?.balls ?? 0}b)
                          </span>
                        </div>
                      </div>
                    </div>
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
                      {currentMatch.recentBalls.map((b, idx) => (
                        <div key={b.id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: b.isWicket ? '#EF4444' : b.runs === 4 ? '#10B981' : b.runs === 6 ? '#8B5CF6' : b.extraType === 'WIDE' || b.extraType === 'NO_BALL' ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
                              color: b.extraType === 'WIDE' || b.extraType === 'NO_BALL' ? '#000' : '#FFF',
                              fontSize: '0.75rem',
                              fontWeight: 900,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            }}
                          >
                            {b.display}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700 }}>
                            .{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Link to Full Scorecard */}
            {currentMatch && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '10px 24px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Real-time updates powered by Supabase Realtime
                </span>
                <Link
                  href={`/scorecard?matchId=${currentMatch.matchId}`}
                  style={{
                    color: 'var(--color-primary-light, #FFB800)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  View Full Scorecard & Commentary →
                </Link>
              </div>
            )}
          </>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: ALL MATCHES / PAST RESULTS                             */}
        {/* ───────────────────────────────────────────────────────────── */}
        {navTab === 'ALL_MATCHES' && (
          <div style={{ padding: '24px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {filteredMatches.map((m) => {
                  const teamAReg = m.innings.find((i: any) => i.battingTeamId === m.teamA.id && !i.isSuperOver);
                  const teamASO = m.innings.find((i: any) => i.battingTeamId === m.teamA.id && i.isSuperOver);
                  const teamBReg = m.innings.find((i: any) => i.battingTeamId === m.teamB.id && !i.isSuperOver);
                  const teamBSO = m.innings.find((i: any) => i.battingTeamId === m.teamB.id && i.isSuperOver);

                  let teamAScore = teamAReg ? `${teamAReg.runs}/${teamAReg.wickets} (${teamAReg.overs}.${teamAReg.balls})` : '-';
                  if (teamASO) teamAScore += ` & S/O ${teamASO.runs}/${teamASO.wickets}`;

                  let teamBScore = teamBReg ? `${teamBReg.runs}/${teamBReg.wickets} (${teamBReg.overs}.${teamBReg.balls})` : '-';
                  if (teamBSO) teamBScore += ` & S/O ${teamBSO.runs}/${teamBSO.wickets}`;

                  return (
                    <div
                      key={m.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'border-color 0.2s ease',
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
          <div style={{ padding: '24px' }}>
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
          <div style={{ padding: '24px' }}>
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

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 5: MAN OF THE SERIES (MVP LEADERBOARD)                    */}
        {/* ───────────────────────────────────────────────────────────── */}
        {navTab === 'MVP' && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⭐ Man of the Series (Tournament MVP)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                  Comprehensive all-round impact ranking based on runs, wickets, boundaries & maidens
                </p>
              </div>

              {/* MVP Formula Info Badge */}
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.72rem', color: '#FBBF24' }}>
                ⚡ 1 pt/run • 25 pt/wicket • 15 pt/maiden • 3 pt/six
              </div>
            </div>

            {statsData.mvpLeaderboard.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                No MVP points accumulated yet.
              </div>
            ) : (
              <>
                {/* Top 3 Crowned Podium Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {statsData.mvpLeaderboard.slice(0, 3).map((mvp, idx) => {
                    const crowns = ['👑 #1 MVP', '🥈 #2 MVP', '🥉 #3 MVP'];
                    const borderColors = ['#F59E0B', '#C0C0C0', '#CD7F32'];
                    return (
                      <div
                        key={mvp.playerId}
                        style={{
                          background: idx === 0 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(0, 0, 0, 0.4))' : 'rgba(255, 255, 255, 0.03)',
                          border: `1.5px solid ${borderColors[idx]}55`,
                          borderRadius: '12px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: borderColors[idx], letterSpacing: '0.04em' }}>
                            {crowns[idx]}
                          </span>
                          <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                            {mvp.mvpPoints} PTS
                          </span>
                        </div>

                        <div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FFF' }}>
                            {mvp.playerName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                            {mvp.teamName} ({mvp.teamShortName}) • {mvp.role}
                          </div>
                        </div>

                        {/* Stats Breakdown Strip */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem' }}>
                          <div>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Runs: </span>
                            <strong style={{ color: '#FFB800' }}>{mvp.runs}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Wkts: </span>
                            <strong style={{ color: '#A855F7' }}>{mvp.wickets}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Boundaries: </span>
                            <strong style={{ color: '#10B981' }}>{mvp.fours + mvp.sixes}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* MVP Standings Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <th style={{ padding: '10px 14px' }}>RANK</th>
                        <th style={{ padding: '10px 14px' }}>PLAYER</th>
                        <th style={{ padding: '10px 14px' }}>TEAM</th>
                        <th style={{ padding: '10px 14px' }}>ROLE</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', color: '#FBBF24' }}>MVP PTS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>RUNS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>WKTS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>4s / 6s</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>MDNS</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>HS / BEST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.mvpLeaderboard.map((m) => (
                        <tr
                          key={m.playerId}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: m.rank <= 3 ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: 800, color: m.rank === 1 ? '#F59E0B' : m.rank <= 3 ? '#FFF' : 'rgba(255,255,255,0.4)' }}>
                            {m.rank === 1 ? '👑 #1' : `#${m.rank}`}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#FFF' }}>
                            {m.playerName}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {m.teamShortName}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                            {m.role}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-data, monospace)', fontWeight: 900, fontSize: '1rem', color: '#FBBF24' }}>
                            {m.mvpPoints}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#FFB800', fontWeight: 700 }}>
                            {m.runs}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#A855F7', fontWeight: 700 }}>
                            {m.wickets}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {m.fours} / {m.sixes}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>
                            {m.maidens}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>
                            {m.highestScore > 0 ? `HS: ${m.highestScore}` : ''} {m.bestBowling !== '-' ? `| ${m.bestBowling}` : ''}
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
