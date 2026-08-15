'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ScoreBroadcastPayload } from '@/lib/scoring/scoring-realtime';

export default function LiveScoreWidget() {
  const [matches, setMatches] = useState<ScoreBroadcastPayload[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 1. Fetch initial live matches from database
  const fetchLiveMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches/live', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.matches && data.matches.length > 0) {
        setMatches(data.matches);
        setActiveMatchId((prev) => prev || data.matches[0].matchId);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('[LiveScoreWidget] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMatches();
  }, [fetchLiveMatches]);

  // 2. Real-time Subscription via Supabase Realtime
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

    return () => {
      supabase.removeChannel(liveChannel);
      if (matchChannel) supabase.removeChannel(matchChannel);
    };
  }, [activeMatchId, fetchLiveMatches]);

  const currentMatch = matches.find((m) => m.matchId === activeMatchId) || matches[0];

  if (loading) {
    return (
      <div id="live-scores" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-md) var(--space-md)' }}>
        <div style={{ background: 'var(--color-paper-dark)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
          Loading live tournament scores...
        </div>
      </div>
    );
  }

  if (!currentMatch) {
    return (
      <div id="live-scores" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-md) var(--space-md)' }}>
        <div style={{ background: 'var(--color-paper-dark)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--color-border-dark)', padding: '32px', textAlign: 'center', color: 'var(--color-paper)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏏</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px', color: '#FFF' }}>CPL Live Match Center</h3>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
            No matches currently in progress. Matches will appear here with live ball-by-ball coverage as soon as play begins!
          </p>
        </div>
      </div>
    );
  }

  const currentInnings = currentMatch.innings;

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
                background: currentMatch.status === 'LIVE' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {currentMatch.status === 'LIVE' && (
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
              {currentMatch.status}
            </span>

            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>
              {currentMatch.match.venue || 'Main Stadium'} • Innings {currentMatch.currentInnings}
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

        {/* Main Scorecard Body */}
        <div style={{ padding: '20px 18px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              paddingBottom: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Team A */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '120px', flex: '1 1 auto' }}>
              {currentMatch.match.teamA.logoUrl ? (
                <img
                  src={currentMatch.match.teamA.logoUrl}
                  alt={currentMatch.match.teamA.name}
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
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-paper)' }}>
                  {currentMatch.match.teamA.name}
                </div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                  {currentMatch.match.teamA.shortName}
                </div>
              </div>
            </div>

            {/* Score in Center */}
            <div style={{ textAlign: 'center', minWidth: '140px', flex: '1 1 auto' }}>
              {currentInnings ? (
                <div>
                  <div
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
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-paper)' }}>
                    {currentInnings.overs}.{currentInnings.balls} / {currentMatch.match.oversPerInnings} Overs
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                    CRR: {currentInnings.crr} {currentInnings.rrr ? `• RRR: ${currentInnings.rrr}` : ''}
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.5)' }}>
                  VS
                </div>
              )}
            </div>

            {/* Team B */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', minWidth: '120px', flex: '1 1 auto', textAlign: 'right' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-paper)' }}>
                  {currentMatch.match.teamB.name}
                </div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                  {currentMatch.match.teamB.shortName}
                </div>
              </div>
              {currentMatch.match.teamB.logoUrl ? (
                <img
                  src={currentMatch.match.teamB.logoUrl}
                  alt={currentMatch.match.teamB.name}
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

          {/* Result Note if match finished */}
          {currentMatch.match.resultNote && (
            <div style={{ marginTop: '14px', background: 'rgba(192, 39, 45, 0.15)', border: '1px solid var(--color-accent)', color: 'var(--color-paper)', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, textAlign: 'center', fontSize: '0.9rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
              🏆 {currentMatch.match.resultNote}
            </div>
          )}

          {/* Live Pitch Details: Batters, Bowler, and Recent Balls */}
          {currentMatch.status === 'LIVE' && currentInnings && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginTop: '16px',
              }}
            >
              {/* Batters On Pitch */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Batters on Strike
                </div>

                {currentMatch.striker ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--color-accent-bright)', fontWeight: 900, fontSize: '0.85rem' }}>*</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-paper)' }}>{currentMatch.striker.name}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-data)', fontWeight: 800, color: 'var(--color-gold)', fontSize: '0.95rem' }}>
                      {currentMatch.striker.runs}{' '}
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                        ({currentMatch.striker.balls}b • {currentMatch.striker.fours}x4 • {currentMatch.striker.sixes}x6)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.4)' }}>Striker not set</div>
                )}

                {currentMatch.nonStriker && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                      {currentMatch.nonStriker.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-data)', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                      {currentMatch.nonStriker.runs}{' '}
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                        ({currentMatch.nonStriker.balls}b)
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Bowler Figures & Recent */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Bowler
                </div>

                {currentMatch.bowler ? (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFF' }}>
                      {currentMatch.bowler.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 700, marginTop: '2px' }}>
                      {currentMatch.bowler.wickets} - {currentMatch.bowler.runsConceded}{' '}
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                        ({currentMatch.bowler.overs} ov)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.4)' }}>Bowler not set</div>
                )}
              </div>
            </div>
          )}

          {/* Recent Balls Strip */}
          {currentMatch.recentBalls && currentMatch.recentBalls.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>
                Recent:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {currentMatch.recentBalls.map((b, idx) => (
                  <span
                    key={b.id || idx}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: b.isWicket ? '#FF4D4D' : b.runs === 4 ? '#28A745' : b.runs === 6 ? '#8A2BE2' : 'rgba(255, 255, 255, 0.1)',
                      color: '#FFF',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {b.display}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Link to Full Scorecard */}
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
      </div>
    </div>
  );
}
