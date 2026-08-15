'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  startMatchAction,
  setOpeningLineupAction,
  recordDeliveryAction,
  undoLastDeliveryAction,
  changeBowlerAction,
  swapStrikerAction,
  switchBatterAction,
  endInningsAction,
  completeMatchAction,
} from '@/lib/scoring/scoring-actions';

interface Props {
  initialMatch: any;
  entryPath: string;
}

export default function ScoringConsole({ initialMatch, entryPath }: Props) {
  const router = useRouter();
  const [match, setMatch] = useState<any>(initialMatch);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<string>('CAUGHT');
  const [dismissedId, setDismissedId] = useState<string>('');
  const [newBatterId, setNewBatterId] = useState<string>('');

  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>('');

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [winnerTeamId, setWinnerTeamId] = useState<string>('');
  const [resultNote, setResultNote] = useState<string>('');

  // Setup state
  const [tossWinnerId, setTossWinnerId] = useState<string>(initialMatch.teamAId);
  const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL'>('BAT');
  const [lineupStrikerId, setLineupStrikerId] = useState<string>('');
  const [lineupNonStrikerId, setLineupNonStrikerId] = useState<string>('');
  const [lineupBowlerId, setLineupBowlerId] = useState<string>('');

  // Supabase Realtime Subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`match:${match.id}`);

    channel
      .on('broadcast', { event: 'score_update' }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id, router]);

  const currentInnings = match.innings?.find((i: any) => i.inningsNumber === match.currentInnings) || match.innings?.[0];

  // Helper to extract squad players
  const getTeamPlayers = (teamId: string) => {
    const team = teamId === match.teamAId ? match.teamA : match.teamB;
    if (!team) return [];
    if (team.tournamentSquads && team.tournamentSquads.length > 0) {
      return team.tournamentSquads.map((ts: any) => ts.player);
    }
    if (team.teamPlayers && team.teamPlayers.length > 0) {
      return team.teamPlayers.map((tp: any) => tp.player);
    }
    return [];
  };

  const battingSquad = currentInnings ? getTeamPlayers(currentInnings.battingTeamId) : [];
  const bowlingSquad = currentInnings ? getTeamPlayers(currentInnings.bowlingTeamId) : [];

  // Active player stats
  const strikerScore = currentInnings?.battingScores?.find((b: any) => b.playerId === currentInnings?.currentStrikerId);
  const nonStrikerScore = currentInnings?.battingScores?.find((b: any) => b.playerId === currentInnings?.currentNonStrikerId);
  const bowlerScore = currentInnings?.bowlingScores?.find((b: any) => b.playerId === currentInnings?.currentBowlerId);

  // Available new batters (not already out or currently batting)
  const availableBatters = battingSquad.filter((p: any) => {
    const score = currentInnings?.battingScores?.find((b: any) => b.playerId === p.id);
    const isCurrentlyBatting = p.id === currentInnings?.currentStrikerId || p.id === currentInnings?.currentNonStrikerId;
    const isOut = score?.isOut;
    return !isCurrentlyBatting && !isOut;
  });

  // Action handlers
  const handleStartMatch = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await startMatchAction(match.id, { tossWinnerId, tossDecision });
        if (!res.success) {
          setError(res.error || 'Failed to start match.');
        } else {
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleSetLineup = () => {
    if (!currentInnings) return;
    if (!lineupStrikerId || !lineupNonStrikerId || !lineupBowlerId) {
      setError('Please select striker, non-striker, and opening bowler.');
      return;
    }
    if (lineupStrikerId === lineupNonStrikerId) {
      setError('Striker and non-striker cannot be the same player.');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const res = await setOpeningLineupAction(currentInnings.id, {
          strikerId: lineupStrikerId,
          nonStrikerId: lineupNonStrikerId,
          bowlerId: lineupBowlerId,
        });
        if (!res.success) {
          setError(res.error || 'Failed to set lineup.');
        } else {
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleRecordBall = (runs: number, extraType: any = 'NONE', extraRuns: number = 0) => {
    if (!currentInnings) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await recordDeliveryAction(currentInnings.id, {
          runs,
          extraType,
          extraRuns,
          expectedUpdatedAt: currentInnings.updatedAt,
        });
        if (res && res.success) {
          if (res.isOverComplete) {
            setShowBowlerModal(true);
          }
          router.refresh();
        } else {
          setError((res as any)?.error || 'Failed to record delivery.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleRecordWicket = () => {
    if (!currentInnings) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await recordDeliveryAction(currentInnings.id, {
          runs: 0,
          isWicket: true,
          wicketType: wicketType as any,
          dismissedPlayerId: dismissedId || currentInnings.currentStrikerId,
          newBatterId: newBatterId || undefined,
          expectedUpdatedAt: currentInnings.updatedAt,
        });
        if (res && res.success) {
          setShowWicketModal(false);
          setNewBatterId('');
          if (res.isOverComplete) {
            setShowBowlerModal(true);
          }
          router.refresh();
        } else {
          setError((res as any)?.error || 'Failed to record wicket.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleUndo = () => {
    if (!currentInnings) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await undoLastDeliveryAction(currentInnings.id);
        if (res && res.success) {
          router.refresh();
        } else {
          setError((res as any)?.error || 'Failed to undo.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleSwapStrike = () => {
    if (!currentInnings) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await swapStrikerAction(currentInnings.id);
        if (res && res.success) {
          router.refresh();
        } else {
          setError((res as any)?.error || 'Failed to swap strike.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleChangeBowler = () => {
    if (!currentInnings || !selectedBowlerId) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await changeBowlerAction(currentInnings.id, selectedBowlerId);
        if (!res.success) setError(res.error || 'Failed to change bowler.');
        else {
          setShowBowlerModal(false);
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleEndInnings = () => {
    if (!currentInnings) return;
    if (!confirm('Are you sure you want to end this innings?')) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await endInningsAction(currentInnings.id);
        if (!res.success) setError(res.error || 'Failed to end innings.');
        else router.refresh();
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleCompleteMatch = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await completeMatchAction(match.id, {
          winnerTeamId: winnerTeamId || undefined,
          resultNote: resultNote || 'Match completed',
        });
        if (!res.success) setError(res.error || 'Failed to complete match.');
        else {
          setShowCompleteModal(false);
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ERROR ALERT */}
      {error && (
        <div style={{ background: '#721c24', color: '#f8d7da', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f5c6cb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* MATCH HEADER SCOREBOARD */}
      <div style={{ background: 'linear-gradient(135deg, #1C1616 0%, #291F1F 100%)', border: '1.5px solid rgba(255, 184, 0, 0.3)', borderRadius: '16px', padding: '24px', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, background: match.status === 'LIVE' ? '#FF4D4D' : '#333', color: '#FFF', padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.06em' }}>
              {match.status}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              {match.tournament?.name} • {match.oversPerInnings} Overs
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#FFB800', fontWeight: 700 }}>
            Innings {match.currentInnings}
          </div>
        </div>

        {/* Teams and Score Line */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFF' }}>{match.teamA.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>{match.teamA.shortName}</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            {currentInnings ? (
              <div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFB800', fontFamily: 'monospace' }}>
                  {currentInnings.runs} / {currentInnings.wickets}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>
                  {currentInnings.overs}.{currentInnings.balls} / {match.oversPerInnings} Overs
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.5)' }}>
                NOT STARTED
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFF' }}>{match.teamB.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>{match.teamB.shortName}</div>
          </div>
        </div>

        {match.resultNote && (
          <div style={{ textAlign: 'center', marginTop: '16px', background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', padding: '8px', borderRadius: '8px', fontWeight: 700 }}>
            🏆 {match.resultNote}
          </div>
        )}
      </div>

      {/* STATE 1: PRE-MATCH TOSS SETUP */}
      {match.status === 'UPCOMING' && (
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: '#FFF' }}>
            🪙 Match Toss & Setup
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Toss Winner
              </label>
              <select
                value={tossWinnerId}
                onChange={(e) => setTossWinnerId(e.target.value)}
                style={{ width: '100%', background: '#1A1616', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value={match.teamAId}>{match.teamA.name}</option>
                <option value={match.teamBId}>{match.teamB.name}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Elected To
              </label>
              <select
                value={tossDecision}
                onChange={(e) => setTossDecision(e.target.value as any)}
                style={{ width: '100%', background: '#1A1616', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="BAT">Bat First</option>
                <option value="BOWL">Bowl First</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleStartMatch}
            disabled={isPending}
            style={{ width: '100%', background: 'linear-gradient(135deg, #28A745 0%, #1E7E34 100%)', color: '#FFF', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
          >
            {isPending ? 'Starting Match...' : '🚀 Start Match & Setup Lineups'}
          </button>
        </div>
      )}

      {/* STATE 2: OPENING LINEUP SETUP (If Innings is IN_PROGRESS but players not set) */}
      {match.status === 'LIVE' && currentInnings && (!currentInnings.currentStrikerId || !currentInnings.currentBowlerId) && (
        <div style={{ background: 'rgba(255, 184, 0, 0.06)', border: '1.5px solid rgba(255, 184, 0, 0.3)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: '#FFB800' }}>
            🏏 Innings {currentInnings.inningsNumber} Lineup Configuration
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
            Batting: <strong>{currentInnings.battingTeam?.name}</strong> • Bowling: <strong>{currentInnings.bowlingTeam?.name}</strong>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Striker Batter *
              </label>
              <select
                value={lineupStrikerId}
                onChange={(e) => setLineupStrikerId(e.target.value)}
                style={{ width: '100%', background: '#1A1616', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Striker...</option>
                {battingSquad.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} {p.indexNumber ? `(${p.indexNumber})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Non-Striker Batter *
              </label>
              <select
                value={lineupNonStrikerId}
                onChange={(e) => setLineupNonStrikerId(e.target.value)}
                style={{ width: '100%', background: '#1A1616', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Non-Striker...</option>
                {battingSquad.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} {p.indexNumber ? `(${p.indexNumber})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Opening Bowler *
              </label>
              <select
                value={lineupBowlerId}
                onChange={(e) => setLineupBowlerId(e.target.value)}
                style={{ width: '100%', background: '#1A1616', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Bowler...</option>
                {bowlingSquad.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} {p.indexNumber ? `(${p.indexNumber})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSetLineup}
            disabled={isPending}
            style={{ width: '100%', background: '#FFB800', color: '#000', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: isPending ? 'not-allowed' : 'pointer' }}
          >
            {isPending ? 'Confirming Lineup...' : '⚡ Confirm Lineup & Start Scoring'}
          </button>
        </div>
      )}

      {/* STATE 3: LIVE ACTIVE SCORING CONSOLE */}
      {match.status === 'LIVE' && currentInnings && currentInnings.currentStrikerId && (
        <div>
          {/* CURRENT BATTERS & BOWLER BAR */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Batters */}
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Batters on Pitch
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#FFB800', fontWeight: 900 }}>🏏 *</span>
                  <span style={{ fontWeight: 800, color: '#FFF', fontSize: '1.05rem' }}>{currentInnings.currentStriker?.name}</span>
                </div>
                <div style={{ fontWeight: 800, color: '#FFB800', fontSize: '1.1rem' }}>
                  {strikerScore?.runs || 0} <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>({strikerScore?.balls || 0}b • {strikerScore?.fours || 0}x4 • {strikerScore?.sixes || 0}x6)</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                  <span style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem' }}>{currentInnings.currentNonStriker?.name}</span>
                </div>
                <div style={{ fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>
                  {nonStrikerScore?.runs || 0} <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>({nonStrikerScore?.balls || 0}b • {nonStrikerScore?.fours || 0}x4 • {nonStrikerScore?.sixes || 0}x6)</span>
                </div>
              </div>
            </div>

            {/* Bowler */}
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>
                  Current Bowler
                </span>
                <button
                  onClick={() => setShowBowlerModal(true)}
                  style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#FFB800', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  Change
                </button>
              </div>

              {currentInnings.currentBowler ? (
                <div>
                  <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1.05rem', marginBottom: '4px' }}>
                    {currentInnings.currentBowler.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 700 }}>
                    {bowlerScore?.wickets || 0} - {bowlerScore?.runsConceded || 0} <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>({bowlerScore?.overs || 0}.{bowlerScore?.balls || 0} ov)</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowBowlerModal(true)}
                  style={{ width: '100%', background: '#FF4D4D', color: '#FFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                >
                  ⚠️ Select Next Bowler
                </button>
              )}
            </div>
          </div>

          {/* RECENT BALLS STRIP */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)' }}>RECENT:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(currentInnings.ballEvents || []).slice(0, 12).map((b: any) => {
                let text = `${b.runs}`;
                let bg = 'rgba(255, 255, 255, 0.1)';
                let color = '#FFF';
                if (b.isWicket) {
                  text = 'W';
                  bg = '#FF4D4D';
                } else if (b.runs === 4) {
                  text = '4';
                  bg = '#28A745';
                } else if (b.runs === 6) {
                  text = '6';
                  bg = '#800080';
                } else if (b.extraType === 'WIDE') {
                  text = 'WD';
                  bg = '#FFB800';
                  color = '#000';
                } else if (b.extraType === 'NO_BALL') {
                  text = 'NB';
                  bg = '#FF8C00';
                  color = '#000';
                }
                return (
                  <span
                    key={b.id}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: bg,
                      color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                    }}
                  >
                    {text}
                  </span>
                );
              })}
            </div>
          </div>

          {/* SCORING BUTTONS GRID */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', marginBottom: '14px' }}>
              Runs off the Bat
            </div>

            {/* Standard Runs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  disabled={isPending || !currentInnings.currentBowlerId}
                  onClick={() => handleRecordBall(r)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFF',
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    padding: '16px 0',
                    borderRadius: '10px',
                    cursor: isPending || !currentInnings.currentBowlerId ? 'not-allowed' : 'pointer',
                  }}
                >
                  +{r}
                </button>
              ))}

              {/* FOUR */}
              <button
                disabled={isPending || !currentInnings.currentBowlerId}
                onClick={() => handleRecordBall(4)}
                style={{
                  background: 'linear-gradient(135deg, #28A745 0%, #1E7E34 100%)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  padding: '16px 0',
                  borderRadius: '10px',
                  cursor: isPending || !currentInnings.currentBowlerId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(40, 167, 69, 0.4)',
                }}
              >
                FOUR
              </button>

              {/* SIX */}
              <button
                disabled={isPending || !currentInnings.currentBowlerId}
                onClick={() => handleRecordBall(6)}
                style={{
                  background: 'linear-gradient(135deg, #8A2BE2 0%, #4B0082 100%)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  padding: '16px 0',
                  borderRadius: '10px',
                  cursor: isPending || !currentInnings.currentBowlerId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(138, 43, 226, 0.4)',
                }}
              >
                SIX
              </button>
            </div>

            {/* Extras & Wicket */}
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', marginBottom: '14px' }}>
              Extras & Wickets
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              <button
                disabled={isPending || !currentInnings.currentBowlerId}
                onClick={() => handleRecordBall(0, 'WIDE', 1)}
                style={{
                  background: 'rgba(255, 184, 0, 0.15)',
                  border: '1px solid rgba(255, 184, 0, 0.4)',
                  color: '#FFB800',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: isPending || !currentInnings.currentBowlerId ? 'not-allowed' : 'pointer',
                }}
              >
                WIDE (+1)
              </button>

              <button
                disabled={isPending || !currentInnings.currentBowlerId}
                onClick={() => handleRecordBall(0, 'NO_BALL', 1)}
                style={{
                  background: 'rgba(255, 140, 0, 0.15)',
                  border: '1px solid rgba(255, 140, 0, 0.4)',
                  color: '#FF8C00',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: isPending || !currentInnings.currentBowlerId ? 'not-allowed' : 'pointer',
                }}
              >
                NO BALL (+1)
              </button>

              <button
                disabled={isPending || !currentInnings.currentBowlerId}
                onClick={() => handleRecordBall(1, 'BYE', 1)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: isPending || !currentInnings.currentBowlerId ? 'not-allowed' : 'pointer',
                }}
              >
                BYE (+1)
              </button>

              <button
                disabled={isPending || !currentInnings.currentBowlerId}
                onClick={() => handleRecordBall(1, 'LEG_BYE', 1)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: isPending || !currentInnings.currentBowlerId ? 'not-allowed' : 'pointer',
                }}
              >
                LEG BYE (+1)
              </button>

              <button
                disabled={isPending || !currentInnings.currentBowlerId}
                onClick={() => {
                  setDismissedId(currentInnings.currentStrikerId);
                  setShowWicketModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #FF4D4D 0%, #C0272D 100%)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '1rem',
                  fontWeight: 900,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: isPending || !currentInnings.currentBowlerId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(255, 77, 77, 0.4)',
                }}
              >
                🔴 WICKET
              </button>
            </div>
          </div>

          {/* UTILITY CONTROLS */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              disabled={isPending}
              onClick={handleUndo}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFF',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              ↩️ Undo Last Ball
            </button>

            <button
              disabled={isPending}
              onClick={handleSwapStrike}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFF',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              🔄 Swap Strike
            </button>

            <button
              disabled={isPending}
              onClick={handleEndInnings}
              style={{
                flex: 1,
                background: 'rgba(255, 184, 0, 0.15)',
                border: '1px solid rgba(255, 184, 0, 0.4)',
                color: '#FFB800',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              🏁 End Innings {currentInnings.inningsNumber}
            </button>

            <button
              disabled={isPending}
              onClick={() => setShowCompleteModal(true)}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #28A745 0%, #1E7E34 100%)',
                border: 'none',
                color: '#FFF',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              🏆 Complete Match
            </button>
          </div>
        </div>
      )}

      {/* WICKET MODAL */}
      {showWicketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#1A1616', border: '1.5px solid #FF4D4D', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FF4D4D', margin: '0 0 16px' }}>
              🔴 Record Wicket
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>
                  Dismissed Batter
                </label>
                <select
                  value={dismissedId}
                  onChange={(e) => setDismissedId(e.target.value)}
                  style={{ width: '100%', background: '#291F1F', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                >
                  <option value={currentInnings?.currentStrikerId}>Striker: {currentInnings?.currentStriker?.name}</option>
                  <option value={currentInnings?.currentNonStrikerId}>Non-Striker: {currentInnings?.currentNonStriker?.name}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>
                  Wicket Type
                </label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                  style={{ width: '100%', background: '#291F1F', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                >
                  <option value="CAUGHT">Caught</option>
                  <option value="BOWLED">Bowled</option>
                  <option value="LBW">LBW</option>
                  <option value="RUN_OUT">Run Out</option>
                  <option value="STUMPED">Stumped</option>
                  <option value="HIT_WICKET">Hit Wicket</option>
                  <option value="RETIRED_HURT">Retired Hurt</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {availableBatters.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>
                    Next Incoming Batter
                  </label>
                  <select
                    value={newBatterId}
                    onChange={(e) => setNewBatterId(e.target.value)}
                    style={{ width: '100%', background: '#291F1F', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                  >
                    <option value="">Select Next Batter...</option>
                    {availableBatters.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} {p.indexNumber ? `(${p.indexNumber})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowWicketModal(false)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordWicket}
                disabled={isPending}
                style={{ flex: 2, background: '#FF4D4D', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOWLER SELECTOR MODAL */}
      {showBowlerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#1A1616', border: '1.5px solid #FFB800', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFB800', margin: '0 0 16px' }}>
              🏏 Select Bowler for Next Over
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>
                Bowler
              </label>
              <select
                value={selectedBowlerId}
                onChange={(e) => setSelectedBowlerId(e.target.value)}
                style={{ width: '100%', background: '#291F1F', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Bowler...</option>
                {bowlingSquad.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} {p.indexNumber ? `(${p.indexNumber})` : ''}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowBowlerModal(false)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleChangeBowler}
                disabled={isPending || !selectedBowlerId}
                style={{ flex: 2, background: '#FFB800', border: 'none', color: '#000', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: isPending || !selectedBowlerId ? 'not-allowed' : 'pointer' }}
              >
                Set Bowler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE MATCH MODAL */}
      {showCompleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#1A1616', border: '1.5px solid #28A745', borderRadius: '16px', padding: '24px', maxWidth: '460px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#28A745', margin: '0 0 16px' }}>
              🏆 Finalize & Complete Match
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>
                  Winning Team
                </label>
                <select
                  value={winnerTeamId}
                  onChange={(e) => setWinnerTeamId(e.target.value)}
                  style={{ width: '100%', background: '#291F1F', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                >
                  <option value="">No Winner / Tie / Abandoned</option>
                  <option value={match.teamAId}>{match.teamA.name}</option>
                  <option value={match.teamBId}>{match.teamB.name}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>
                  Result Summary / Note
                </label>
                <input
                  type="text"
                  value={resultNote}
                  onChange={(e) => setResultNote(e.target.value)}
                  placeholder="e.g. Colombo Lions won by 24 runs"
                  style={{ width: '100%', background: '#291F1F', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowCompleteModal(false)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteMatch}
                disabled={isPending}
                style={{ flex: 2, background: '#28A745', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                Declare Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
