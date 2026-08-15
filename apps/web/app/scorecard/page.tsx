'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createClient } from '@/utils/supabase/client';

function ScorecardContent() {
  const searchParams = useSearchParams();
  const requestedMatchId = searchParams.get('matchId');

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'inn1' | 'inn2'>('inn1');
  const [lastLivePing, setLastLivePing] = useState<string>('');

  const fetchScorecard = useCallback(async () => {
    try {
      if (requestedMatchId) {
        const res = await fetch(`/api/matches/${requestedMatchId}/scorecard`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.match) {
          setMatch(data.match);
          if (data.match.currentInnings === 2) setActiveTab('inn2');
          setLastLivePing(new Date().toLocaleTimeString());
        }
      } else {
        // Fetch first live match
        const res = await fetch('/api/matches/live', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.matches && data.matches.length > 0) {
          const firstMatchId = data.matches[0].matchId;
          const matchRes = await fetch(`/api/matches/${firstMatchId}/scorecard`, { cache: 'no-store' });
          const matchData = await matchRes.json();
          if (matchData.success && matchData.match) {
            setMatch(matchData.match);
            if (matchData.match.currentInnings === 2) setActiveTab('inn2');
            setLastLivePing(new Date().toLocaleTimeString());
          }
        }
      }
    } catch (err) {
      console.error('[Scorecard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [requestedMatchId]);

  useEffect(() => {
    fetchScorecard();
  }, [fetchScorecard]);

  // Realtime Subscription
  useEffect(() => {
    if (!match?.id) return;
    const supabase = createClient();
    const channel = supabase.channel(`match:${match.id}`);

    channel
      .on('broadcast', { event: 'score_update' }, () => {
        fetchScorecard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match?.id, fetchScorecard]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '100px auto', padding: '0 20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
        Loading live match scorecard...
      </div>
    );
  }

  if (!match) {
    return (
      <div style={{ maxWidth: '1000px', margin: '100px auto', padding: '0 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', color: '#FFF', marginBottom: '12px' }}>Match Scorecard Not Found</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '20px' }}>
          No match details are currently available for this request.
        </p>
        <Link
          href="/"
          style={{ background: 'var(--color-primary)', color: '#FFF', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}
        >
          ← Return to Home
        </Link>
      </div>
    );
  }

  const inn1 = match.innings?.find((i: any) => i.inningsNumber === 1);
  const inn2 = match.innings?.find((i: any) => i.inningsNumber === 2);
  const selectedInnings = activeTab === 'inn1' ? inn1 : inn2;

  return (
    <main style={{ paddingTop: '90px', paddingBottom: 'var(--space-3xl)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 16px' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Link
            href="/"
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            ← Back to Tournament Home
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: match.status === 'LIVE' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
                color: '#FFF',
                fontSize: '0.75rem',
                fontWeight: 900,
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              {match.status}
            </span>
            {lastLivePing && (
              <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                Live Ping: {lastLivePing}
              </span>
            )}
          </div>
        </div>

        {/* MATCH HERO CARD */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1C1616 0%, #291F1F 100%)',
            border: '1.5px solid rgba(255, 184, 0, 0.3)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '12px' }}>
            {match.tournament?.name} • {match.venue || 'Main Stadium'} • {match.oversPerInnings} Overs Match
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFF' }}>{match.teamA.name}</div>
              {inn1 && inn1.battingTeamId === match.teamAId && (
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFB800', marginTop: '4px' }}>
                  {inn1.runs} / {inn1.wickets}{' '}
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                    ({inn1.overs}.{inn1.balls} ov)
                  </span>
                </div>
              )}
              {inn2 && inn2.battingTeamId === match.teamAId && (
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFB800', marginTop: '4px' }}>
                  {inn2.runs} / {inn2.wickets}{' '}
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                    ({inn2.overs}.{inn2.balls} ov)
                  </span>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', color: '#FFB800', fontWeight: 900, fontSize: '1.1rem' }}>
              VS
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFF' }}>{match.teamB.name}</div>
              {inn1 && inn1.battingTeamId === match.teamBId && (
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFB800', marginTop: '4px' }}>
                  {inn1.runs} / {inn1.wickets}{' '}
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                    ({inn1.overs}.{inn1.balls} ov)
                  </span>
                </div>
              )}
              {inn2 && inn2.battingTeamId === match.teamBId && (
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFB800', marginTop: '4px' }}>
                  {inn2.runs} / {inn2.wickets}{' '}
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                    ({inn2.overs}.{inn2.balls} ov)
                  </span>
                </div>
              )}
            </div>
          </div>

          {match.resultNote && (
            <div style={{ marginTop: '16px', background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', padding: '10px 16px', borderRadius: '8px', fontWeight: 800, textAlign: 'center', fontSize: '0.95rem' }}>
              🏆 {match.resultNote}
            </div>
          )}
        </div>

        {/* INNINGS TABS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {inn1 && (
            <button
              onClick={() => setActiveTab('inn1')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'inn1' ? '#FFB800' : 'rgba(255, 255, 255, 0.06)',
                color: activeTab === 'inn1' ? '#000' : '#FFF',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              1st Innings: {inn1.battingTeam?.shortName} ({inn1.runs}/{inn1.wickets})
            </button>
          )}

          {inn2 && (
            <button
              onClick={() => setActiveTab('inn2')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'inn2' ? '#FFB800' : 'rgba(255, 255, 255, 0.06)',
                color: activeTab === 'inn2' ? '#000' : '#FFF',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              2nd Innings: {inn2.battingTeam?.shortName} ({inn2.runs}/{inn2.wickets})
            </button>
          )}
        </div>

        {/* ACTIVE INNINGS SCORECARD */}
        {selectedInnings ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Batting Card */}
            <div style={{ background: 'var(--color-paper-dark)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 800, color: '#FFF' }}>
                Batting: {selectedInnings.battingTeam?.name}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Batter</th>
                    <th style={{ padding: '10px 16px' }}>Dismissal</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>R</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>B</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>4s</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>6s</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>SR</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInnings.battingScores || []).map((b: any) => {
                    const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
                    const isCurrent = b.playerId === selectedInnings.currentStrikerId || b.playerId === selectedInnings.currentNonStrikerId;
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: isCurrent ? '#FFB800' : '#FFF' }}>
                          {b.player?.name} {b.playerId === selectedInnings.currentStrikerId ? ' *' : ''}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          {b.isOut ? b.dismissal || 'Out' : isCurrent ? 'not out (batting)' : 'not out'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#FFF' }}>{b.runs}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>{b.balls}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>{b.fours}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>{b.sixes}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>{sr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ padding: '12px 16px', background: 'rgba(0, 0, 0, 0.2)', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total</span>
                <span style={{ color: '#FFB800' }}>
                  {selectedInnings.runs} / {selectedInnings.wickets} ({selectedInnings.overs}.{selectedInnings.balls} Overs)
                </span>
              </div>
            </div>

            {/* Bowling Card */}
            <div style={{ background: 'var(--color-paper-dark)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 800, color: '#FFF' }}>
                Bowling: {selectedInnings.bowlingTeam?.name}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Bowler</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>O</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>M</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>R</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>W</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Econ</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>WD</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>NB</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInnings.bowlingScores || []).map((b: any) => {
                    const totalOvers = b.overs + b.balls / 6;
                    const econ = totalOvers > 0 ? (b.runsConceded / totalOvers).toFixed(2) : '0.00';
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#FFF' }}>
                          {b.player?.name} {b.isCurrent ? ' *' : ''}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#FFF' }}>{b.overs}.{b.balls}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>{b.maidens}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#FFF' }}>{b.runsConceded}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#FFB800' }}>{b.wickets}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>{econ}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>{b.wides}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)' }}>{b.noBalls}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
            This innings has not commenced yet.
          </div>
        )}
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
