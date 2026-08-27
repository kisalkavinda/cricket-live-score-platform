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

  // Sync state if initialMatch prop changes from server revalidation
  useEffect(() => {
    if (initialMatch) {
      setMatch(initialMatch);
    }
  }, [initialMatch]);

  // Extract all registered squad players for Team A and Team B
  const getRawTeamPlayers = (teamId: string) => {
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

  const rawTeamAPlayers = getRawTeamPlayers(match.teamAId);
  const rawTeamBPlayers = getRawTeamPlayers(match.teamBId);

  // Match Playing Squad Selection (e.g. 8 vs 8 when one team has 8 and other has 11)
  const [selectedTeamAPlayerIds, setSelectedTeamAPlayerIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`cpl_squad_${initialMatch.id}_a`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    const aLen = rawTeamAPlayers.length;
    const bLen = rawTeamBPlayers.length;
    if (aLen > 0 && bLen > 0 && aLen !== bLen) {
      const minCount = Math.min(aLen, bLen);
      return rawTeamAPlayers.slice(0, minCount).map((p: any) => p.id);
    }
    return rawTeamAPlayers.map((p: any) => p.id);
  });

  const [selectedTeamBPlayerIds, setSelectedTeamBPlayerIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`cpl_squad_${initialMatch.id}_b`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    const aLen = rawTeamAPlayers.length;
    const bLen = rawTeamBPlayers.length;
    if (aLen > 0 && bLen > 0 && aLen !== bLen) {
      const minCount = Math.min(aLen, bLen);
      return rawTeamBPlayers.slice(0, minCount).map((p: any) => p.id);
    }
    return rawTeamBPlayers.map((p: any) => p.id);
  });


  // Persist squad selection in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && match?.id) {
      try {
        localStorage.setItem(`cpl_squad_${match.id}_a`, JSON.stringify(selectedTeamAPlayerIds));
        localStorage.setItem(`cpl_squad_${match.id}_b`, JSON.stringify(selectedTeamBPlayerIds));
      } catch (e) {}
    }
  }, [match?.id, selectedTeamAPlayerIds, selectedTeamBPlayerIds]);

  // Helper to extract playing squad players (filtered by selection)
  const getTeamPlayers = (teamId: string) => {
    const raw = getRawTeamPlayers(teamId);
    const selectedIds = teamId === match.teamAId ? selectedTeamAPlayerIds : selectedTeamBPlayerIds;
    if (selectedIds && selectedIds.length > 0) {
      return raw.filter((p: any) => selectedIds.includes(p.id));
    }
    return raw;
  };

  // Modals state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<string>('CAUGHT');
  const [dismissedId, setDismissedId] = useState<string>('');
  const [newBatterId, setNewBatterId] = useState<string>('');
  const [wicketModalError, setWicketModalError] = useState<string | null>(null);

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

  // Supabase Realtime Subscription (Syncs state without full page server re-renders)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`match:${match.id}`);

    channel
      .on('broadcast', { event: 'score_update' }, (msg: any) => {
        if (msg?.payload?.match) {
          setMatch((prev: any) => ({ ...prev, ...msg.payload.match }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  const currentInnings = match.innings?.find((i: any) => i.inningsNumber === match.currentInnings) || match.innings?.[0];

  const battingSquad = currentInnings ? getTeamPlayers(currentInnings.battingTeamId) : [];
  const bowlingSquad = currentInnings ? getTeamPlayers(currentInnings.bowlingTeamId) : [];

  // Dynamically resolve active players based on current IDs
  const allKnownPlayers = [...rawTeamAPlayers, ...rawTeamBPlayers, ...(match.teamA?.players || []), ...(match.teamB?.players || [])];
  const activeStriker = allKnownPlayers.find((p: any) => p.id === currentInnings?.currentStrikerId) || currentInnings?.currentStriker;
  const activeNonStriker = allKnownPlayers.find((p: any) => p.id === currentInnings?.currentNonStrikerId) || currentInnings?.currentNonStriker;
  const activeBowler = allKnownPlayers.find((p: any) => p.id === currentInnings?.currentBowlerId) || currentInnings?.currentBowler;

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

  // Available bowlers (players who have not yet bowled their 1-over limit in this innings)
  const availableBowlers = bowlingSquad.filter((p: any) => {
    const score = currentInnings?.bowlingScores?.find((b: any) => b.playerId === p.id);
    const totalBalls = (score?.overs || 0) * 6 + (score?.balls || 0);
    const hasBowledFullOver = (score?.overs || 0) >= 1 || totalBalls >= 6;
    return !hasBowledFullOver;
  });

  // Action handlers with INSTANT OPTIMISTIC FEEDBACK
  const handleStartMatch = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await startMatchAction(match.id, { tossWinnerId, tossDecision });
        if (!res.success) {
          setError(res.error || 'Failed to start match.');
        } else {
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
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

    // Immediate Optimistic Update for 0ms lag
    const strikerPlayer = battingSquad.find((p: any) => p.id === lineupStrikerId);
    const nonStrikerPlayer = battingSquad.find((p: any) => p.id === lineupNonStrikerId);
    const bowlerPlayer = bowlingSquad.find((p: any) => p.id === lineupBowlerId);

    setMatch((prev: any) => {
      const updatedInnings = prev.innings.map((inn: any) => {
        if (inn.id === currentInnings.id) {
          return {
            ...inn,
            currentStrikerId: lineupStrikerId,
            currentNonStrikerId: lineupNonStrikerId,
            currentBowlerId: lineupBowlerId,
            currentStriker: strikerPlayer,
            currentNonStriker: nonStrikerPlayer,
            currentBowler: bowlerPlayer,
          };
        }
        return inn;
      });
      return { ...prev, innings: updatedInnings };
    });

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
        } else if ((res as any).updatedMatch) {
          setMatch((res as any).updatedMatch);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleRecordBall = (runs: number, extraType: any = 'NONE', extraRuns: number = 0) => {
    if (!currentInnings || isPending) return;

    // Check if the previous over finished and a new bowler needs to be chosen for the new over
    const isCurrentBowlerOverDone = (bowlerScore?.overs || 0) >= 1 || ((bowlerScore?.balls || 0) + (bowlerScore?.overs || 0) * 6) >= 6;
    if (currentInnings.balls === 0 && currentInnings.overs > 0 && isCurrentBowlerOverDone) {
      setShowBowlerModal(true);
      setError(`⚠️ Over ${currentInnings.overs + 1} is starting. Please select the next bowler before scoring.`);
      return;
    }

    setError(null);

    // ⚡ INSTANT OPTIMISTIC UPDATE: Update scoreboard in 0 milliseconds!
    const isLegal = extraType !== 'WIDE' && extraType !== 'NO_BALL';
    let totalBallRuns = 0;
    if (extraType === 'NONE') totalBallRuns = runs;
    else if (extraType === 'WIDE' || extraType === 'NO_BALL') totalBallRuns = (extraRuns > 0 ? extraRuns : 1) + runs;
    else if (extraType === 'BYE' || extraType === 'LEG_BYE') totalBallRuns = extraRuns > 0 ? extraRuns : runs > 0 ? runs : 1;

    const runsOffBat = (extraType === 'BYE' || extraType === 'LEG_BYE') ? 0 : (extraType === 'WIDE' ? 0 : runs);

    let nextBalls = currentInnings.balls;
    let nextOvers = currentInnings.overs;
    let isOverComplete = false;

    if (isLegal) {
      nextBalls += 1;
      if (nextBalls >= 6) {
        nextOvers += 1;
        nextBalls = 0;
        isOverComplete = true;
      }
    }

    // Strike rotation
    let nextStrikerId = currentInnings.currentStrikerId;
    let nextNonStrikerId = currentInnings.currentNonStrikerId;

    if (isLegal && (runs % 2 === 1)) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }
    if (isOverComplete) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
      // Note: Modal is NOT opened here on ball 6, giving the fielding team break time to think
    }

    // Apply immediate local state mutation
    setMatch((prev: any) => {
      if (!prev) return prev;
      const curInn = prev.innings?.find((i: any) => i.id === currentInnings.id);
      if (!curInn) return prev;

      const updatedBattingScores = (curInn.battingScores || []).map((b: any) => {
        if (b.playerId === currentInnings.currentStrikerId) {
          return {
            ...b,
            runs: b.runs + runsOffBat,
            balls: extraType !== 'WIDE' ? b.balls + 1 : b.balls,
            fours: runs === 4 && runsOffBat === 4 ? b.fours + 1 : b.fours,
            sixes: runs === 6 && runsOffBat === 6 ? b.sixes + 1 : b.sixes,
          };
        }
        return b;
      });

      const bowlerRunsCharged = (extraType === 'BYE' || extraType === 'LEG_BYE') ? 0 : (extraType === 'WIDE' || extraType === 'NO_BALL' ? (extraRuns > 0 ? extraRuns : 1) + runs : runs);
      const updatedBowlingScores = (curInn.bowlingScores || []).map((bw: any) => {
        if (bw.playerId === currentInnings.currentBowlerId) {
          let bOvers = bw.overs || 0;
          let bBalls = (bw.balls || 0) + (isLegal ? 1 : 0);
          if (bBalls >= 6) {
            bOvers += 1;
            bBalls = 0;
          }
          return {
            ...bw,
            runsConceded: (bw.runsConceded || 0) + bowlerRunsCharged,
            overs: bOvers,
            balls: bBalls,
          };
        }
        return bw;
      });

      const newBallEvent = {
        id: `temp-${Date.now()}`,
        overNumber: nextOvers,
        ballNumber: nextBalls,
        runs,
        extras: extraType !== 'NONE' ? (extraRuns > 0 ? extraRuns : 1) : 0,
        extraType,
        isLegal,
        isWicket: false,
      };

      const nextInnings = prev.innings.map((inn: any) => {
        if (inn.id === currentInnings.id) {
          return {
            ...inn,
            runs: inn.runs + totalBallRuns,
            overs: nextOvers,
            balls: nextBalls,
            currentStrikerId: nextStrikerId,
            currentNonStrikerId: nextNonStrikerId,
            battingScores: updatedBattingScores,
            bowlingScores: updatedBowlingScores,
            ballEvents: [newBallEvent, ...(inn.ballEvents || [])],
          };
        }
        return inn;
      });

      return { ...prev, innings: nextInnings };
    });

    // Background server action dispatch
    startTransition(async () => {
      try {
        const res = await recordDeliveryAction(currentInnings.id, {
          runs,
          extraType,
          extraRuns,
          expectedUpdatedAt: currentInnings.updatedAt,
        });
        if (res && res.success) {
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
        } else {
          setError((res as any)?.error || 'Failed to record delivery.');
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
        router.refresh();
      }
    });
  };

  const handleRecordWicket = () => {
    if (!currentInnings || isPending) return;

    // Check if previous over finished and a new bowler needs to be chosen for the new over
    const isCurrentBowlerOverDone = (bowlerScore?.overs || 0) >= 1 || ((bowlerScore?.balls || 0) + (bowlerScore?.overs || 0) * 6) >= 6;
    if (currentInnings.balls === 0 && currentInnings.overs > 0 && isCurrentBowlerOverDone) {
      setShowBowlerModal(true);
      setError(`⚠️ Over ${currentInnings.overs + 1} is starting. Please select the next bowler before recording a wicket.`);
      return;
    }

    if (availableBatters.length > 0 && !newBatterId) {
      setWicketModalError('⚠️ Please select the Next Incoming Batter before confirming the wicket.');
      return;
    }

    const dismissedPlayerId = dismissedId || currentInnings.currentStrikerId;
    const incomingBatterId = newBatterId;

    setWicketModalError(null);
    setError(null);
    setShowWicketModal(false);

    let nextBalls = currentInnings.balls + 1;
    let nextOvers = currentInnings.overs;
    let isOverComplete = false;
    if (nextBalls >= 6) {
      nextOvers += 1;
      nextBalls = 0;
      isOverComplete = true;
    }

    let nextStrikerId = currentInnings.currentStrikerId;
    let nextNonStrikerId = currentInnings.currentNonStrikerId;

    if (dismissedPlayerId === currentInnings.currentStrikerId) {
      nextStrikerId = incomingBatterId || currentInnings.currentStrikerId;
    } else {
      nextNonStrikerId = incomingBatterId || currentInnings.currentNonStrikerId;
    }

    if (isOverComplete) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
      setShowBowlerModal(true);
    }

    // ⚡ 0ms Instant Optimistic State for Wicket
    setMatch((prev: any) => {
      if (!prev) return prev;
      const curInn = prev.innings?.find((i: any) => i.id === currentInnings.id);
      if (!curInn) return prev;

      let dismissalLabel = 'out';
      const bowlerName = activeBowler?.name || 'Bowler';
      if (wicketType === 'RUN_OUT') dismissalLabel = 'run out';
      else if (wicketType === 'TIMED_OUT') dismissalLabel = 'timed out';
      else if (wicketType === 'RETIRED_HURT') dismissalLabel = 'retired hurt';
      else if (wicketType === 'BOWLED') dismissalLabel = `b ${bowlerName}`;
      else if (wicketType === 'LBW') dismissalLabel = `lbw b ${bowlerName}`;
      else if (wicketType === 'CAUGHT') dismissalLabel = `c b ${bowlerName}`;
      else if (wicketType === 'STUMPED') dismissalLabel = `st b ${bowlerName}`;
      else if (wicketType === 'HIT_WICKET') dismissalLabel = `hit wicket b ${bowlerName}`;

      let updatedBattingScores = (curInn.battingScores || []).map((b: any) => {
        if (b.playerId === dismissedPlayerId) {
          return {
            ...b,
            balls: dismissedPlayerId === currentInnings.currentStrikerId ? b.balls + 1 : b.balls,
            isOut: true,
            dismissal: dismissalLabel,
          };
        }
        return b;
      });

      // If dismissed batter wasn't in battingScores yet, add them
      if (!updatedBattingScores.some((b: any) => b.playerId === dismissedPlayerId)) {
        const dismissedPlayerObj = allKnownPlayers.find((p: any) => p.id === dismissedPlayerId);
        updatedBattingScores.push({
          id: `temp-dis-${Date.now()}`,
          playerId: dismissedPlayerId,
          player: dismissedPlayerObj,
          runs: 0,
          balls: dismissedPlayerId === currentInnings.currentStrikerId ? 1 : 0,
          fours: 0,
          sixes: 0,
          isOut: true,
          dismissal: dismissalLabel,
        });
      }

      // If incoming batter exists, add to battingScores
      if (incomingBatterId && !updatedBattingScores.some((b: any) => b.playerId === incomingBatterId)) {
        const newPlayerObj = allKnownPlayers.find((p: any) => p.id === incomingBatterId);
        updatedBattingScores.push({
          id: `temp-new-${Date.now()}`,
          playerId: incomingBatterId,
          player: newPlayerObj,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
        });
      }

      const updatedBowlingScores = (curInn.bowlingScores || []).map((bw: any) => {
        if (bw.playerId === currentInnings.currentBowlerId) {
          let bOvers = bw.overs || 0;
          let bBalls = (bw.balls || 0) + 1;
          if (bBalls >= 6) {
            bOvers += 1;
            bBalls = 0;
          }
          return {
            ...bw,
            overs: bOvers,
            balls: bBalls,
            wickets: (bw.wickets || 0) + (wicketType !== 'RUN_OUT' && wicketType !== 'TIMED_OUT' && wicketType !== 'RETIRED_HURT' ? 1 : 0),
          };
        }
        return bw;
      });

      const newBallEvent = {
        id: `temp-${Date.now()}`,
        overNumber: nextOvers,
        ballNumber: nextBalls,
        runs: 0,
        extras: 0,
        extraType: 'NONE',
        isLegal: true,
        isWicket: true,
        wicketType,
        dismissedPlayerId,
      };

      const nextInnings = prev.innings.map((inn: any) => {
        if (inn.id === currentInnings.id) {
          return {
            ...inn,
            wickets: inn.wickets + 1,
            overs: nextOvers,
            balls: nextBalls,
            currentStrikerId: nextStrikerId,
            currentNonStrikerId: nextNonStrikerId,
            battingScores: updatedBattingScores,
            bowlingScores: updatedBowlingScores,
            ballEvents: [newBallEvent, ...(inn.ballEvents || [])],
          };
        }
        return inn;
      });

      return { ...prev, innings: nextInnings };
    });

    startTransition(async () => {
      try {
        const res = await recordDeliveryAction(currentInnings.id, {
          runs: 0,
          isWicket: true,
          wicketType: wicketType as any,
          dismissedPlayerId,
          newBatterId: incomingBatterId || undefined,
          expectedUpdatedAt: currentInnings.updatedAt,
        });
        if (res && res.success) {
          setNewBatterId('');
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
        } else {
          const errMsg = (res as any)?.error || 'Database rejected wicket recording.';
          setError(`❌ Wicket NOT recorded: ${errMsg}`);
          alert(`❌ Wicket was NOT recorded: ${errMsg}`);
        }
      } catch (err: any) {
        const errMsg = err.message || 'Network or server error occurred.';
        setError(`❌ Wicket NOT recorded: ${errMsg}`);
        alert(`❌ Wicket was NOT recorded: ${errMsg}`);
      }
    });
  };

  const handleUndo = () => {
    if (!currentInnings || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await undoLastDeliveryAction(currentInnings.id);
        if (res && res.success) {
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
        } else {
          setError((res as any)?.error || 'Failed to undo.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleSwapStrike = () => {
    if (!currentInnings || isPending) return;
    setError(null);

    // Optimistic swap
    const oldStriker = currentInnings.currentStrikerId;
    const oldNonStriker = currentInnings.currentNonStrikerId;

    setMatch((prev: any) => {
      const nextInnings = prev.innings.map((inn: any) => {
        if (inn.id === currentInnings.id) {
          return {
            ...inn,
            currentStrikerId: oldNonStriker,
            currentNonStrikerId: oldStriker,
          };
        }
        return inn;
      });
      return { ...prev, innings: nextInnings };
    });

    startTransition(async () => {
      try {
        const res = await swapStrikerAction(currentInnings.id);
        if (res && res.success) {
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
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
    setShowBowlerModal(false);

    // Optimistic bowler change
    const newBowlerPlayer = bowlingSquad.find((p: any) => p.id === selectedBowlerId);
    setMatch((prev: any) => {
      const nextInnings = prev.innings.map((inn: any) => {
        if (inn.id === currentInnings.id) {
          return {
            ...inn,
            currentBowlerId: selectedBowlerId,
            currentBowler: newBowlerPlayer || inn.currentBowler,
          };
        }
        return inn;
      });
      return { ...prev, innings: nextInnings };
    });

    startTransition(async () => {
      try {
        const res = await changeBowlerAction(currentInnings.id, selectedBowlerId);
        if (!res.success) {
          setError(res.error || 'Failed to change bowler.');
        } else if ((res as any).updatedMatch) {
          setMatch((res as any).updatedMatch);
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
        else {
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
        }
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
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  // Squad selection helpers
  const togglePlayerA = (playerId: string) => {
    setSelectedTeamAPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const togglePlayerB = (playerId: string) => {
    setSelectedTeamBPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const autoBalanceSquads = () => {
    const minCount = Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length);
    if (minCount > 0) {
      setSelectedTeamAPlayerIds(rawTeamAPlayers.slice(0, minCount).map((p: any) => p.id));
      setSelectedTeamBPlayerIds(rawTeamBPlayers.slice(0, minCount).map((p: any) => p.id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ERROR ALERT */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#FCA5A5',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #EF4444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* MATCH HEADER SCOREBOARD */}
      <div
        style={{
          background: 'linear-gradient(135deg, #10141E 0%, #161D2B 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 900,
                background: match.status === 'LIVE' ? '#EF4444' : '#1E2638',
                color: '#FFF',
                padding: '3px 10px',
                borderRadius: '4px',
                letterSpacing: '0.06em',
                fontFamily: 'monospace',
              }}
            >
              {match.status === 'LIVE' ? '● LIVE' : match.status}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
              {match.tournament?.name} • {match.oversPerInnings} Overs
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#FBBF24',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 800,
                fontFamily: 'monospace',
              }}
            >
              👥 Match Squads: {selectedTeamAPlayerIds.length} vs {selectedTeamBPlayerIds.length}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#F59E0B', fontWeight: 800, fontFamily: 'monospace' }}>
              Innings {match.currentInnings}
            </div>
          </div>
        </div>

        {/* Teams and Score Line */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFF' }}>{match.teamA.name}</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontFamily: 'monospace' }}>
              {match.teamA.shortName} • ({selectedTeamAPlayerIds.length} players selected)
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            {currentInnings ? (
              <div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FBBF24', fontFamily: 'monospace' }}>
                  {currentInnings.runs} / {currentInnings.wickets}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>
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
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontFamily: 'monospace' }}>
              {match.teamB.shortName} • ({selectedTeamBPlayerIds.length} players selected)
            </div>
          </div>
        </div>

        {match.resultNote && (
          <div style={{ textAlign: 'center', marginTop: '16px', background: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24', padding: '8px', borderRadius: '8px', fontWeight: 700 }}>
            🏆 {match.resultNote}
          </div>
        )}
      </div>

      {/* STATE 1: PRE-MATCH TOSS SETUP */}
      {match.status === 'UPCOMING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* MATCH SQUAD SELECTION DURING SETUP */}
          <div style={{ background: '#10141E', border: '1.5px solid #2A364E', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👥 Match Playing Squads ({selectedTeamAPlayerIds.length} vs {selectedTeamBPlayerIds.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '3px 0 0' }}>
                  Select active players for both teams (e.g. 8 vs 8 if one squad has 8 registered).
                </p>
              </div>

              {rawTeamAPlayers.length !== rawTeamBPlayers.length && (
                <button
                  type="button"
                  onClick={autoBalanceSquads}
                  style={{
                    backgroundColor: '#F59E0B',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Auto Equal ({Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)} vs {Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)})
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Team A Selection */}
              <div style={{ background: '#141A26', border: '1px solid #1E2638', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ color: '#FFF', fontSize: '0.9rem' }}>{match.teamA.name}</strong>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#C0272D', color: '#FFF', fontWeight: 800, fontFamily: 'monospace' }}>
                    {selectedTeamAPlayerIds.length} / {rawTeamAPlayers.length} Playing
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {rawTeamAPlayers.map((p: any) => {
                    const checked = selectedTeamAPlayerIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: checked ? 'rgba(192, 39, 45, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          border: checked ? '1px solid rgba(192, 39, 45, 0.5)' : '1px solid #1E2638',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          color: checked ? '#FFF' : '#64748B',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlayerA(p.id)}
                          style={{ accentColor: '#C0272D' }}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Team B Selection */}
              <div style={{ background: '#141A26', border: '1px solid #1E2638', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ color: '#FFF', fontSize: '0.9rem' }}>{match.teamB.name}</strong>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 800, fontFamily: 'monospace' }}>
                    {selectedTeamBPlayerIds.length} / {rawTeamBPlayers.length} Playing
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {rawTeamBPlayers.map((p: any) => {
                    const checked = selectedTeamBPlayerIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: checked ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          border: checked ? '1px solid rgba(37, 99, 235, 0.5)' : '1px solid #1E2638',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          color: checked ? '#FFF' : '#64748B',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlayerB(p.id)}
                          style={{ accentColor: '#2563EB' }}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
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
                style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
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
                style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
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
      </div>
      )}

      {/* STATE 2: OPENING LINEUP SETUP (Only at the start of an innings before play begins) */}
      {match.status === 'LIVE' && currentInnings && (!currentInnings.currentStrikerId || !currentInnings.currentNonStrikerId) && currentInnings.overs === 0 && currentInnings.balls === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* MATCH SQUAD SELECTION DURING LINEUP SETUP */}
          <div style={{ background: '#10141E', border: '1.5px solid #2A364E', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👥 Match Playing Squads ({selectedTeamAPlayerIds.length} vs {selectedTeamBPlayerIds.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '3px 0 0' }}>
                  Select active players for both teams (e.g. 8 vs 8 if one squad has 8 registered).
                </p>
              </div>

              {rawTeamAPlayers.length !== rawTeamBPlayers.length && (
                <button
                  type="button"
                  onClick={autoBalanceSquads}
                  style={{
                    backgroundColor: '#F59E0B',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Auto Equal ({Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)} vs {Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)})
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Team A Selection */}
              <div style={{ background: '#141A26', border: '1px solid #1E2638', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ color: '#FFF', fontSize: '0.9rem' }}>{match.teamA.name}</strong>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#C0272D', color: '#FFF', fontWeight: 800, fontFamily: 'monospace' }}>
                    {selectedTeamAPlayerIds.length} / {rawTeamAPlayers.length} Playing
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {rawTeamAPlayers.map((p: any) => {
                    const checked = selectedTeamAPlayerIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: checked ? 'rgba(192, 39, 45, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          border: checked ? '1px solid rgba(192, 39, 45, 0.5)' : '1px solid #1E2638',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          color: checked ? '#FFF' : '#64748B',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlayerA(p.id)}
                          style={{ accentColor: '#C0272D' }}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Team B Selection */}
              <div style={{ background: '#141A26', border: '1px solid #1E2638', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ color: '#FFF', fontSize: '0.9rem' }}>{match.teamB.name}</strong>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 800, fontFamily: 'monospace' }}>
                    {selectedTeamBPlayerIds.length} / {rawTeamBPlayers.length} Playing
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {rawTeamBPlayers.map((p: any) => {
                    const checked = selectedTeamBPlayerIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: checked ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          border: checked ? '1px solid rgba(37, 99, 235, 0.5)' : '1px solid #1E2638',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          color: checked ? '#FFF' : '#64748B',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlayerB(p.id)}
                          style={{ accentColor: '#2563EB' }}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1.5px solid rgba(245, 158, 11, 0.35)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FBBF24', margin: 0 }}>
                🏏 Innings {currentInnings.inningsNumber} Lineup Configuration
              </h2>
              <div
                style={{
                  background: '#141A26',
                  border: '1px solid #2A364E',
                  color: '#FBBF24',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                }}
              >
                👥 Match Squads: {selectedTeamAPlayerIds.length} vs {selectedTeamBPlayerIds.length}
              </div>
            </div>

          <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '18px' }}>
            Batting: <strong style={{ color: '#FFF' }}>{currentInnings.battingTeam?.name} ({battingSquad.length} in squad)</strong> • Bowling: <strong style={{ color: '#FFF' }}>{currentInnings.bowlingTeam?.name} ({bowlingSquad.length} in squad)</strong>
          </p>

          {currentInnings.inningsNumber === 2 && (() => {
            const inn1 = match.innings?.find((i: any) => i.inningsNumber === 1);
            const target = (inn1?.runs || 0) + 1;
            const rrr = (target / (match.oversPerInnings || 6)).toFixed(2);
            return (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🎯 2nd Innings Target Chase
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', fontFamily: 'monospace' }}>
                    Target: {target} Runs in {match.oversPerInnings} Overs
                  </div>
                </div>
                <div style={{ background: '#141A26', border: '1px solid #2A364E', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', color: '#10B981', fontWeight: 800 }}>
                  Req. RR: {rrr}
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                Striker Batter *
              </label>
              <select
                value={lineupStrikerId}
                onChange={(e) => setLineupStrikerId(e.target.value)}
                style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Striker...</option>
                {battingSquad
                  .filter((p: any) => p.id !== lineupNonStrikerId)
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                Non-Striker Batter *
              </label>
              <select
                value={lineupNonStrikerId}
                onChange={(e) => setLineupNonStrikerId(e.target.value)}
                style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Non-Striker...</option>
                {battingSquad
                  .filter((p: any) => p.id !== lineupStrikerId)
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                Opening Bowler *
              </label>
              <select
                value={lineupBowlerId}
                onChange={(e) => setLineupBowlerId(e.target.value)}
                style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Bowler...</option>
                {bowlingSquad.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSetLineup}
            disabled={isPending}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#000',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: isPending ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            {isPending ? 'Confirming Lineup...' : '⚡ Confirm Lineup & Start Scoring →'}
          </button>
        </div>
      </div>
      )}

      {/* STATE 3: LIVE ACTIVE SCORING CONSOLE */}
      {match.status === 'LIVE' && currentInnings && currentInnings.currentStrikerId && (
        <div>
          {/* CURRENT BATTERS & BOWLER BAR */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Batters */}
            <div style={{ background: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '10px' }}>
                Active Batters
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Striker */}
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FBBF24' }}>★ ON STRIKE</span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>SR: {strikerScore?.balls ? ((strikerScore.runs / strikerScore.balls) * 100).toFixed(1) : '0.0'}</span>
                  </div>
                  <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1.05rem' }}>
                    {activeStriker?.name || 'Striker'}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FBBF24', fontFamily: 'monospace', marginTop: '4px' }}>
                    {strikerScore?.runs || 0} <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>({strikerScore?.balls || 0}b • {strikerScore?.fours || 0}x4 {strikerScore?.sixes || 0}x6)</span>
                  </div>
                </div>

                {/* Non-Striker */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid #1E2638', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>NON-STRIKER</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>SR: {nonStrikerScore?.balls ? ((nonStrikerScore.runs / nonStrikerScore.balls) * 100).toFixed(1) : '0.0'}</span>
                  </div>
                  <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1.05rem' }}>
                    {activeNonStriker?.name || 'Non-Striker'}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', fontFamily: 'monospace', marginTop: '4px' }}>
                    {nonStrikerScore?.runs || 0} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>({nonStrikerScore?.balls || 0}b • {nonStrikerScore?.fours || 0}x4 {nonStrikerScore?.sixes || 0}x6)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bowler */}
            <div style={{ background: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Current Bowler</span>
                <button
                  onClick={() => setShowBowlerModal(true)}
                  style={{ background: '#1E2638', border: 'none', color: '#FBBF24', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  Change
                </button>
              </div>

              {activeBowler ? (
                (() => {
                  const isOverDone = (bowlerScore?.overs || 0) >= 1 || ((bowlerScore?.balls || 0) + (bowlerScore?.overs || 0) * 6) >= 6;
                  const isNewOverPending = currentInnings.balls === 0 && currentInnings.overs > 0 && isOverDone;

                  if (isNewOverPending) {
                    return (
                      <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '10px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FBBF24' }}>
                            ⚡ OVER {currentInnings.overs} COMPLETE
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>Team Break</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '8px' }}>
                          {activeBowler.name} finished 1.0 ov ({bowlerScore?.wickets || 0}w - {bowlerScore?.runsConceded || 0}r)
                        </div>
                        <button
                          onClick={() => setShowBowlerModal(true)}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            color: '#000',
                            border: 'none',
                            padding: '7px 12px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                          }}
                        >
                          Select Bowler for Over {currentInnings.overs + 1} →
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1.05rem', marginBottom: '4px' }}>
                        {activeBowler.name}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 700, fontFamily: 'monospace' }}>
                        {bowlerScore?.wickets || 0} - {bowlerScore?.runsConceded || 0} <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>({bowlerScore?.overs || 0}.{bowlerScore?.balls || 0} ov)</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <button
                  onClick={() => setShowBowlerModal(true)}
                  style={{ width: '100%', background: '#EF4444', color: '#FFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                >
                  ⚠️ Select Next Bowler
                </button>
              )}
            </div>
          </div>

          {/* THIS OVER CARD */}
          {(() => {
            const allDeliveries = currentInnings.ballEvents || [];
            const currentOverNum = currentInnings.overs ?? 0;
            const currentOverDeliveries = [...allDeliveries.filter((b: any) => b.overNumber === currentOverNum)].reverse();
            const currentOverRuns = currentOverDeliveries.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0);
            const legalBallsInCurrentOver = currentOverDeliveries.filter((b: any) => b.isLegal).length;
            const remainingSlots = Math.max(0, 6 - legalBallsInCurrentOver);

            const prevOverNum = currentOverNum - 1;
            const prevOverDeliveries = prevOverNum >= 0 ? [...allDeliveries.filter((b: any) => b.overNumber === prevOverNum)].reverse() : [];
            const prevOverRuns = prevOverDeliveries.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0);

            const getBallStyle = (b: any) => {
              let label = `${b.runs}`;
              let bg = '#1E2638';
              let color = '#FFF';
              let border = '1px solid rgba(255,255,255,0.15)';

              if (b.isWicket) {
                label = 'W';
                bg = '#EF4444';
                border = '1px solid #DC2626';
              } else if (b.runs === 4) {
                label = '4';
                bg = '#10B981';
                border = '1px solid #059669';
              } else if (b.runs === 6) {
                label = '6';
                bg = '#8B5CF6';
                border = '1px solid #7C3AED';
              } else if (b.extraType === 'WIDE') {
                label = b.extras > 1 ? `WD+${b.extras - 1}` : 'WD';
                bg = '#F59E0B';
                color = '#000';
                border = '1px solid #D97706';
              } else if (b.extraType === 'NO_BALL') {
                label = b.runs > 0 ? `NB+${b.runs}` : 'NB';
                bg = '#F97316';
                color = '#000';
                border = '1px solid #EA580C';
              } else if (b.extraType === 'BYE') {
                label = `${b.extras || 1}B`;
                bg = '#1E2638';
              } else if (b.extraType === 'LEG_BYE') {
                label = `${b.extras || 1}LB`;
                bg = '#1E2638';
              }
              return { label, bg, color, border };
            };

            return (
              <div style={{ background: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                      🏏 THIS OVER (Over {currentOverNum + 1})
                    </span>
                    {currentInnings.currentBowler && (
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                        • {currentInnings.currentBowler.name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FBBF24', fontFamily: 'monospace' }}>
                    {currentOverRuns} {currentOverRuns === 1 ? 'Run' : 'Runs'} in Over
                  </div>
                </div>

                {/* Current Over Delivery Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: prevOverDeliveries.length > 0 ? '12px' : '0' }}>
                  {currentOverDeliveries.length === 0 ? (
                    <span style={{ fontSize: '0.82rem', color: '#64748B', fontStyle: 'italic' }}>
                      Over about to start...
                    </span>
                  ) : (
                    currentOverDeliveries.map((b: any, idx: number) => {
                      const style = getBallStyle(b);
                      return (
                        <div
                          key={b.id || idx}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: style.bg,
                              color: style.color,
                              border: style.border,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.88rem',
                              fontFamily: 'monospace',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            }}
                          >
                            {style.label}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, fontFamily: 'monospace' }}>
                            {b.isLegal ? `.${b.ballNumber || idx + 1}` : 'ext'}
                          </span>
                        </div>
                      );
                    })
                  )}

                  {/* Remaining empty slots in the 6-ball over */}
                  {Array.from({ length: remainingSlots }).map((_, slotIdx) => (
                    <div
                      key={`slot-${slotIdx}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <span
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.02)',
                          color: '#475569',
                          border: '1.5px dashed rgba(255, 255, 255, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        ○
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600, fontFamily: 'monospace' }}>
                        .{legalBallsInCurrentOver + slotIdx + 1}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Previous Over Summary Strip */}
                {prevOverDeliveries.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', fontFamily: 'monospace' }}>
                      PREV OVER ({prevOverNum + 1}):
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {prevOverDeliveries.map((b: any, idx: number) => {
                        const style = getBallStyle(b);
                        return (
                          <span
                            key={b.id || idx}
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: style.bg,
                              color: style.color,
                              border: style.border,
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            {style.label}
                          </span>
                        );
                      })}
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, marginLeft: '4px' }}>
                        = {prevOverRuns} runs
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SCORING BUTTONS GRID */}
          <div
            style={{
              background: '#10141E',
              border: isPending ? '1.5px solid #F59E0B' : '1px solid #1E2638',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              position: 'relative',
              opacity: isPending ? 0.65 : 1,
              pointerEvents: isPending ? 'none' : 'auto',
              transition: 'all 0.15s ease',
            }}
          >
            {isPending && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(245, 158, 11, 0.18)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  color: '#FBBF24',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  letterSpacing: '0.02em',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#F59E0B',
                  }}
                />
                ⚡ Registering Delivery & Syncing Score... Please wait
              </div>
            )}

            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', marginBottom: '14px' }}>
              Runs off the Bat
            </div>

            {/* Standard Runs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  disabled={!currentInnings.currentBowlerId || isPending}
                  onClick={() => handleRecordBall(r)}
                  style={{
                    background: '#141A26',
                    border: '1px solid #2A364E',
                    color: '#FFF',
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    padding: '16px 0',
                    borderRadius: '10px',
                    cursor: !currentInnings.currentBowlerId || isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'monospace',
                    transition: 'all 0.1s',
                  }}
                >
                  +{r}
                </button>
              ))}

              {/* FOUR */}
              <button
                disabled={!currentInnings.currentBowlerId || isPending}
                onClick={() => handleRecordBall(4)}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  padding: '16px 0',
                  borderRadius: '10px',
                  cursor: !currentInnings.currentBowlerId || isPending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                }}
              >
                FOUR
              </button>

              {/* SIX */}
              <button
                disabled={!currentInnings.currentBowlerId || isPending}
                onClick={() => handleRecordBall(6)}
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  padding: '16px 0',
                  borderRadius: '10px',
                  cursor: !currentInnings.currentBowlerId || isPending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                }}
              >
                SIX
              </button>
            </div>

            {/* Extras & Wicket */}
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', marginBottom: '14px' }}>
              Extras & Wickets
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              <button
                disabled={!currentInnings.currentBowlerId || isPending}
                onClick={() => handleRecordBall(0, 'WIDE', 1)}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#FBBF24',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: !currentInnings.currentBowlerId || isPending ? 'not-allowed' : 'pointer',
                }}
              >
                WIDE (+1)
              </button>

              <button
                disabled={!currentInnings.currentBowlerId || isPending}
                onClick={() => handleRecordBall(0, 'NO_BALL', 1)}
                style={{
                  background: 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  color: '#FB923C',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: !currentInnings.currentBowlerId || isPending ? 'not-allowed' : 'pointer',
                }}
              >
                NO BALL (+1)
              </button>

              <button
                disabled={!currentInnings.currentBowlerId || isPending}
                onClick={() => handleRecordBall(1, 'BYE', 1)}
                style={{
                  background: '#141A26',
                  border: '1px solid #2A364E',
                  color: '#FFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: !currentInnings.currentBowlerId || isPending ? 'not-allowed' : 'pointer',
                }}
              >
                BYE (+1)
              </button>

              <button
                disabled={!currentInnings.currentBowlerId || isPending}
                onClick={() => handleRecordBall(1, 'LEG_BYE', 1)}
                style={{
                  background: '#141A26',
                  border: '1px solid #2A364E',
                  color: '#FFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: !currentInnings.currentBowlerId || isPending ? 'not-allowed' : 'pointer',
                }}
              >
                LEG BYE (+1)
              </button>

              <button
                disabled={!currentInnings.currentBowlerId || isPending}
                onClick={() => {
                  setDismissedId(currentInnings.currentStrikerId);
                  setShowWicketModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '1rem',
                  fontWeight: 900,
                  padding: '14px 0',
                  borderRadius: '8px',
                  cursor: !currentInnings.currentBowlerId || isPending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                }}
              >
                🔴 WICKET
              </button>
            </div>
          </div>

          {/* UTILITY CONTROLS */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', opacity: isPending ? 0.65 : 1, pointerEvents: isPending ? 'none' : 'auto' }}>
            <button
              onClick={handleUndo}
              disabled={isPending}
              style={{
                flex: 1,
                background: '#141A26',
                border: '1px solid #2A364E',
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
              onClick={handleSwapStrike}
              disabled={isPending}
              style={{
                flex: 1,
                background: '#141A26',
                border: '1px solid #2A364E',
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
              onClick={handleEndInnings}
              disabled={isPending}
              style={{
                flex: 1,
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#FBBF24',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              🏁 End Innings {currentInnings.inningsNumber}
            </button>

            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isPending}
              style={{
                flex: 1,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34D399',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              🏆 Complete Match
            </button>
          </div>

          {/* SQUAD SELECTION ACCORDION AT BOTTOM OF SCORING SCREEN */}
          <details style={{ background: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', marginTop: '16px', overflow: 'hidden' }}>
            <summary style={{ padding: '14px 18px', cursor: 'pointer', fontWeight: 800, color: '#94A3B8', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
              <span>👥 Match Playing Squads ({selectedTeamAPlayerIds.length} vs {selectedTeamBPlayerIds.length})</span>
              <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontFamily: 'monospace' }}>Click to View / Adjust</span>
            </summary>
            <div style={{ padding: '16px', borderTop: '1px solid #1E2638' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Team A Selection */}
                <div style={{ background: '#141A26', border: '1px solid #1E2638', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: '#FFF', fontSize: '0.85rem' }}>{match.teamA.name}</strong>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#C0272D', color: '#FFF', fontWeight: 800, fontFamily: 'monospace' }}>
                      {selectedTeamAPlayerIds.length} / {rawTeamAPlayers.length} Playing
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {rawTeamAPlayers.map((p: any) => {
                      const checked = selectedTeamAPlayerIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            backgroundColor: checked ? 'rgba(192, 39, 45, 0.2)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: checked ? '#FFF' : '#64748B',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePlayerA(p.id)}
                            style={{ accentColor: '#C0272D' }}
                          />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Team B Selection */}
                <div style={{ background: '#141A26', border: '1px solid #1E2638', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: '#FFF', fontSize: '0.85rem' }}>{match.teamB.name}</strong>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 800, fontFamily: 'monospace' }}>
                      {selectedTeamBPlayerIds.length} / {rawTeamBPlayers.length} Playing
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {rawTeamBPlayers.map((p: any) => {
                      const checked = selectedTeamBPlayerIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            backgroundColor: checked ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: checked ? '#FFF' : '#64748B',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePlayerB(p.id)}
                            style={{ accentColor: '#2563EB' }}
                          />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* WICKET MODAL */}
      {showWicketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #EF4444', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#EF4444', margin: '0 0 16px' }}>
              🔴 Record Wicket
            </h3>

            {wicketModalError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>
                {wicketModalError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                  Dismissed Batter *
                </label>
                <select
                  value={dismissedId}
                  onChange={(e) => setDismissedId(e.target.value)}
                  style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                >
                  <option value={currentInnings?.currentStrikerId}>Striker: {activeStriker?.name}</option>
                  <option value={currentInnings?.currentNonStrikerId}>Non-Striker: {activeNonStriker?.name}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                  Wicket Type *
                </label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                  style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#FBBF24' }}>
                    Next Incoming Batter * (Required - {availableBatters.length} available)
                  </label>
                  <select
                    value={newBatterId}
                    onChange={(e) => {
                      setNewBatterId(e.target.value);
                      if (e.target.value) setWicketModalError(null);
                    }}
                    style={{
                      width: '100%',
                      background: '#141A26',
                      border: wicketModalError && !newBatterId ? '2px solid #EF4444' : '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#FFF',
                    }}
                  >
                    <option value="">Select Next Batter...</option>
                    {availableBatters.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setWicketModalError(null);
                  setShowWicketModal(false);
                }}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordWicket}
                disabled={isPending}
                style={{ flex: 2, background: '#EF4444', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOWLER SELECTOR MODAL */}
      {showBowlerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FBBF24', margin: '0 0 16px' }}>
              🏏 Select Bowler for Next Over
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#FBBF24' }}>
                Bowler ({availableBowlers.length} eligible • 1 over max)
              </label>
              <select
                value={selectedBowlerId}
                onChange={(e) => setSelectedBowlerId(e.target.value)}
                style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Bowler...</option>
                {(availableBowlers.length > 0 ? availableBowlers : bowlingSquad).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowBowlerModal(false)}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleChangeBowler}
                disabled={isPending || !selectedBowlerId}
                style={{ flex: 2, background: '#F59E0B', border: 'none', color: '#000', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: isPending || !selectedBowlerId ? 'not-allowed' : 'pointer' }}
              >
                Set Bowler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE MATCH MODAL */}
      {showCompleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #10B981', borderRadius: '16px', padding: '24px', maxWidth: '460px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34D399', margin: '0 0 16px' }}>
              🏆 Finalize & Complete Match
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                  Winning Team
                </label>
                <select
                  value={winnerTeamId}
                  onChange={(e) => setWinnerTeamId(e.target.value)}
                  style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                >
                  <option value="">No Winner / Tie / Abandoned</option>
                  <option value={match.teamAId}>{match.teamA.name}</option>
                  <option value={match.teamBId}>{match.teamB.name}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                  Result Summary / Note
                </label>
                <input
                  type="text"
                  value={resultNote}
                  onChange={(e) => setResultNote(e.target.value)}
                  placeholder="e.g. Team A won by 14 runs"
                  style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowCompleteModal(false)}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteMatch}
                disabled={isPending}
                style={{ flex: 2, background: '#10B981', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: isPending ? 'not-allowed' : 'pointer' }}
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
