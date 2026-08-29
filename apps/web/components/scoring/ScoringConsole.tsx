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
  updateMatchRulesAction,
  editBallDeliveryAction,
  deleteBallDeliveryAction,
  startSuperOverAction,
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
  const [activeInningsTabNumber, setActiveInningsTabNumber] = useState<number>(initialMatch?.currentInnings || 1);

  // Super Over State
  const [showSuperOverModal, setShowSuperOverModal] = useState(false);
  const [superOverBattingTeamId, setSuperOverBattingTeamId] = useState<string>('');
  const [superOverBallsPerOver, setSuperOverBallsPerOver] = useState<number>(initialMatch?.ballsPerOver || 6);

  // Ball Editing Modal State
  const [editingBall, setEditingBall] = useState<any | null>(null);
  const [editRuns, setEditRuns] = useState<number>(0);
  const [editExtraType, setEditExtraType] = useState<string>('NONE');
  const [editExtras, setEditExtras] = useState<number>(0);
  const [editIsWicket, setEditIsWicket] = useState<boolean>(false);
  const [editWicketType, setEditWicketType] = useState<string>('BOWLED');
  const [isEditingBallSaving, setIsEditingBallSaving] = useState(false);

  async function handleStartSuperOver() {
    const teamId = superOverBattingTeamId || match.teamBId;
    setIsEditingBallSaving(true);
    try {
      const res = await startSuperOverAction(match.id, {
        battingFirstTeamId: teamId,
        ballsPerOver: superOverBallsPerOver || match.ballsPerOver || 6,
      });
      if (res?.updatedMatch) {
        setMatch(res.updatedMatch);
      }
      setShowSuperOverModal(false);
    } catch (err: any) {
      alert(`Failed to start Super Over: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsEditingBallSaving(false);
    }
  }

  function openEditBallModal(b: any) {
    setEditingBall(b);
    setEditRuns(b.runs || 0);
    setEditExtraType(b.extraType || 'NONE');
    setEditExtras(b.extras || 0);
    setEditIsWicket(Boolean(b.isWicket));
    setEditWicketType(b.wicketType || 'BOWLED');
  }

  async function handleSaveEditedBall() {
    if (!editingBall) return;
    setIsEditingBallSaving(true);
    try {
      const res = await editBallDeliveryAction(editingBall.id, {
        runs: editRuns,
        extraType: editExtraType as any,
        extras: editExtras,
        isWicket: editIsWicket,
        wicketType: editIsWicket ? editWicketType : undefined,
      });
      if (res?.updatedMatch) {
        setMatch(res.updatedMatch);
      }
      setEditingBall(null);
    } catch (err: any) {
      alert(`Failed to save delivery edit: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsEditingBallSaving(false);
    }
  }

  async function handleDeleteBall() {
    if (!editingBall) return;
    const confirmed = window.confirm(
      `⚠️ VERIFICATION REQUIRED\n\nAre you sure you want to delete this delivery (Over ${editingBall.overNumber + 1}, Ball ${editingBall.ballNumber})?\n\nThis will remove the ball and recalculate all overs and statistics.`
    );
    if (!confirmed) return;
    setIsEditingBallSaving(true);
    try {
      const res = await deleteBallDeliveryAction(editingBall.id);
      if (res?.updatedMatch) {
        setMatch(res.updatedMatch);
      }
      setEditingBall(null);
    } catch (err: any) {
      alert(`Failed to delete delivery: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsEditingBallSaving(false);
    }
  }

  async function handleUpdateBallsPerOver(val: number) {
    if (!val || val < 1 || val > 12) return;
    setMatch((prev: any) => ({ ...prev, ballsPerOver: val }));
    try {
      const res = await updateMatchRulesAction(match.id, { ballsPerOver: val });
      if (res?.updatedMatch) {
        setMatch(res.updatedMatch);
      }
    } catch (err: any) {
      console.error('Failed to update balls per over:', err);
    }
  }

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
  const [wicketRuns, setWicketRuns] = useState<number>(0);
  const [wicketModalError, setWicketModalError] = useState<string | null>(null);

  const [showBatterModal, setShowBatterModal] = useState(false);
  const [targetRole, setTargetRole] = useState<'striker' | 'nonStriker'>('striker');
  const [selectedBatterId, setSelectedBatterId] = useState<string>('');

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

  // Supabase Realtime Subscription (Syncs entire match state on live score events)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`match:${match.id}`);

    channel
      .on('broadcast', { event: 'score_update' }, async () => {
        try {
          const res = await fetch(`/api/matches/${match.id}/scorecard?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          });
          const data = await res.json();
          if (data && data.success && data.match) {
            setMatch(data.match);
          }
        } catch (e) {}
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

  // Available new batters (not out OR retired hurt wishing to resume, and not currently batting)
  const availableBatters = battingSquad.filter((p: any) => {
    const score = currentInnings?.battingScores?.find((b: any) => b.playerId === p.id);
    const isCurrentlyBatting = p.id === currentInnings?.currentStrikerId || p.id === currentInnings?.currentNonStrikerId;
    const isRetiredHurt = score?.dismissal?.toLowerCase().includes('retired hurt');
    const isOut = score?.isOut && !isRetiredHurt;
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

    // Strict Validation: Striker MUST be selected
    if (!currentInnings.currentStrikerId) {
      setTargetRole('striker');
      setShowBatterModal(true);
      setError('⚠️ Please select the incoming striker batter before recording deliveries.');
      return;
    }

    // Strict Validation: Non-Striker MUST be selected
    if (!currentInnings.currentNonStrikerId) {
      setTargetRole('nonStriker');
      setShowBatterModal(true);
      setError('⚠️ Please select the incoming non-striker batter before recording deliveries.');
      return;
    }

    // Strict Validation: Bowler MUST be selected
    if (!currentInnings.currentBowlerId) {
      setShowBowlerModal(true);
      setError('⚠️ Please select a bowler before recording deliveries.');
      return;
    }

    const isSuperOver = currentInnings.inningsNumber >= 3;
    const maxOvers = isSuperOver ? 1 : (match.oversPerInnings || 20);
    const matchBallsPerOver = match.ballsPerOver || 6;

    // Check if the previous over finished and a new bowler needs to be chosen for the new over (never for Super Over)
    const isCurrentBowlerOverDone = (bowlerScore?.overs || 0) >= 1 || ((bowlerScore?.balls || 0) + (bowlerScore?.overs || 0) * matchBallsPerOver) >= matchBallsPerOver;
    if (!isSuperOver && currentInnings.balls === 0 && currentInnings.overs > 0 && currentInnings.overs < maxOvers && isCurrentBowlerOverDone) {
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
      if (nextBalls >= matchBallsPerOver) {
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
      // Note: Modal is NOT opened here on over completion, giving the fielding team break time to think
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
          if (bBalls >= matchBallsPerOver) {
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
        overNumber: currentInnings.overs,
        ballNumber: isLegal ? currentInnings.balls + 1 : currentInnings.balls,
        runs,
        extras: extraType !== 'NONE' ? (extraRuns > 0 ? extraRuns : 1) : 0,
        extraType,
        isLegal,
        isWicket: false,
        createdAt: new Date().toISOString(),
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

    if (!currentInnings.currentStrikerId) {
      setTargetRole('striker');
      setShowBatterModal(true);
      setError('⚠️ Please select the active striker batter before recording a wicket.');
      return;
    }

    if (!currentInnings.currentNonStrikerId) {
      setTargetRole('nonStriker');
      setShowBatterModal(true);
      setError('⚠️ Please select the active non-striker batter before recording a wicket.');
      return;
    }

    const matchBallsPerOver = match.ballsPerOver || 6;

    const isSuperOver = currentInnings.inningsNumber >= 3;
    const maxOvers = isSuperOver ? 1 : (match.oversPerInnings || 20);

    // Check if previous over finished and a new bowler needs to be chosen for the new over (never for Super Over)
    const isCurrentBowlerOverDone = (bowlerScore?.overs || 0) >= 1 || ((bowlerScore?.balls || 0) + (bowlerScore?.overs || 0) * matchBallsPerOver) >= matchBallsPerOver;
    if (!isSuperOver && currentInnings.balls === 0 && currentInnings.overs > 0 && currentInnings.overs < maxOvers && isCurrentBowlerOverDone) {
      setShowBowlerModal(true);
      setError(`⚠️ Over ${currentInnings.overs + 1} is starting. Please select the next bowler before recording a wicket.`);
      return;
    }

    const dismissedPlayerId = dismissedId || currentInnings.currentStrikerId;
    const incomingBatterId = newBatterId || null;
    const runsScoredOnWicket = wicketRuns || 0;

    setWicketModalError(null);
    setError(null);
    setShowWicketModal(false);

    let nextBalls = currentInnings.balls + 1;
    let nextOvers = currentInnings.overs;
    let isOverComplete = false;
    if (nextBalls >= matchBallsPerOver) {
      nextOvers += 1;
      nextBalls = 0;
      isOverComplete = true;
    }

    let nextStrikerId = currentInnings.currentStrikerId;
    let nextNonStrikerId = currentInnings.currentNonStrikerId;

    if (dismissedPlayerId === currentInnings.currentStrikerId) {
      nextStrikerId = incomingBatterId;
    } else {
      nextNonStrikerId = incomingBatterId;
    }

    // Strike rotation if odd runs completed before run out
    if (runsScoredOnWicket % 2 !== 0) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    if (isOverComplete) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
      if (!isSuperOver && nextOvers < maxOvers) {
        setShowBowlerModal(true);
      }
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

      const isRetHurt = wicketType === 'RETIRED_HURT';

      let updatedBattingScores = (curInn.battingScores || []).map((b: any) => {
        let r = b.runs;
        let balls = b.balls;
        let fours = b.fours;
        let sixes = b.sixes;

        // Striker gets the completed runs and ball faced
        if (b.playerId === currentInnings.currentStrikerId) {
          r += runsScoredOnWicket;
          balls += 1;
          if (runsScoredOnWicket === 4) fours += 1;
          if (runsScoredOnWicket === 6) sixes += 1;
        }

        if (b.playerId === dismissedPlayerId) {
          return {
            ...b,
            runs: r,
            balls,
            fours,
            sixes,
            isOut: !isRetHurt,
            dismissal: dismissalLabel,
          };
        }
        if (b.playerId === currentInnings.currentStrikerId) {
          return {
            ...b,
            runs: r,
            balls,
            fours,
            sixes,
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
          runs: dismissedPlayerId === currentInnings.currentStrikerId ? runsScoredOnWicket : 0,
          balls: dismissedPlayerId === currentInnings.currentStrikerId ? 1 : 0,
          fours: (dismissedPlayerId === currentInnings.currentStrikerId && runsScoredOnWicket === 4) ? 1 : 0,
          sixes: (dismissedPlayerId === currentInnings.currentStrikerId && runsScoredOnWicket === 6) ? 1 : 0,
          isOut: !isRetHurt,
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
          if (bBalls >= matchBallsPerOver) {
            bOvers += 1;
            bBalls = 0;
          }
          return {
            ...bw,
            overs: bOvers,
            balls: bBalls,
            runsConceded: (bw.runsConceded || 0) + runsScoredOnWicket,
            wickets: (bw.wickets || 0) + (wicketType !== 'RUN_OUT' && wicketType !== 'TIMED_OUT' && wicketType !== 'RETIRED_HURT' ? 1 : 0),
          };
        }
        return bw;
      });

      const newBallEvent = {
        id: `temp-${Date.now()}`,
        overNumber: currentInnings.overs,
        ballNumber: currentInnings.balls + 1,
        runs: runsScoredOnWicket,
        extras: 0,
        extraType: 'NONE',
        isLegal: true,
        isWicket: true,
        wicketType,
        dismissedPlayerId,
        createdAt: new Date().toISOString(),
      };

      const nextInnings = prev.innings.map((inn: any) => {
        if (inn.id === currentInnings.id) {
          return {
            ...inn,
            runs: inn.runs + runsScoredOnWicket,
            wickets: inn.wickets + (isRetHurt ? 0 : 1),
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
          runs: runsScoredOnWicket,
          isWicket: true,
          wicketType: wicketType as any,
          dismissedPlayerId,
          newBatterId: incomingBatterId || undefined,
          expectedUpdatedAt: currentInnings.updatedAt,
        });
        if (res && res.success) {
          setNewBatterId('');
          setWicketRuns(0);
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

  const handleSwitchBatter = () => {
    if (!currentInnings || !selectedBatterId) return;
    setError(null);
    setShowBatterModal(false);

    // ⚡ 0ms Instant Optimistic State for Batter Switch / Resume
    const incomingPlayer = battingSquad.find((p: any) => p.id === selectedBatterId);
    setMatch((prev: any) => {
      if (!prev) return prev;
      const isStriker = targetRole === 'striker';
      const isCurrentlyOther = isStriker 
        ? currentInnings.currentNonStrikerId === selectedBatterId 
        : currentInnings.currentStrikerId === selectedBatterId;

      let nextStrikerId = currentInnings.currentStrikerId;
      let nextNonStrikerId = currentInnings.currentNonStrikerId;

      if (isStriker) {
        if (isCurrentlyOther) {
          nextNonStrikerId = (currentInnings.currentStrikerId && currentInnings.currentStrikerId !== selectedBatterId) 
            ? currentInnings.currentStrikerId 
            : null;
        }
        nextStrikerId = selectedBatterId;
      } else {
        if (isCurrentlyOther) {
          nextStrikerId = (currentInnings.currentNonStrikerId && currentInnings.currentNonStrikerId !== selectedBatterId) 
            ? currentInnings.currentNonStrikerId 
            : null;
        }
        nextNonStrikerId = selectedBatterId;
      }

      const sPlayer = allKnownPlayers.find((p: any) => p.id === nextStrikerId);
      const nsPlayer = allKnownPlayers.find((p: any) => p.id === nextNonStrikerId);

      const nextInnings = prev.innings.map((inn: any) => {
        if (inn.id === currentInnings.id) {
          let updatedBattingScores = (inn.battingScores || []).map((b: any) => {
            if (b.playerId === nextStrikerId) {
              return { ...b, isOut: false, dismissal: null, isStriker: true };
            }
            if (b.playerId === nextNonStrikerId) {
              return { ...b, isOut: false, dismissal: null, isStriker: false };
            }
            return b;
          });

          if (!updatedBattingScores.some((b: any) => b.playerId === selectedBatterId)) {
            updatedBattingScores.push({
              id: `temp-switch-${Date.now()}`,
              playerId: selectedBatterId,
              player: incomingPlayer,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              isOut: false,
              dismissal: null,
              isStriker,
            });
          }

          return {
            ...inn,
            currentStrikerId: nextStrikerId,
            currentNonStrikerId: nextNonStrikerId,
            currentStriker: sPlayer || inn.currentStriker,
            currentNonStriker: nsPlayer || null,
            battingScores: updatedBattingScores,
          };
        }
        return inn;
      });
      return { ...prev, innings: nextInnings };
    });

    startTransition(async () => {
      try {
        const res = await switchBatterAction(currentInnings.id, targetRole, selectedBatterId);
        if (!res.success) {
          setError(res.error || 'Failed to assign incoming batter.');
        } else if ((res as any).updatedMatch) {
          setMatch((res as any).updatedMatch);
        }
        setSelectedBatterId('');
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

  const renderInningsDeliveryLog = (inn: any) => {
    if (!inn) return null;
    const deliveries = inn.ballEvents || [];

    // Group deliveries by overNumber
    const oversMap: Record<number, any[]> = {};
    deliveries.forEach((b: any) => {
      const ov = b.overNumber ?? 0;
      if (!oversMap[ov]) oversMap[ov] = [];
      oversMap[ov].push(b);
    });
    const overKeys = Object.keys(oversMap).map(Number).sort((a, b) => b - a); // latest over first

    return (
      <div style={{ background: '#10141E', border: '1px solid #1E2638', borderRadius: '16px', padding: '20px', marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋 Over-by-Over & Ball-by-Ball Log</span>
              <span style={{ fontSize: '0.8rem', background: '#141A26', border: '1px solid #2A364E', padding: '2px 8px', borderRadius: '6px', color: '#FBBF24', fontFamily: 'monospace' }}>
                Innings {inn.inningsNumber}: {inn.battingTeam?.name} ({inn.runs}/{inn.wickets} in {inn.overs}.{inn.balls} ov)
              </span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#8B9BB4', margin: '4px 0 0' }}>
              Click on any ball delivery below to edit runs, extras, wickets, or delete a delivery. Statistics will automatically recalculate.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'monospace' }}>
            {deliveries.length} balls bowled
          </span>
        </div>

        {deliveries.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '0.9rem', fontStyle: 'italic', background: '#141A26', borderRadius: '10px' }}>
            No deliveries recorded yet for this innings.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {overKeys.map((ovNum) => {
              const overBalls = [...oversMap[ovNum]].sort((a: any, b: any) => {
                const tA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id?.startsWith('temp-') ? Number(a.id.replace('temp-', '')) : 0);
                const tB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id?.startsWith('temp-') ? Number(b.id.replace('temp-', '')) : 0);
                return tA - tB;
              });
              const overRuns = overBalls.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0);
              const overWickets = overBalls.filter((b: any) => b.isWicket).length;
              const bowlerName = overBalls[0]?.bowler?.name || 'Bowler';

              return (
                <div
                  key={`over-group-${inn.id}-${ovNum}`}
                  style={{
                    background: '#141A26',
                    border: '1px solid #1E2638',
                    borderRadius: '10px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FBBF24', fontFamily: 'monospace' }}>
                      OVER {ovNum + 1} • {bowlerName}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700, fontFamily: 'monospace' }}>
                      {overRuns} Runs {overWickets > 0 ? `• ${overWickets} Wicket${overWickets === 1 ? '' : 's'}` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {overBalls.map((b: any, idx: number) => {
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

                      return (
                        <button
                          key={b.id || idx}
                          type="button"
                          onClick={() => openEditBallModal(b)}
                          title={`Click to edit: Over ${ovNum + 1}.${b.ballNumber || idx + 1} (${b.batsman?.name || 'Batter'} vs ${b.bowler?.name || 'Bowler'})`}
                          style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                          }}
                        >
                          <span
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: bg,
                              color: color,
                              border: border,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.82rem',
                              fontFamily: 'monospace',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              transition: 'transform 0.1s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            {label}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 700, fontFamily: 'monospace' }}>
                            {b.isLegal ? `.${b.ballNumber || idx + 1}` : 'ext'} ✏️
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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
              {match.tournament?.name} • {match.oversPerInnings} Overs ({match.ballsPerOver || 6} Balls/Over)
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
      {match.status === 'LIVE' && currentInnings && (!currentInnings.currentStrikerId || !currentInnings.currentNonStrikerId) && currentInnings.overs === 0 && currentInnings.balls === 0 && (!currentInnings.ballEvents || currentInnings.ballEvents.length === 0) && (
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
      {match.status === 'LIVE' && currentInnings && (currentInnings.overs > 0 || currentInnings.balls > 0 || (currentInnings.currentStrikerId && currentInnings.currentNonStrikerId) || (currentInnings.ballEvents && currentInnings.ballEvents.length > 0)) && (
        <div>
          {/* 2ND INNINGS / SUPER OVER CHASE EQUATION BAR */}
          {(currentInnings.inningsNumber === 2 || currentInnings.inningsNumber === 4) && (() => {
            const firstInnNum = currentInnings.inningsNumber === 2 ? 1 : 3;
            const inn1 = match.innings?.find((i: any) => i.inningsNumber === firstInnNum);
            const target = (inn1?.runs || 0) + 1;
            const needed = Math.max(0, target - currentInnings.runs);
            const bPerOver = match.ballsPerOver || 6;
            const totalOvers = currentInnings.inningsNumber === 4 ? 1 : (match.oversPerInnings || 20);
            const totalBalls = totalOvers * bPerOver;
            const bowled = (currentInnings.overs * bPerOver) + currentInnings.balls;
            const ballsLeft = Math.max(0, totalBalls - bowled);
            const rrr = ballsLeft > 0 ? ((needed / ballsLeft) * bPerOver).toFixed(2) : '0.00';
            const totalBowledOvers = currentInnings.overs + (currentInnings.balls / bPerOver);
            const crr = totalBowledOvers > 0 ? (currentInnings.runs / totalBowledOvers).toFixed(2) : '0.00';

            return (
              <div
                style={{
                  marginTop: '14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid #2A364E',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
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
                      borderRadius: '9999px',
                      background: '#C0272D',
                      color: '#FFFFFF',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                    }}
                  >
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        display: 'inline-block',
                        animation: 'pulseDot 1.4s ease-in-out infinite',
                      }}
                    />
                    {currentInnings.inningsNumber === 4 ? 'SUPER OVER CHASE' : 'CHASE'}
                  </span>

                  <span style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', color: '#FFF' }}>
                    {currentInnings.battingTeam?.name || 'Batting Team'} NEED <span style={{ color: '#F59E0B' }}>{needed} RUNS</span> IN <span style={{ color: '#F59E0B' }}>{ballsLeft} BALLS</span>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  <span>TARGET: <strong style={{ color: '#FFF' }}>{target}</strong></span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                  <span>RRR: <strong style={{ color: '#F59E0B' }}>{rrr}</strong></span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                  <span>CRR: <strong style={{ color: '#FFF' }}>{crr}</strong></span>
                </div>
              </div>
            );
          })()}

          {/* CURRENT BATTERS & BOWLER BAR */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Batters */}
            <div style={{ background: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Active Batters
                </span>
                <button
                  type="button"
                  onClick={handleSwapStrike}
                  disabled={isPending}
                  style={{
                    background: '#1E2638',
                    border: '1px solid #2A364E',
                    color: '#FFB800',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                  }}
                >
                  🔄 Swap Strike
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Striker */}
                {activeStriker ? (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FBBF24' }}>★ ON STRIKE</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>SR: {strikerScore?.balls ? ((strikerScore.runs / strikerScore.balls) * 100).toFixed(1) : '0.0'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetRole('striker');
                            setSelectedBatterId(activeStriker?.id || '');
                            setShowBatterModal(true);
                          }}
                          style={{
                            background: '#1E2638',
                            border: '1px solid #2A364E',
                            color: '#FBBF24',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          ✏️ Change
                        </button>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1.05rem' }}>
                      {activeStriker?.name || 'Striker'}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FBBF24', fontFamily: 'monospace', marginTop: '4px' }}>
                      {strikerScore?.runs || 0} <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>({strikerScore?.balls || 0}b • {strikerScore?.fours || 0}x4 {strikerScore?.sixes || 0}x6)</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1.5px dashed #EF4444', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444', marginBottom: '6px' }}>
                      ⚠️ STRIKER PENDING (Walking In)
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTargetRole('striker'); setShowBatterModal(true); }}
                      style={{ width: '100%', background: '#EF4444', color: '#FFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      🏏 Select Incoming Striker →
                    </button>
                  </div>
                )}

                {/* Non-Striker */}
                {activeNonStriker && currentInnings?.currentStrikerId !== currentInnings?.currentNonStrikerId ? (
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid #1E2638', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>NON-STRIKER</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>SR: {nonStrikerScore?.balls ? ((nonStrikerScore.runs / nonStrikerScore.balls) * 100).toFixed(1) : '0.0'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetRole('nonStriker');
                            setSelectedBatterId(activeNonStriker?.id || '');
                            setShowBatterModal(true);
                          }}
                          style={{
                            background: '#1E2638',
                            border: '1px solid #2A364E',
                            color: '#CBD5E1',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          ✏️ Change
                        </button>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#FFF', fontSize: '1.05rem' }}>
                      {activeNonStriker?.name || 'Non-Striker'}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', fontFamily: 'monospace', marginTop: '4px' }}>
                      {nonStrikerScore?.runs || 0} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>({nonStrikerScore?.balls || 0}b • {nonStrikerScore?.fours || 0}x4 {nonStrikerScore?.sixes || 0}x6)</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1.5px dashed #EF4444', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444', marginBottom: '6px' }}>
                      ⚠️ {currentInnings?.currentStrikerId === currentInnings?.currentNonStrikerId ? 'DUPLICATE NON-STRIKER CONFLICT' : 'NON-STRIKER PENDING'}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTargetRole('nonStriker'); setSelectedBatterId(''); setShowBatterModal(true); }}
                      style={{ width: '100%', background: '#EF4444', color: '#FFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      🏏 Select Distinct Non-Striker →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bowler */}
            <div style={{ background: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Current Bowler</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBowlerId(activeBowler?.id || '');
                    setShowBowlerModal(true);
                  }}
                  style={{ background: '#1E2638', border: '1px solid #2A364E', color: '#FBBF24', borderRadius: '4px', padding: '3px 9px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  🔄 Change Bowler
                </button>
              </div>

              {activeBowler ? (
                (() => {
                  const isSuperOver = currentInnings.inningsNumber >= 3;
                  const maxOvers = isSuperOver ? 1 : (match.oversPerInnings || 20);
                  const matchBallsPerOver = match.ballsPerOver || 6;
                  const isOverDone = (bowlerScore?.overs || 0) >= 1 || ((bowlerScore?.balls || 0) + (bowlerScore?.overs || 0) * matchBallsPerOver) >= matchBallsPerOver;
                  const isNewOverPending = !isSuperOver && currentInnings.balls === 0 && currentInnings.overs > 0 && currentInnings.overs < maxOvers && isOverDone;

                  if (isSuperOver && (currentInnings.overs >= 1 || currentInnings.wickets >= 2)) {
                    return (
                      <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1.5px solid #F59E0B', borderRadius: '8px', padding: '10px', marginTop: '6px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#FBBF24', marginBottom: '4px' }}>
                          ⚡ SUPER OVER {currentInnings.inningsNumber === 3 ? '1' : '2'} COMPLETE!
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>
                          {currentInnings.overs}.{currentInnings.balls} ov bowled • {currentInnings.runs}/{currentInnings.wickets}
                        </div>
                      </div>
                    );
                  }

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
                          onClick={() => {
                            setSelectedBowlerId('');
                            setShowBowlerModal(true);
                          }}
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
                  onClick={() => {
                    setSelectedBowlerId('');
                    setShowBowlerModal(true);
                  }}
                  style={{ width: '100%', background: '#EF4444', color: '#FFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                >
                  ⚠️ Select Next Bowler
                </button>
              )}
            </div>
          </div>

          {/* THIS OVER CARD */}
          {(() => {
            const matchBallsPerOver = match.ballsPerOver || 6;
            const allDeliveries = currentInnings.ballEvents || [];
            const currentOverNum = currentInnings.overs ?? 0;
            const sortBalls = (list: any[]) => [...list].sort((a: any, b: any) => {
              const tA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id?.startsWith('temp-') ? Number(a.id.replace('temp-', '')) : 0);
              const tB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id?.startsWith('temp-') ? Number(b.id.replace('temp-', '')) : 0);
              return tA - tB;
            });
            const currentOverDeliveries = sortBalls(allDeliveries.filter((b: any) => b.overNumber === currentOverNum));
            const currentOverRuns = currentOverDeliveries.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0);
            const legalBallsInCurrentOver = currentOverDeliveries.filter((b: any) => b.isLegal).length;
            const remainingSlots = Math.max(0, matchBallsPerOver - legalBallsInCurrentOver);

            const prevOverNum = currentOverNum - 1;
            const prevOverDeliveries = prevOverNum >= 0 ? sortBalls(allDeliveries.filter((b: any) => b.overNumber === prevOverNum)) : [];
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

          {/* MATCH TIED / SUPER OVER BANNER */}
          {(() => {
            const inn1 = match.innings?.find((i: any) => i.inningsNumber === 1);
            const inn2 = match.innings?.find((i: any) => i.inningsNumber === 2);
            const isTied = Boolean(inn1 && inn2 && inn1.runs === inn2.runs && (inn2.status === 'COMPLETED' || inn2.overs >= match.oversPerInnings || inn2.wickets >= 10 || match.status === 'COMPLETED') && match.currentInnings <= 2);
            if (!isTied) return null;

            return (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
                  border: '1.5px solid #F59E0B',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🔥 MATCH TIED! ({inn1.runs} - {inn2.runs})</span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginTop: '4px' }}>
                      Scores are level! You can start an official 1-Over Super Over tie-breaker, or declare the match result.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShowSuperOverModal(true)}
                      disabled={isPending}
                      style={{
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        color: '#000',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontWeight: 900,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        boxShadow: '0 3px 12px rgba(245, 158, 11, 0.4)',
                      }}
                    >
                      ⚡ Start Super Over (Tie-Breaker) →
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCompleteModal(true)}
                      disabled={isPending}
                      style={{
                        background: '#1E2638',
                        color: '#FFF',
                        border: '1px solid #2A364E',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      🏆 Finalize Result
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* INNINGS 1 QUOTA REACHED BANNER */}
          {match.currentInnings === 1 && (currentInnings.overs >= match.oversPerInnings || currentInnings.wickets >= 10) && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '14px',
                padding: '18px 20px',
                marginBottom: '20px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FBBF24', letterSpacing: '-0.01em' }}>
                    ⚡ INNINGS 1 QUOTA COMPLETED ({currentInnings.runs}/{currentInnings.wickets} in {currentInnings.overs}.{currentInnings.balls} Overs)
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginTop: '4px' }}>
                    All {match.oversPerInnings} overs have been bowled. Review or edit deliveries below, or close Innings 1 to begin the 2nd Innings run chase.
                  </div>
                </div>
                <button
                  onClick={handleEndInnings}
                  disabled={isPending}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFF',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    boxShadow: '0 3px 12px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  🏁 End Innings 1 & Start Innings 2 →
                </button>
              </div>
            </div>
          )}

          {/* SUPER OVER 1 QUOTA REACHED BANNER */}
          {match.currentInnings === 3 && (currentInnings.overs >= 1 || currentInnings.wickets >= 2) && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1.5px solid #F59E0B',
                borderRadius: '14px',
                padding: '18px 20px',
                marginBottom: '20px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FBBF24' }}>
                    🔥 SUPER OVER 1 COMPLETED ({currentInnings.runs}/{currentInnings.wickets} in {currentInnings.overs}.{currentInnings.balls} ov)
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginTop: '4px' }}>
                    Super Over 1 finished! Target for Super Over 2 is {currentInnings.runs + 1} runs.
                  </div>
                </div>
                <button
                  onClick={handleEndInnings}
                  disabled={isPending}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFF',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  🏁 End Super Over 1 & Start Super Over 2 →
                </button>
              </div>
            </div>
          )}

          {/* WICKET FALLEN: PROMPT INCOMING BATTER */}
          {(!currentInnings.currentStrikerId || !currentInnings.currentNonStrikerId) && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1.5px solid #EF4444',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>🔒</span>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#FCA5A5', letterSpacing: '-0.01em' }}>
                    SCORING FROZEN: INCOMING BATTER REQUIRED
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px' }}>
                    A wicket has fallen. Scoring is locked until you select the incoming {!currentInnings.currentStrikerId ? 'Striker' : 'Non-Striker'}.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTargetRole(!currentInnings.currentStrikerId ? 'striker' : 'nonStriker');
                  setShowBatterModal(true);
                }}
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(239, 68, 68, 0.4)',
                }}
              >
                🏏 Select Incoming {!currentInnings.currentStrikerId ? 'Striker' : 'Non-Striker'} →
              </button>
            </div>
          )}

          {/* SCORING BUTTONS GRID (FROZEN IF BATTER OR BOWLER PENDING) */}
          {(() => {
            const isBatterPending = !currentInnings.currentStrikerId || !currentInnings.currentNonStrikerId;
            const isBowlerPending = !currentInnings.currentBowlerId;
            const isScorePadLocked = isBatterPending || isBowlerPending || isPending;

            return (
              <div
                style={{
                  background: '#10141E',
                  border: isBatterPending ? '1.5px dashed #EF4444' : (isPending ? '1.5px solid #F59E0B' : '1px solid #1E2638'),
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '20px',
                  position: 'relative',
                  opacity: isScorePadLocked ? 0.45 : 1,
                  filter: isBatterPending ? 'grayscale(0.6)' : 'none',
                  pointerEvents: isScorePadLocked ? 'none' : 'auto',
                  cursor: isScorePadLocked ? 'not-allowed' : 'default',
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
                      disabled={isScorePadLocked}
                      onClick={() => handleRecordBall(r)}
                      style={{
                        background: '#141A26',
                        border: '1px solid #2A364E',
                        color: '#FFF',
                        fontSize: '1.4rem',
                        fontWeight: 900,
                        padding: '16px 0',
                        borderRadius: '10px',
                        cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                        fontFamily: 'monospace',
                        transition: 'all 0.1s',
                      }}
                    >
                      +{r}
                    </button>
                  ))}

                  {/* FOUR */}
                  <button
                    disabled={isScorePadLocked}
                    onClick={() => handleRecordBall(4)}
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      border: 'none',
                      color: '#FFF',
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      padding: '16px 0',
                      borderRadius: '10px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    FOUR
                  </button>

                  {/* SIX */}
                  <button
                    disabled={isScorePadLocked}
                    onClick={() => handleRecordBall(6)}
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                      border: 'none',
                      color: '#FFF',
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      padding: '16px 0',
                      borderRadius: '10px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
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
                    disabled={isScorePadLocked}
                    onClick={() => handleRecordBall(0, 'WIDE', 1)}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#FBBF24',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      padding: '14px 0',
                      borderRadius: '8px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    WIDE (+1)
                  </button>

                  <button
                    disabled={isScorePadLocked}
                    onClick={() => handleRecordBall(0, 'NO_BALL', 1)}
                    style={{
                      background: 'rgba(249, 115, 22, 0.15)',
                      border: '1px solid rgba(249, 115, 22, 0.4)',
                      color: '#FB923C',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      padding: '14px 0',
                      borderRadius: '8px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    NO BALL (+1)
                  </button>

                  <button
                    disabled={isScorePadLocked}
                    onClick={() => handleRecordBall(1, 'BYE', 1)}
                    style={{
                      background: '#141A26',
                      border: '1px solid #2A364E',
                      color: '#FFF',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      padding: '14px 0',
                      borderRadius: '8px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    BYE (+1)
                  </button>

                  <button
                    disabled={isScorePadLocked}
                    onClick={() => handleRecordBall(1, 'LEG_BYE', 1)}
                    style={{
                      background: '#141A26',
                      border: '1px solid #2A364E',
                      color: '#FFF',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      padding: '14px 0',
                      borderRadius: '8px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    LEG BYE (+1)
                  </button>

                  <button
                    disabled={isScorePadLocked}
                    onClick={() => {
                      setDismissedId(currentInnings.currentStrikerId || '');
                      setWicketRuns(0);
                      setWicketType('CAUGHT');
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
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    🔴 WICKET
                  </button>
                </div>
              </div>
            );
          })()}

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

            {currentInnings.inningsNumber <= 2 && (
              <button
                onClick={() => setShowSuperOverModal(true)}
                disabled={isPending}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.25) 100%)',
                  border: '1.5px solid #F59E0B',
                  color: '#FBBF24',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                }}
              >
                ⚡ Super Over
              </button>
            )}

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

          {/* INNINGS TABS FOR OVER-BY-OVER INSPECTION & EDITING */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Innings to View / Edit Deliveries:
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {(match.innings || []).map((inn: any) => {
                const isSelected = (activeInningsTabNumber || match.currentInnings) === inn.inningsNumber;
                const label = inn.inningsNumber === 1 ? '1st Innings' : inn.inningsNumber === 2 ? '2nd Innings' : inn.inningsNumber === 3 ? 'Super Over 1' : `Super Over ${inn.inningsNumber - 2}`;
                return (
                  <button
                    key={inn.id}
                    type="button"
                    onClick={() => setActiveInningsTabNumber(inn.inningsNumber)}
                    style={{
                      flex: '0 0 auto',
                      background: isSelected ? '#C0272D' : '#141A26',
                      color: isSelected ? '#FFF' : 'rgba(255, 255, 255, 0.7)',
                      border: isSelected ? '1px solid #C0272D' : '1px solid #2A364E',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isSelected ? '0 4px 12px rgba(192, 39, 45, 0.3)' : 'none',
                    }}
                  >
                    <span>🏏 {label}</span>
                    <span style={{ opacity: 0.8, fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      ({inn.battingTeam?.shortName || 'BAT'} {inn.runs}/{inn.wickets})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RENDER SELECTED INNINGS OVER-BY-OVER LOG */}
          {renderInningsDeliveryLog(
            (match.innings || []).find((i: any) => i.inningsNumber === (activeInningsTabNumber || match.currentInnings)) || currentInnings
          )}

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

      {/* STATE 4: COMPLETED MATCH DASHBOARD */}
      {match.status === 'COMPLETED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* FINAL RESULT CARD */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(18, 22, 32, 0.95) 100%)',
              border: '1.5px solid #10B981',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏆</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34D399', margin: '0 0 8px', textTransform: 'uppercase' }}>
              {match.resultNote || 'Match Completed'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: '0 0 16px' }}>
              Match has finished and official statistics have been recorded.
            </p>

            {/* Innings Summary Pill Strip */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
              {(match.innings || []).map((inn: any) => {
                const isSuperOver = inn.inningsNumber >= 3;
                const label = inn.inningsNumber === 1 ? '1st Innings' : inn.inningsNumber === 2 ? '2nd Innings' : inn.inningsNumber === 3 ? '⚡ Super Over 1' : `⚡ Super Over ${inn.inningsNumber - 2}`;
                return (
                  <div
                    key={inn.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: isSuperOver ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span style={{ color: isSuperOver ? '#FBBF24' : '#94A3B8', fontWeight: 700 }}>{label}: </span>
                    <strong style={{ color: '#FFF' }}>{inn.battingTeam?.shortName || 'BAT'} {inn.runs}/{inn.wickets}</strong>
                    <span style={{ color: '#94A3B8', fontSize: '0.75rem', marginLeft: '4px' }}>({inn.overs}.{inn.balls} ov)</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {(!match.winnerTeamId && (match.resultNote?.toLowerCase().includes('tie') || match.resultNote?.toLowerCase().includes('tied'))) && (
                <button
                  type="button"
                  onClick={() => setShowSuperOverModal(true)}
                  disabled={isPending}
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    color: '#000',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  ⚡ Start Official Super Over (Tie-Breaker) →
                </button>
              )}

              <a
                href={`/scorecard?matchId=${match.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#1E2638',
                  color: '#FFF',
                  border: '1px solid #2A364E',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📊 Open Public Match Scorecard ↗
              </a>
            </div>
          </div>

          {/* COMPLETED MATCH INNINGS TABS & SCORECARD + DELIVERY LOG */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📋 Match Innings Breakdown & Delivery Editor:
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {(match.innings || []).map((inn: any) => {
                const isSelected = (activeInningsTabNumber || 1) === inn.inningsNumber;
                const label = inn.inningsNumber === 1 ? '1st Innings' : inn.inningsNumber === 2 ? '2nd Innings' : inn.inningsNumber === 3 ? 'Super Over 1' : `Super Over ${inn.inningsNumber - 2}`;
                return (
                  <button
                    key={inn.id}
                    type="button"
                    onClick={() => setActiveInningsTabNumber(inn.inningsNumber)}
                    style={{
                      flex: '0 0 auto',
                      background: isSelected ? '#C0272D' : '#141A26',
                      color: isSelected ? '#FFF' : 'rgba(255, 255, 255, 0.7)',
                      border: isSelected ? '1px solid #C0272D' : '1px solid #2A364E',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: isSelected ? '0 4px 12px rgba(192, 39, 45, 0.3)' : 'none',
                    }}
                  >
                    <span>🏏 {label}</span>
                    <span style={{ opacity: 0.8, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      ({inn.battingTeam?.shortName || 'BAT'} {inn.runs}/{inn.wickets} in {inn.overs}.{inn.balls} ov)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RENDER ACTIVE TAB INNINGS SCORECARD & OVER-BY-OVER LOG */}
          {(() => {
            const selectedInn = (match.innings || []).find((i: any) => i.inningsNumber === (activeInningsTabNumber || 1)) || match.innings?.[0];
            if (!selectedInn) return null;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#10141E', border: '1px solid #1E2638', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ color: '#FBBF24', fontSize: '1.05rem' }}>
                      Innings {selectedInn.inningsNumber}: {selectedInn.battingTeam?.name} ({selectedInn.runs}/{selectedInn.wickets} in {selectedInn.overs}.{selectedInn.balls} ov)
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                      {(selectedInn.ballEvents || []).length} balls bowled
                    </span>
                  </div>

                  {/* Batters summary table */}
                  <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ color: '#94A3B8', borderBottom: '1px solid #1E2638', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Batter</th>
                          <th style={{ padding: '6px 8px' }}>R</th>
                          <th style={{ padding: '6px 8px' }}>B</th>
                          <th style={{ padding: '6px 8px' }}>4s</th>
                          <th style={{ padding: '6px 8px' }}>6s</th>
                          <th style={{ padding: '6px 8px' }}>SR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedInn.battingScores || []).map((bs: any) => (
                          <tr key={bs.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#FFF' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 700 }}>
                              {bs.player?.name || 'Player'} {bs.isOut ? <span style={{ color: '#EF4444', fontSize: '0.72rem' }}>({bs.dismissal || 'out'})</span> : <span style={{ color: '#10B981', fontSize: '0.72rem' }}>*</span>}
                            </td>
                            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#FBBF24' }}>{bs.runs}</td>
                            <td style={{ padding: '6px 8px', color: '#94A3B8' }}>{bs.balls}</td>
                            <td style={{ padding: '6px 8px' }}>{bs.fours}</td>
                            <td style={{ padding: '6px 8px' }}>{bs.sixes}</td>
                            <td style={{ padding: '6px 8px', color: '#94A3B8' }}>{bs.balls ? ((bs.runs / bs.balls) * 100).toFixed(1) : '0.0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bowlers summary table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ color: '#94A3B8', borderBottom: '1px solid #1E2638', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Bowler</th>
                          <th style={{ padding: '6px 8px' }}>O</th>
                          <th style={{ padding: '6px 8px' }}>M</th>
                          <th style={{ padding: '6px 8px' }}>R</th>
                          <th style={{ padding: '6px 8px' }}>W</th>
                          <th style={{ padding: '6px 8px' }}>ECON</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedInn.bowlingScores || []).map((bw: any) => {
                          const totalLegalOvers = (bw.overs || 0) + (bw.balls || 0) / (match.ballsPerOver || 6);
                          const econ = totalLegalOvers > 0 ? (bw.runsConceded / totalLegalOvers).toFixed(1) : '0.0';
                          return (
                            <tr key={bw.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#FFF' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 700 }}>{bw.player?.name || 'Bowler'}</td>
                              <td style={{ padding: '6px 8px', color: '#94A3B8' }}>{bw.overs}.{bw.balls}</td>
                              <td style={{ padding: '6px 8px', color: '#94A3B8' }}>{bw.maidens || 0}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 800, color: '#FBBF24' }}>{bw.runsConceded}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 800, color: '#EF4444' }}>{bw.wickets}</td>
<td style={{ padding: '6px 8px', color: '#94A3B8' }}>{econ}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* UTILITY CONTROLS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px', opacity: isPending ? 0.65 : 1, pointerEvents: isPending ? 'none' : 'auto' }}>
                    {/* Quick Player & Lineup Correction Bar */}
                    <div style={{ background: '#10141E', border: '1px solid #1E2638', borderRadius: '10px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                        🛠️ Quick Lineup & Player Corrections (Admin Controls)
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetRole('striker');
                            setSelectedBatterId(selectedInn.currentStrikerId || '');
                            setShowBatterModal(true);
                          }}
                          style={{
                            background: '#141A26',
                            border: '1px solid #2A364E',
                            color: '#FBBF24',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          🏏 Change Striker ({activeStriker?.name || 'Unset'})
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTargetRole('nonStriker');
                            setSelectedBatterId(selectedInn.currentNonStrikerId || '');
                            setShowBatterModal(true);
                          }}
                          style={{
                            background: '#141A26',
                            border: '1px solid #2A364E',
                            color: '#CBD5E1',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          🏏 Change Non-Striker ({activeNonStriker?.name || 'Unset'})
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBowlerId(selectedInn.currentBowlerId || '');
                            setShowBowlerModal(true);
                          }}
                          style={{
                            background: '#141A26',
                            border: '1px solid #2A364E',
                            color: '#A855F7',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          🎯 Change Bowler ({activeBowler?.name || 'Unset'})
                        </button>

                        <button
                          type="button"
                          onClick={handleSwapStrike}
                          disabled={isPending}
                          style={{
                            background: '#141A26',
                            border: '1px solid #2A364E',
                            color: '#FFF',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: isPending ? 'not-allowed' : 'pointer',
                          }}
                        >
                          🔄 Swap Strike
                        </button>

                        <button
                          type="button"
                          onClick={handleUndo}
                          disabled={isPending}
                          style={{
                            background: '#141A26',
                            border: '1px solid #2A364E',
                            color: '#FFF',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: isPending ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ↩️ Undo Last Ball
                        </button>
                      </div>
                    </div>

                    {/* Innings & Match Actions */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                        🏁 End Innings {selectedInn.inningsNumber}
                      </button>

                      {selectedInn.inningsNumber <= 2 && (
                        <button
                          onClick={() => setShowSuperOverModal(true)}
                          disabled={isPending}
                          style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.25) 100%)',
                            border: '1.5px solid #F59E0B',
                            color: '#FBBF24',
                            padding: '12px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            cursor: isPending ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ⚡ Start Official Super Over
                        </button>
                      )}

                      <button
                        onClick={() => setShowCompleteModal(true)}
                        disabled={isPending}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          border: 'none',
                          color: '#FFF',
                          padding: '12px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        🏆 Complete Match
                      </button>
                    </div>
                  </div>
                </div>

                {/* Over-by-Over log for this selected innings */}
                {renderInningsDeliveryLog(selectedInn)}
              </div>
            );
          })()}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODALS SECTION                                                */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* WICKET RECORDING MODAL */}
      {showWicketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #EF4444', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#EF4444', margin: '0 0 16px' }}>
              🔴 Record Wicket Dismissal
            </h3>

            {wicketModalError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
                {wicketModalError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                  Dismissed Batter *
                </label>
                <select
                  value={dismissedId || currentInnings?.currentStrikerId || ''}
                  onChange={(e) => setDismissedId(e.target.value)}
                  style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                >
                  <option value={currentInnings?.currentStrikerId}>★ Striker: {activeStriker?.name || 'Striker'}</option>
                  <option value={currentInnings?.currentNonStrikerId}>🏃 Non-Striker: {activeNonStriker?.name || 'Non-Striker'}</option>
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

              {/* RUN OUT: Completed Runs Selector */}
              {wicketType === 'RUN_OUT' && (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#F59E0B', marginBottom: '8px' }}>
                    🏃 Runs Completed Before Run Out
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[0, 1, 2, 3].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setWicketRuns(r)}
                        style={{
                          background: wicketRuns === r ? '#F59E0B' : '#1E2638',
                          color: wicketRuns === r ? '#000' : '#FFF',
                          border: '1px solid #2A364E',
                          borderRadius: '6px',
                          padding: '7px',
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {r === 0 ? '0 (Direct)' : `+${r} Run${r > 1 ? 's' : ''}`}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '8px', lineHeight: 1.4 }}>
                    💡 <strong>{activeStriker?.name}</strong> gets +{wicketRuns} run{wicketRuns !== 1 ? 's' : ''} on their individual score. <strong>{(dismissedId === currentInnings?.currentNonStrikerId ? activeNonStriker?.name : activeStriker?.name)}</strong> is marked Run Out.
                  </div>
                </div>
              )}

              {availableBatters.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#94A3B8' }}>
                    Next Incoming Batter (Optional)
                  </label>
                  <select
                    value={newBatterId}
                    onChange={(e) => setNewBatterId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#141A26',
                      border: '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#FFF',
                    }}
                  >
                    <option value="">Select later when player walks in...</option>
                    {availableBatters.map((p: any) => {
                      const bScore = currentInnings?.battingScores?.find((b: any) => b.playerId === p.id);
                      const isRetHurt = bScore?.dismissal?.toLowerCase().includes('retired hurt');
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} {isRetHurt ? `[🏥 Resume Batting • ${bScore.runs}* off ${bScore.balls}b]` : ''}
                        </option>
                      );
                    })}
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
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', padding: '24px', maxWidth: '460px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FBBF24', margin: '0 0 4px' }}>
              🎯 Select / Change Active Bowler
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '0 0 16px' }}>
              Bowling Team: <strong style={{ color: '#FFF' }}>{currentInnings?.bowlingTeam?.name}</strong> (1 over max per bowler in standard format)
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#FBBF24' }}>
                Choose Bowler ({bowlingSquad.length} in squad)
              </label>
              <select
                value={selectedBowlerId}
                onChange={(e) => setSelectedBowlerId(e.target.value)}
                style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Bowler...</option>
                {bowlingSquad.map((p: any) => {
                  const bScore = currentInnings?.bowlingScores?.find((b: any) => b.playerId === p.id);
                  const isCurrent = p.id === currentInnings?.currentBowlerId;
                  const oversText = bScore ? `${bScore.overs}.${bScore.balls} ov (${bScore.wickets}w, ${bScore.runsConceded}r)` : 'Yet to bowl';
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} — {oversText} {isCurrent ? '★ (Current)' : ''}
                    </option>
                  );
                })}
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
                style={{ flex: 2, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', border: 'none', color: '#000', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: isPending || !selectedBowlerId ? 'not-allowed' : 'pointer' }}
              >
                Set Bowler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATTER SELECTOR MODAL */}
      {showBatterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', padding: '24px', maxWidth: '460px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FBBF24', margin: '0 0 4px' }}>
              🏏 Set / Change {targetRole === 'striker' ? 'Striker (On Strike)' : 'Non-Striker'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '0 0 16px' }}>
              Batting Team: <strong style={{ color: '#FFF' }}>{currentInnings?.battingTeam?.name}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                Select Batter ({battingSquad.length} in squad)
              </label>
              <select
                value={selectedBatterId}
                onChange={(e) => setSelectedBatterId(e.target.value)}
                style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
              >
                <option value="">Select Batter...</option>
                {battingSquad.map((p: any) => {
                  const bScore = currentInnings?.battingScores?.find((b: any) => b.playerId === p.id);
                  const isStriker = p.id === currentInnings?.currentStrikerId;
                  const isNonStriker = p.id === currentInnings?.currentNonStrikerId;
                  const isRetHurt = bScore?.dismissal?.toLowerCase().includes('retired hurt');
                  const isOut = bScore?.isOut && !isRetHurt;

                  let tag = 'Yet to bat';
                  if (isStriker) tag = 'Currently Striker';
                  else if (isNonStriker) tag = 'Currently Non-Striker';
                  else if (isRetHurt) tag = `🏥 Retired Hurt (${bScore.runs}* off ${bScore.balls}b) — Can Resume Batting`;
                  else if (isOut) tag = `Out (${bScore.runs} runs) — Override`;
                  else if (bScore && bScore.balls > 0) tag = `${bScore.runs}* (${bScore.balls}b)`;

                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} [{tag}]
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowBatterModal(false)}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchBatter}
                disabled={!selectedBatterId || isPending}
                style={{ flex: 2, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', border: 'none', color: '#000', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: (!selectedBatterId || isPending) ? 'not-allowed' : 'pointer' }}
              >
                Confirm Batter
              </button>
            </div>
          </div>
        </div>
      )}
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

      {/* EDIT BALL MODAL */}
      {editingBall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', padding: '24px', maxWidth: '460px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FBBF24', margin: 0 }}>
                  ✏️ Edit Delivery (Over {editingBall.overNumber + 1}, Ball {editingBall.ballNumber})
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
                  {editingBall.batsman?.name || 'Batter'} vs {editingBall.bowler?.name || 'Bowler'}
                </div>
              </div>
              <button
                onClick={() => setEditingBall(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                  Runs Off Bat
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                  {[0, 1, 2, 3, 4, 6].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRuns(r)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: editRuns === r ? '#F59E0B' : '#141A26',
                        color: editRuns === r ? '#000' : '#FFF',
                        border: '1px solid #2A364E',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                  Extra Type
                </label>
                <select
                  value={editExtraType}
                  onChange={(e) => {
                    setEditExtraType(e.target.value);
                    if (e.target.value === 'NONE') setEditExtras(0);
                    else if (editExtras === 0) setEditExtras(1);
                  }}
                  style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                >
                  <option value="NONE">None (Legal Delivery)</option>
                  <option value="WIDE">Wide (+1 extra)</option>
                  <option value="NO_BALL">No Ball (+1 extra)</option>
                  <option value="BYE">Bye</option>
                  <option value="LEG_BYE">Leg Bye</option>
                </select>
              </div>

              {editExtraType !== 'NONE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                    Extra Runs
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editExtras}
                    onChange={(e) => setEditExtras(Number(e.target.value))}
                    style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, color: '#EF4444' }}>
                  <input
                    type="checkbox"
                    checked={editIsWicket}
                    onChange={(e) => setEditIsWicket(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#EF4444' }}
                  />
                  Wicket on this ball
                </label>
              </div>

              {editIsWicket && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                    Dismissal Type
                  </label>
                  <select
                    value={editWicketType}
                    onChange={(e) => setEditWicketType(e.target.value)}
                    style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                  >
                    <option value="BOWLED">Bowled</option>
                    <option value="CAUGHT">Caught</option>
                    <option value="LBW">LBW</option>
                    <option value="RUN_OUT">Run Out</option>
                    <option value="STUMPED">Stumped</option>
                    <option value="HIT_WICKET">Hit Wicket</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDeleteBall}
                disabled={isEditingBallSaving}
                style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                🗑️ Delete Ball
              </button>
              <button
                type="button"
                onClick={handleSaveEditedBall}
                disabled={isEditingBallSaving}
                style={{ flex: 2, background: '#F59E0B', border: 'none', color: '#000', padding: '10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
              >
                {isEditingBallSaving ? 'Saving...' : '💾 Save Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPER OVER SETUP MODAL */}
      {showSuperOverModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', padding: '24px', maxWidth: '460px', width: '100%', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FBBF24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡ Launch Super Over Tie-Breaker</span>
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
                  1 Over per team • 2 Wickets maximum per innings
                </div>
              </div>
              <button
                onClick={() => setShowSuperOverModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', color: '#CBD5E1' }}>
                Which team will bat first in the Super Over?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: (superOverBattingTeamId === match.teamBId || (!superOverBattingTeamId)) ? 'rgba(245, 158, 11, 0.15)' : '#141A26',
                    border: (superOverBattingTeamId === match.teamBId || (!superOverBattingTeamId)) ? '1.5px solid #F59E0B' : '1px solid #2A364E',
                    cursor: 'pointer',
                    color: '#FFF',
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="radio"
                    name="superOverBatting"
                    checked={superOverBattingTeamId === match.teamBId || (!superOverBattingTeamId)}
                    onChange={() => setSuperOverBattingTeamId(match.teamBId)}
                    style={{ accentColor: '#F59E0B' }}
                  />
                  <div>
                    <div>{match.teamB.name} (Batted 2nd in Match)</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Standard tournament rule: Team batting 2nd bats 1st in Super Over</div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: superOverBattingTeamId === match.teamAId ? 'rgba(245, 158, 11, 0.15)' : '#141A26',
                    border: superOverBattingTeamId === match.teamAId ? '1.5px solid #F59E0B' : '1px solid #2A364E',
                    cursor: 'pointer',
                    color: '#FFF',
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="radio"
                    name="superOverBatting"
                    checked={superOverBattingTeamId === match.teamAId}
                    onChange={() => setSuperOverBattingTeamId(match.teamAId)}
                    style={{ accentColor: '#F59E0B' }}
                  />
                  <div>
                    <div>{match.teamA.name} (Batted 1st in Match)</div>
                  </div>
                </label>
              </div>
            </div>

            {/* BALLS PER OVER SELECTION */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1' }}>
                  Balls Per Over for Super Over
                </label>
                <span style={{ fontSize: '0.78rem', color: '#F59E0B', fontFamily: 'monospace', fontWeight: 700 }}>
                  Selected: {superOverBallsPerOver || match.ballsPerOver || 6} Balls
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[4, 6, 8, 10].map((bCount) => {
                  const isCurrent = (superOverBallsPerOver || match.ballsPerOver || 6) === bCount;
                  return (
                    <button
                      key={bCount}
                      type="button"
                      onClick={() => setSuperOverBallsPerOver(bCount)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '8px',
                        background: isCurrent ? '#F59E0B' : '#141A26',
                        color: isCurrent ? '#000' : '#FFF',
                        border: isCurrent ? '1.5px solid #F59E0B' : '1px solid #2A364E',
                        fontWeight: 900,
                        fontSize: '0.88rem',
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {bCount} Balls
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowSuperOverModal(false)}
                disabled={isEditingBallSaving}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartSuperOver}
                disabled={isEditingBallSaving}
                style={{ flex: 2, background: '#F59E0B', border: 'none', color: '#000', padding: '12px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}
              >
                {isEditingBallSaving ? 'Starting...' : '⚡ Begin Super Over →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
