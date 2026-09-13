'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
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
  undoSuperOverAction,
  renamePlayerAction,
} from '@/lib/scoring/scoring-actions';
import {
  calculateDeliveryRuns,
  validateDismissalLegality,
  isBowlerCreditedDismissal,
  getInningsWicketLimit,
} from '@/lib/scoring/scoring-rules';
import { useOfflineScorer } from '@/lib/offline/useOfflineScorer';
import { getPersistentClientId } from '@/lib/offline/offline-db';
import LiveEquationTicker, { HeadToHeadBoundaryCounter } from '@/components/analytics/LiveEquationTicker';

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

  const currentInnings = match.innings?.find((i: any) => i.inningsNumber === (match.currentInnings || 1)) || match.innings?.[0];

  const {
    syncStatus,
    projectedMatch,
    clientId,
    recordOfflineOperation,
    syncNow,
    retryFailed,
    updateAuthoritativeSnapshot,
    isOffline,
  } = useOfflineScorer(match.id, currentInnings?.id, initialMatch);

  // Sync projected match from offline engine whenever updated
  useEffect(() => {
    if (projectedMatch && projectedMatch.id === match.id) {
      setMatch((prev: any) => {
        // Guard: Never downgrade a LIVE match to UPCOMING based on stale offline snapshot
        if (prev?.status === 'LIVE' && projectedMatch.status === 'UPCOMING') {
          return prev;
        }
        // Guard: Never strip existing innings
        if (prev?.innings && prev.innings.length > 0 && (!projectedMatch.innings || projectedMatch.innings.length === 0)) {
          return prev;
        }

        return {
          ...projectedMatch,
          teamA: {
            ...projectedMatch.teamA,
            teamPlayers: projectedMatch.teamA?.teamPlayers || prev?.teamA?.teamPlayers || initialMatch?.teamA?.teamPlayers,
            tournamentSquads: projectedMatch.teamA?.tournamentSquads || prev?.teamA?.tournamentSquads || initialMatch?.teamA?.tournamentSquads,
            players: projectedMatch.teamA?.players || prev?.teamA?.players || initialMatch?.teamA?.players,
          },
          teamB: {
            ...projectedMatch.teamB,
            teamPlayers: projectedMatch.teamB?.teamPlayers || prev?.teamB?.teamPlayers || initialMatch?.teamB?.teamPlayers,
            tournamentSquads: projectedMatch.teamB?.tournamentSquads || prev?.teamB?.tournamentSquads || initialMatch?.teamB?.tournamentSquads,
            players: projectedMatch.teamB?.players || prev?.teamB?.players || initialMatch?.teamB?.players,
          },
        };
      });
    }
  }, [projectedMatch, match.id, initialMatch]);

  const prevCurrentInningsRef = useRef<number>(initialMatch?.currentInnings || 1);

  // Sync active innings tab only when authoritative currentInnings transitions to a NEW innings (e.g. 1 -> 2)
  useEffect(() => {
    if (match.currentInnings && match.currentInnings !== prevCurrentInningsRef.current) {
      prevCurrentInningsRef.current = match.currentInnings;
      setActiveInningsTabNumber(match.currentInnings);
    }
  }, [match.currentInnings]);

  // Super Over State
  const [showSuperOverModal, setShowSuperOverModal] = useState(false);
  const [superOverBattingTeamId, setSuperOverBattingTeamId] = useState<string>('');
  const [superOverBallsPerOver, setSuperOverBallsPerOver] = useState<number>(initialMatch?.ballsPerOver || 6);

  // Ball Editing Modal State
  const [editingBall, setEditingBall] = useState<any | null>(null);
  const [editRuns, setEditRuns] = useState<number>(0);
  const [editExtraType, setEditExtraType] = useState<string>('NONE');
  const [editExtras, setEditExtras] = useState<number>(0);
  const [editByeRuns, setEditByeRuns] = useState<number>(0);
  const [editLegByeRuns, setEditLegByeRuns] = useState<number>(0);
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
      if (res && res.success && res.updatedMatch) {
        setMatch(res.updatedMatch);
        if (res.updatedMatch.currentInnings) {
          setActiveInningsTabNumber(res.updatedMatch.currentInnings);
        }
        await updateAuthoritativeSnapshot(res.updatedMatch);
        setLineupStrikerId('');
        setLineupNonStrikerId('');
        setLineupBowlerId('');
        setShowSuperOverModal(false);
      } else {
        alert(`Failed to start Super Over: ${res?.error || 'Server rejected request'}`);
      }
    } catch (err: any) {
      alert(`Failed to start Super Over: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsEditingBallSaving(false);
    }
  }

  // Match Rules (Overs & Balls Per Over) Modal State
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesOvers, setRulesOvers] = useState<number>(initialMatch?.oversPerInnings || 20);
  const [rulesBallsPerOver, setRulesBallsPerOver] = useState<number>(initialMatch?.ballsPerOver || 6);
  const [isRulesSaving, setIsRulesSaving] = useState(false);
  const [isUndoSuperOverSaving, setIsUndoSuperOverSaving] = useState(false);

  // Keep modal inputs in sync when match changes
  useEffect(() => {
    if (match?.oversPerInnings) setRulesOvers(match.oversPerInnings);
    if (match?.ballsPerOver) setRulesBallsPerOver(match.ballsPerOver);
  }, [match?.oversPerInnings, match?.ballsPerOver]);

  async function handleSaveMatchRules(newOvers: number, newBallsPerOver: number) {
    if (!newOvers || newOvers < 1 || newOvers > 100) {
      alert('Total overs per innings must be between 1 and 100.');
      return;
    }
    if (!newBallsPerOver || newBallsPerOver < 1 || newBallsPerOver > 20) {
      alert('Balls per over must be between 1 and 20.');
      return;
    }

    setIsRulesSaving(true);
    try {
      const res = await updateMatchRulesAction(match.id, {
        oversPerInnings: Number(newOvers),
        ballsPerOver: Number(newBallsPerOver),
      });
      if (res && res.success && res.updatedMatch) {
        setMatch(res.updatedMatch);
        await updateAuthoritativeSnapshot(res.updatedMatch);
        setShowRulesModal(false);
      } else {
        alert('Failed to update match rules.');
      }
    } catch (err: any) {
      alert(`Failed to update match rules: ${err?.message || 'Server error'}`);
    } finally {
      setIsRulesSaving(false);
    }
  }

  async function handleUndoSuperOver() {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to undo and cancel the Super Over?\n\n' +
      '• This will cancel and delete all Super Over innings (Innings 3 & 4).\n' +
      '• Any deliveries scored in the Super Over will be deleted.\n' +
      '• The match will be restored back to Innings 2.'
    );
    if (!confirmed) return;

    setIsUndoSuperOverSaving(true);
    try {
      const res = await undoSuperOverAction(match.id);
      if (res && res.success && res.updatedMatch) {
        setMatch(res.updatedMatch);
        setActiveInningsTabNumber(res.updatedMatch.currentInnings || 2);
        await updateAuthoritativeSnapshot(res.updatedMatch);
        setShowSuperOverModal(false);
      } else {
        alert(`Failed to undo Super Over: ${res?.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Error undoing Super Over: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsUndoSuperOverSaving(false);
    }
  }

  // Rename Player (Score-Safe) Modal State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamePlayerId, setRenamePlayerId] = useState<string>('');
  const [renamePlayerName, setRenamePlayerName] = useState<string>('');
  const [renamePlayerJersey, setRenamePlayerJersey] = useState<number | string>('');
  const [isRenamingSaving, setIsRenamingSaving] = useState(false);

  function openRenameModal(playerId?: string, currentName?: string, jersey?: number | null) {
    if (playerId) {
      setRenamePlayerId(playerId);
      setRenamePlayerName(currentName || '');
      setRenamePlayerJersey(jersey ?? '');
    } else {
      // Default to first player if none specified
      const firstP = allKnownPlayers[0];
      setRenamePlayerId(firstP?.id || '');
      setRenamePlayerName(firstP?.name || '');
      setRenamePlayerJersey(firstP?.jerseyNumber ?? '');
    }
    setShowRenameModal(true);
  }

  async function handleSaveRenamePlayer() {
    if (!renamePlayerId) {
      alert('Please select a player to rename.');
      return;
    }
    const cleanName = renamePlayerName.trim();
    if (!cleanName) {
      alert('Player name cannot be empty.');
      return;
    }

    setIsRenamingSaving(true);
    try {
      const res = await renamePlayerAction({
        playerId: renamePlayerId,
        newName: cleanName,
        jerseyNumber: renamePlayerJersey !== '' ? Number(renamePlayerJersey) : null,
        matchId: match.id,
      });

      if (res && res.success) {
        if (res.updatedMatch) {
          setMatch(res.updatedMatch);
          await updateAuthoritativeSnapshot(res.updatedMatch);
        } else {
          // Optimistically update in-memory
          setMatch((prev: any) => {
            if (!prev) return prev;
            const updated = JSON.parse(JSON.stringify(prev));
            (updated.innings || []).forEach((inn: any) => {
              if (inn.currentStriker?.id === renamePlayerId) inn.currentStriker.name = cleanName;
              if (inn.currentNonStriker?.id === renamePlayerId) inn.currentNonStriker.name = cleanName;
              if (inn.currentBowler?.id === renamePlayerId) inn.currentBowler.name = cleanName;
              (inn.battingScores || []).forEach((bs: any) => {
                if (bs.player?.id === renamePlayerId) bs.player.name = cleanName;
              });
              (inn.bowlingScores || []).forEach((bw: any) => {
                if (bw.player?.id === renamePlayerId) bw.player.name = cleanName;
              });
            });
            return updated;
          });
        }
        setShowRenameModal(false);
      } else {
        alert(`Failed to rename player: ${res?.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Error renaming player: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsRenamingSaving(false);
    }
  }

  function openEditBallModal(b: any) {
    setEditingBall(b);
    setEditRuns(b.runs || 0);
    setEditExtraType(b.extraType || 'NONE');
    setEditExtras(b.extras || 0);
    setEditByeRuns(b.byeRuns || 0);
    setEditLegByeRuns(b.legByeRuns || 0);
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
        byeRuns: editByeRuns,
        legByeRuns: editLegByeRuns,
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
      setMatch((prev: any) => {
        if (prev?.status === 'LIVE' && initialMatch?.status === 'UPCOMING') {
          return prev;
        }
        return initialMatch;
      });
    }
  }, [initialMatch]);

  // Extract all registered squad players for Team A and Team B
  const getRawTeamPlayers = (teamId: string) => {
    const team = teamId === match?.teamAId ? match?.teamA : match?.teamB;
    const initialTeam = teamId === initialMatch?.teamAId ? initialMatch?.teamA : initialMatch?.teamB;
    const targetTeam = team || initialTeam;
    if (!targetTeam) return [];

    const squads = targetTeam.tournamentSquads || initialTeam?.tournamentSquads;
    if (Array.isArray(squads) && squads.length > 0) {
      const list = squads.map((ts: any) => ts.player || ts).filter((p: any) => p && p.id && p.name);
      if (list.length > 0) return list;
    }

    const teamPlayers = targetTeam.teamPlayers || initialTeam?.teamPlayers;
    if (Array.isArray(teamPlayers) && teamPlayers.length > 0) {
      const list = teamPlayers.map((tp: any) => tp.player || tp).filter((p: any) => p && p.id && p.name);
      if (list.length > 0) return list;
    }

    const players = targetTeam.players || initialTeam?.players;
    if (Array.isArray(players) && players.length > 0) {
      const list = players.filter((p: any) => p && p.id && p.name);
      if (list.length > 0) return list;
    }

    return [];
  };

  const rawTeamAPlayers = getRawTeamPlayers(match.teamAId);
  const rawTeamBPlayers = getRawTeamPlayers(match.teamBId);

  // Match Playing Squad Selection (By default, ALL registered players play)
  const [selectedTeamAPlayerIds, setSelectedTeamAPlayerIds] = useState<string[]>(() =>
    rawTeamAPlayers.map((p: any) => p.id)
  );

  const [selectedTeamBPlayerIds, setSelectedTeamBPlayerIds] = useState<string[]>(() =>
    rawTeamBPlayers.map((p: any) => p.id)
  );

  // Restore saved squad selections from localStorage on client mount (avoids SSR hydration mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined' && initialMatch?.id) {
      try {
        const savedA = localStorage.getItem(`cpl_squad_${initialMatch.id}_a`);
        if (savedA) {
          const parsedA = JSON.parse(savedA);
          if (Array.isArray(parsedA) && parsedA.length > 0) {
            setSelectedTeamAPlayerIds(parsedA);
          }
        }
        const savedB = localStorage.getItem(`cpl_squad_${initialMatch.id}_b`);
        if (savedB) {
          const parsedB = JSON.parse(savedB);
          if (Array.isArray(parsedB) && parsedB.length > 0) {
            setSelectedTeamBPlayerIds(parsedB);
          }
        }
      } catch (e) {}
    }
  }, [initialMatch?.id]);

  // Re-sync squad IDs if initially empty or if raw players load
  useEffect(() => {
    if (rawTeamAPlayers.length > 0 && selectedTeamAPlayerIds.length === 0) {
      setSelectedTeamAPlayerIds(rawTeamAPlayers.map((p: any) => p.id));
    }
  }, [rawTeamAPlayers, selectedTeamAPlayerIds.length]);

  useEffect(() => {
    if (rawTeamBPlayers.length > 0 && selectedTeamBPlayerIds.length === 0) {
      setSelectedTeamBPlayerIds(rawTeamBPlayers.map((p: any) => p.id));
    }
  }, [rawTeamBPlayers, selectedTeamBPlayerIds.length]);

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
  const [showNoBallModal, setShowNoBallModal] = useState(false);
  const [nbReason, setNbReason] = useState<'CHEST_HEIGHT' | 'CHUCKING' | 'OVERSTEP' | 'FULL_TOSS' | 'HEIGHT'>('CHEST_HEIGHT');
  const [nbType, setNbType] = useState<'BAT' | 'BYE' | 'LEG_BYE'>('BAT');
  const [nbRuns, setNbRuns] = useState<number>(0);

  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<string>('CAUGHT');
  const [dismissedId, setDismissedId] = useState<string>('');
  const [newBatterId, setNewBatterId] = useState<string>('');
  const [wicketRuns, setWicketRuns] = useState<number>(0);
  const [isWicketOnNoBall, setIsWicketOnNoBall] = useState<boolean>(false);
  const [retHurtWithoutFacingBall, setRetHurtWithoutFacingBall] = useState<boolean>(true);
  const [wicketModalError, setWicketModalError] = useState<string | null>(null);

  // Wide delivery state
  const [showWideModal, setShowWideModal] = useState<boolean>(false);
  const [wideRuns, setWideRuns] = useState<number>(0); // 0 additional = 1 wide; 4 additional = 5 wides (boundary)
  const [wideIsBoundary, setWideIsBoundary] = useState<boolean>(false);

  // Bye / Leg Bye delivery state
  const [showByeModal, setShowByeModal] = useState<boolean>(false);
  const [byeRunsCount, setByeRunsCount] = useState<number>(1);
  const [byeType, setByeType] = useState<'BYE' | 'LEG_BYE'>('BYE');

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
  const lastLocalActionRef = useRef<number>(0);

  // Supabase Realtime Subscription (Syncs entire match state on live score events)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`match:${match.id}`);

    channel
      .on('broadcast', { event: 'score_update' }, async () => {
        // Skip redundant refetch if the current operator executed an action locally in the last 3.5s
        if (Date.now() - lastLocalActionRef.current < 3500) {
          return;
        }
        try {
          const res = await fetch(`/api/matches/${match.id}/scorecard`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          });
          const data = await res.json();
          if (data && data.success && data.match) {
            setMatch((prev: any) => {
              if (prev?.status === 'LIVE' && data.match.status === 'UPCOMING') {
                return prev;
              }
              return {
                ...data.match,
                teamA: {
                  ...data.match.teamA,
                  teamPlayers: data.match.teamA?.teamPlayers || prev?.teamA?.teamPlayers || initialMatch?.teamA?.teamPlayers,
                  tournamentSquads: data.match.teamA?.tournamentSquads || prev?.teamA?.tournamentSquads || initialMatch?.teamA?.tournamentSquads,
                  players: data.match.teamA?.players || prev?.teamA?.players || initialMatch?.teamA?.players,
                },
                teamB: {
                  ...data.match.teamB,
                  teamPlayers: data.match.teamB?.teamPlayers || prev?.teamB?.teamPlayers || initialMatch?.teamB?.teamPlayers,
                  tournamentSquads: data.match.teamB?.tournamentSquads || prev?.teamB?.tournamentSquads || initialMatch?.teamB?.tournamentSquads,
                  players: data.match.teamB?.players || prev?.teamB?.players || initialMatch?.teamB?.players,
                },
              };
            });
          }
        } catch (e) {}
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id]);

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

  // Helper to determine if a batter has already been dismissed in this innings (MCC Law 25: an out player cannot bat again)
  const isPlayerDismissedInInnings = (playerId: string) => {
    if (!currentInnings || !playerId) return false;
    const score = currentInnings.battingScores?.find((b: any) => b.playerId === playerId);
    const isRetiredHurt = score?.dismissal?.toLowerCase().includes('retired hurt');
    if (score && (score.isOut || (score.dismissal && !isRetiredHurt))) {
      return true;
    }
    const hasOutBall = currentInnings.ballEvents?.some(
      (be: any) => be.isWicket && be.dismissedPlayerId === playerId && be.wicketType !== 'RETIRED_HURT'
    );
    return Boolean(hasOutBall);
  };

  // Available new batters (not out OR retired hurt wishing to resume, and not currently batting)
  const availableBatters = battingSquad.filter((p: any) => {
    const isCurrentlyBatting = p.id === currentInnings?.currentStrikerId || p.id === currentInnings?.currentNonStrikerId;
    const isOut = isPlayerDismissedInInnings(p.id);
    return !isCurrentlyBatting && !isOut;
  });

  // Dynamic over calculations
  const isSuperOver = currentInnings?.inningsNumber >= 3;
  const maxOvers = isSuperOver ? 1 : (match.oversPerInnings || 20);
  const matchBallsPerOver = match.ballsPerOver || 6;
  const maxOversPerBowler = 1;

  // Bowler who bowled in the immediately preceding over (cannot bowl consecutive overs - MCC Law 17.8)
  const prevOverNum = (currentInnings?.balls === 0 && (currentInnings?.overs || 0) > 0) ? (currentInnings?.overs || 0) - 1 : null;
  const previousOverBowlerIds = prevOverNum !== null
    ? new Set((currentInnings?.ballEvents || []).filter((b: any) => b.overNumber === prevOverNum).map((b: any) => b.bowlerId))
    : new Set<string>();

  // Available bowlers (players who have not exceeded the max balls/overs quota and didn't bowl the immediately preceding over)
  const availableBowlers = bowlingSquad.filter((p: any) => {
    if (previousOverBowlerIds.has(p.id)) {
      return false;
    }
    const score = currentInnings?.bowlingScores?.find((b: any) => b.playerId === p.id);
    const totalBallsBowled = (score?.overs || 0) * matchBallsPerOver + (score?.balls || 0);
    return totalBallsBowled < maxOversPerBowler * matchBallsPerOver;
  });

  // Free Hit evaluation: Under tournament rules, there is NO Free Hit after a No-Ball
  const isFreeHitActive = false;
  // Check whether the immediately preceding delivery in play was a No-Ball (re-bowled ball)
  const lastDeliveryBall = currentInnings?.ballEvents?.[0];
  const isPreviousDeliveryNoBall = Boolean(lastDeliveryBall && lastDeliveryBall.extraType === 'NO_BALL');

  // Action handlers with INSTANT OPTIMISTIC FEEDBACK
  const handleStartMatch = () => {
    if (!tossWinnerId || !tossDecision) {
      setError('Please select both the toss winner and their decision.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await startMatchAction(match.id, { tossWinnerId, tossDecision });
        if (!res.success) {
          setError(res.error || 'Failed to start match.');
        } else {
          if ((res as any).updatedMatch) {
            const updated = (res as any).updatedMatch;
            const fullUpdated = {
              ...updated,
              teamA: {
                ...updated.teamA,
                teamPlayers: updated.teamA?.teamPlayers || match?.teamA?.teamPlayers || initialMatch?.teamA?.teamPlayers,
                tournamentSquads: updated.teamA?.tournamentSquads || match?.teamA?.tournamentSquads || initialMatch?.teamA?.tournamentSquads,
                players: updated.teamA?.players || match?.teamA?.players || initialMatch?.teamA?.players,
              },
              teamB: {
                ...updated.teamB,
                teamPlayers: updated.teamB?.teamPlayers || match?.teamB?.teamPlayers || initialMatch?.teamB?.teamPlayers,
                tournamentSquads: updated.teamB?.tournamentSquads || match?.teamB?.tournamentSquads || initialMatch?.teamB?.tournamentSquads,
                players: updated.teamB?.players || match?.teamB?.players || initialMatch?.teamB?.players,
              },
            };
            setMatch(fullUpdated);
            await updateAuthoritativeSnapshot(fullUpdated);
            router.refresh();
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
          const updated = (res as any).updatedMatch;
          const fullUpdated = {
            ...updated,
            teamA: {
              ...updated.teamA,
              teamPlayers: updated.teamA?.teamPlayers || match?.teamA?.teamPlayers || initialMatch?.teamA?.teamPlayers,
              tournamentSquads: updated.teamA?.tournamentSquads || match?.teamA?.tournamentSquads || initialMatch?.teamA?.tournamentSquads,
              players: updated.teamA?.players || match?.teamA?.players || initialMatch?.teamA?.players,
            },
            teamB: {
              ...updated.teamB,
              teamPlayers: updated.teamB?.teamPlayers || match?.teamB?.teamPlayers || initialMatch?.teamB?.teamPlayers,
              tournamentSquads: updated.teamB?.tournamentSquads || match?.teamB?.tournamentSquads || initialMatch?.teamB?.tournamentSquads,
              players: updated.teamB?.players || match?.teamB?.players || initialMatch?.teamB?.players,
            },
          };
          setMatch(fullUpdated);
          await updateAuthoritativeSnapshot(fullUpdated);
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      }
    });
  };

  const handleRecordBall = (runs: number, extraType: any = 'NONE', extraRuns: number = 0, byeRuns: number = 0, legByeRuns: number = 0, commentary?: string) => {
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

    // Check if the previous over finished and a new bowler needs to be chosen for the new over (cannot bowl consecutive overs - MCC Law 17.8)
    const prevOverDeliveries = (currentInnings?.ballEvents || []).filter((b: any) => b.overNumber === currentInnings.overs - 1);
    const isConsecutiveOverForSameBowler = prevOverDeliveries.some((b: any) => b.bowlerId === currentInnings.currentBowlerId);
    if (!isSuperOver && currentInnings.balls === 0 && currentInnings.overs > 0 && currentInnings.overs < maxOvers && isConsecutiveOverForSameBowler) {
      setShowBowlerModal(true);
      setError(`⚠️ Over ${currentInnings.overs + 1} is starting. A bowler who bowled in the previous over cannot bowl consecutive overs. Please select the next bowler.`);
      return;
    }

    setError(null);

    // ⚡ Authoritative pure calculation for delivery scoring
    const deliveryCalc = calculateDeliveryRuns({
      runs,
      extraType,
      extras: extraRuns,
      byeRuns,
      legByeRuns,
    });

    const isLegal = deliveryCalc.isLegal;
    const totalBallRuns = deliveryCalc.totalRuns;
    const runsOffBat = deliveryCalc.batterRuns;
    const bowlerRunsCharged = deliveryCalc.bowlerRuns;

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

    const wideRanRuns = (extraType === 'WIDE') ? deliveryCalc.byeRuns : 0;
    const isWideBoundary = (extraType === 'WIDE') && (deliveryCalc.byeRuns === 4 || commentary?.toLowerCase().includes('boundary'));
    const shouldRotateWide = (extraType === 'WIDE') && !isWideBoundary && (wideRanRuns % 2 !== 0);
    const shouldRotateOther = isLegal && (runsOffBat % 2 === 1 || (extraType === 'BYE' && byeRuns % 2 === 1) || (extraType === 'LEG_BYE' && legByeRuns % 2 === 1));

    if (shouldRotateWide || shouldRotateOther) {
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
            fours: runsOffBat === 4 ? b.fours + 1 : b.fours,
            sixes: runsOffBat === 6 ? b.sixes + 1 : b.sixes,
          };
        }
        return b;
      });

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
        runs: runsOffBat,
        extras: deliveryCalc.wideRuns + deliveryCalc.noBallPenalty + deliveryCalc.byeRuns + deliveryCalc.legByeRuns,
        extraType,
        byeRuns: deliveryCalc.byeRuns,
        legByeRuns: deliveryCalc.legByeRuns,
        isLegal,
        isWicket: false,
        commentary: commentary || undefined,
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

    const operationId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveClientId = clientId || getPersistentClientId();

    const deliveryPayload: any = {
      runs: runsOffBat,
      extraType,
      extraRuns,
      byeRuns: deliveryCalc.byeRuns,
      legByeRuns: deliveryCalc.legByeRuns,
      expectedUpdatedAt: currentInnings.updatedAt,
      operationId,
      clientId: effectiveClientId,
      commentary: commentary || undefined,
    };

    // If offline or queue has pending operations, route through IndexedDB outbox
    if (isOffline || syncStatus.pendingCount > 0 || syncStatus.blockedCount > 0) {
      recordOfflineOperation('RECORD_DELIVERY', deliveryPayload).catch((err: any) => {
        setError(`⚠️ Local Save Failed: ${err?.message || 'Storage write rejected'}`);
        alert(`⚠️ Failed to save delivery locally: ${err?.message}`);
      });
      return;
    }

    // Direct Online Route with idempotent operationId
    lastLocalActionRef.current = Date.now();
    startTransition(async () => {
      try {
        const res = await recordDeliveryAction(currentInnings.id, deliveryPayload);
        if (res && res.success) {
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
        } else {
          setError((res as any)?.error || 'Failed to record delivery.');
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            recordOfflineOperation('RECORD_DELIVERY', deliveryPayload).catch(() => {});
          }
        }
      } catch (err: any) {
        // Fallback to IndexedDB outbox on network drop mid-flight with IDENTICAL operationId
        console.warn('[Online Route] Failed, falling back to IndexedDB outbox:', err);
        recordOfflineOperation('RECORD_DELIVERY', deliveryPayload).catch((storeErr: any) => {
          setError(`⚠️ Network failed and local backup failed: ${storeErr?.message}`);
        });
      }
    });
  };

  const handleConfirmNoBall = () => {
    let runsOffBat = 0;
    let byeRuns = 0;
    let legByeRuns = 0;

    if (nbType === 'BAT') {
      runsOffBat = nbRuns;
    } else if (nbType === 'BYE') {
      byeRuns = nbRuns;
    } else if (nbType === 'LEG_BYE') {
      legByeRuns = nbRuns;
    }

    const bowlerName = activeBowler?.name || 'Bowler';
    const strikerName = activeStriker?.name || 'Striker';
    let commentary = '';

    if (nbReason === 'CHEST_HEIGHT') {
      if (nbType === 'BAT' && runsOffBat === 6) {
        commentary = `NO BALL (Above Chest Height) & SIX! Delivery above chest height hammered into the stands by ${strikerName}! 7 runs added (+1 run & extra delivery).`;
      } else if (nbType === 'BAT' && runsOffBat === 4) {
        commentary = `NO BALL (Above Chest Height) & FOUR! High ball above chest level crunched away to the boundary by ${strikerName}! 5 runs added (+1 run & extra delivery).`;
      } else if (nbType === 'BAT' && runsOffBat > 0) {
        commentary = `NO BALL (Above Chest Height) + ${runsOffBat} RUNS! High delivery called above chest height against ${bowlerName}! Batters take ${runsOffBat} runs plus 1 penalty run (+ extra delivery).`;
      } else if (nbType === 'BYE' || nbType === 'LEG_BYE') {
        commentary = `NO BALL (Above Chest Height) + ${nbRuns} ${nbType === 'BYE' ? 'BYES' : 'LEG BYES'}! High delivery above chest height from ${bowlerName}, batters take ${nbRuns} runs plus 1 penalty run (+ extra delivery).`;
      } else {
        commentary = `NO BALL (Above Chest Height)! Any delivery above chest height is called a No Ball! 1 penalty run awarded against ${bowlerName} and an extra delivery.`;
      }
    } else if (nbReason === 'CHUCKING') {
      commentary = `NO BALL (Chucking)! Illegal bowling action called by the umpire against ${bowlerName}! 1 penalty run awarded and extra delivery.`;
    } else if (nbReason === 'FULL_TOSS') {
      if (nbType === 'BAT' && runsOffBat === 6) {
        commentary = `NO BALL (Full Toss) & SIX! Dangerous waist-high full toss punished with absolute disdain! ${strikerName} launches ${bowlerName}'s beamer deep into the stands! 7 runs added (+ extra delivery).`;
      } else if (nbType === 'BAT' && runsOffBat === 4) {
        commentary = `NO BALL (Full Toss) & FOUR! Smashed away to the boundary! High full toss from ${bowlerName} crunched away to the fence by ${strikerName}! 5 runs added (+ extra delivery).`;
      } else if (nbType === 'BAT' && runsOffBat > 0) {
        commentary = `NO BALL (Full Toss) + ${runsOffBat} RUNS! Above-waist full toss called on ${bowlerName}! ${strikerName} works it away for ${runsOffBat} runs, penalty run added (+ extra delivery).`;
      } else if (nbType === 'BYE' || nbType === 'LEG_BYE') {
        commentary = `NO BALL (Full Toss) + ${nbRuns} ${nbType === 'BYE' ? 'BYES' : 'LEG BYES'}! High beamer from ${bowlerName} evades everyone! Batters scamper for ${nbRuns} extra runs (+ extra delivery).`;
      } else {
        commentary = `NO BALL (Full Toss)! Dangerous delivery above waist height called on ${bowlerName}! Umpire signals no-ball, penalty run awarded and extra delivery.`;
      }
    } else if (nbReason === 'HEIGHT') {
      if (runsOffBat > 0) {
        commentary = `NO BALL (Height) + ${runsOffBat} RUNS! Sharp bouncer flying way over the head of ${strikerName}! Signaled no-ball for excessive height, ${runsOffBat} runs taken (+ extra delivery).`;
      } else {
        commentary = `NO BALL (Height)! Bouncer sails way over ${strikerName}'s head! Umpire signals no-ball for dangerous height from ${bowlerName}, penalty run awarded (+ extra delivery).`;
      }
    } else {
      // Default: OVERSTEP / Missing Crease Mark
      if (nbType === 'BAT' && runsOffBat === 6) {
        commentary = `NO BALL (Overstep) & SIX! ${bowlerName} misses the crease mark and oversteps! ${strikerName} launches it into the stands for a colossal maximum! 7 runs added (+ extra delivery).`;
      } else if (nbType === 'BAT' && runsOffBat === 4) {
        commentary = `NO BALL (Overstep) & FOUR! ${bowlerName} oversteps the bowling crease mark, and ${strikerName} crunches it through the covers for four! 5 runs total (+ extra delivery).`;
      } else if (nbType === 'BAT' && runsOffBat > 0) {
        commentary = `NO BALL (Overstep) + ${runsOffBat} RUNS! Front-foot no-ball called as ${bowlerName} misses the mark! ${strikerName} hustles for ${runsOffBat} runs, penalty added (+ extra delivery).`;
      } else if (nbType === 'BYE' || nbType === 'LEG_BYE') {
        commentary = `NO BALL (Overstep) + ${nbRuns} ${nbType === 'BYE' ? 'BYES' : 'LEG BYES'}! ${bowlerName} misses the crease line, batters take ${nbRuns} runs, plus 1 penalty (+ extra delivery).`;
      } else {
        commentary = `NO BALL (Overstep)! ${bowlerName} misses the mark and oversteps the bowling crease! Umpire signals no-ball, penalty run conceded (+ extra delivery).`;
      }
    }

    handleRecordBall(runsOffBat, 'NO_BALL', 1, byeRuns, legByeRuns, commentary);
    setShowNoBallModal(false);
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

    // Check if previous over finished and a new bowler needs to be chosen for the new over (cannot bowl consecutive overs - MCC Law 17.8)
    const prevOverDeliveriesWicket = (currentInnings?.ballEvents || []).filter((b: any) => b.overNumber === currentInnings.overs - 1);
    const isConsecutiveOverForSameBowlerWicket = prevOverDeliveriesWicket.some((b: any) => b.bowlerId === currentInnings.currentBowlerId);
    if (!isSuperOver && currentInnings.balls === 0 && currentInnings.overs > 0 && currentInnings.overs < maxOvers && isConsecutiveOverForSameBowlerWicket) {
      setShowBowlerModal(true);
      setError(`⚠️ Over ${currentInnings.overs + 1} is starting. A bowler who bowled in the previous over cannot bowl consecutive overs. Please select the next bowler before recording a wicket.`);
      return;
    }

    const dismissedPlayerId = dismissedId || currentInnings.currentStrikerId;
    const incomingBatterId = newBatterId || null;

    if (incomingBatterId) {
      if (incomingBatterId === dismissedPlayerId) {
        setWicketModalError('⚠️ The incoming batter cannot be the player who was just dismissed.');
        return;
      }
      if (isPlayerDismissedInInnings(incomingBatterId)) {
        setWicketModalError('⚠️ Cannot select this incoming batter. They have already been dismissed in this innings (Cricket Law 25).');
        return;
      }
    }

    const isRetHurt = wicketType === 'RETIRED_HURT';
    const isRetHurtWithoutBall = isRetHurt && (retHurtWithoutFacingBall || dismissedPlayerId === currentInnings.currentNonStrikerId);
    const runsScoredOnWicket = isRetHurtWithoutBall ? 0 : (wicketRuns || 0);
    const wicketExtraType = (isRetHurtWithoutBall || !isWicketOnNoBall) ? 'NONE' : 'NO_BALL';
    const wicketExtraRuns = (isRetHurtWithoutBall || !isWicketOnNoBall) ? 0 : 1;
    const isLegalBall = !isRetHurtWithoutBall && !isWicketOnNoBall;

    setWicketModalError(null);
    setError(null);
    setShowWicketModal(false);

    let nextBalls = currentInnings.balls;
    let nextOvers = currentInnings.overs;
    let isOverComplete = false;

    if (isLegalBall) {
      if (nextBalls + 1 >= matchBallsPerOver) {
        nextOvers += 1;
        nextBalls = 0;
        isOverComplete = true;
      } else {
        nextBalls += 1;
      }
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

      let updatedBattingScores = (curInn.battingScores || []).map((b: any) => {
        let r = b.runs;
        let balls = b.balls;
        let fours = b.fours;
        let sixes = b.sixes;

        // Striker gets the completed runs and ball faced
        if (b.playerId === currentInnings.currentStrikerId) {
          r += runsScoredOnWicket;
          if (!isRetHurtWithoutBall) balls += 1;
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
          balls: (dismissedPlayerId === currentInnings.currentStrikerId && !isRetHurtWithoutBall) ? 1 : 0,
          fours: (dismissedPlayerId === currentInnings.currentStrikerId && runsScoredOnWicket === 4) ? 1 : 0,
          sixes: (dismissedPlayerId === currentInnings.currentStrikerId && runsScoredOnWicket === 6) ? 1 : 0,
          isOut: !isRetHurt,
          dismissal: dismissalLabel,
        });
      }

      // If incoming batter exists, add to battingScores or restore if returning from retired hurt
      if (incomingBatterId) {
        if (!updatedBattingScores.some((b: any) => b.playerId === incomingBatterId)) {
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
            dismissal: null,
          });
        } else {
          updatedBattingScores = updatedBattingScores.map((b: any) => {
            if (b.playerId === incomingBatterId) {
              return { ...b, isOut: false, dismissal: null };
            }
            return b;
          });
        }
      }

      const updatedBowlingScores = (curInn.bowlingScores || []).map((bw: any) => {
        if (bw.playerId === currentInnings.currentBowlerId) {
          let bOvers = bw.overs || 0;
          let bBalls = (bw.balls || 0) + (isLegalBall ? 1 : 0);
          if (bBalls >= matchBallsPerOver) {
            bOvers += 1;
            bBalls = 0;
          }
          return {
            ...bw,
            overs: bOvers,
            balls: bBalls,
            runsConceded: (bw.runsConceded || 0) + (isRetHurtWithoutBall ? 0 : (runsScoredOnWicket + wicketExtraRuns)),
            wickets: (bw.wickets || 0) + ((!isRetHurtWithoutBall && isBowlerCreditedDismissal(wicketType)) ? 1 : 0),
          };
        }
        return bw;
      });

      const newBallEvent = {
        id: `temp-${Date.now()}`,
        overNumber: currentInnings.overs,
        ballNumber: isLegalBall ? currentInnings.balls + 1 : currentInnings.balls,
        runs: runsScoredOnWicket,
        extras: wicketExtraRuns,
        extraType: wicketExtraType,
        isLegal: isLegalBall,
        isWicket: true,
        wicketType,
        dismissedPlayerId,
        createdAt: new Date().toISOString(),
      };

      const nextInnings = prev.innings.map((inn: any) => {
        if (inn.id === currentInnings.id) {
          return {
            ...inn,
            runs: inn.runs + runsScoredOnWicket + wicketExtraRuns,
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

    const operationId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveClientId = clientId || getPersistentClientId();

    const wicketPayload = {
      runs: runsScoredOnWicket,
      extraType: wicketExtraType as any,
      extraRuns: wicketExtraRuns,
      isWicket: true,
      wicketType: wicketType as any,
      dismissedPlayerId,
      newBatterId: incomingBatterId || undefined,
      withoutFacingBall: isRetHurtWithoutBall,
      expectedUpdatedAt: currentInnings.updatedAt,
      operationId,
      clientId: effectiveClientId,
    };

    if (isOffline || syncStatus.pendingCount > 0 || syncStatus.blockedCount > 0) {
      recordOfflineOperation('RECORD_DELIVERY', wicketPayload).catch((err: any) => {
        setError(`⚠️ Local Save Failed: ${err?.message || 'Storage write rejected'}`);
        alert(`⚠️ Failed to save wicket locally: ${err?.message}`);
      });
      setNewBatterId('');
      setWicketRuns(0);
      setIsWicketOnNoBall(false);
      return;
    }

    lastLocalActionRef.current = Date.now();
    startTransition(async () => {
      try {
        const res = await recordDeliveryAction(currentInnings.id, wicketPayload);
        if (res && res.success) {
          setNewBatterId('');
          setWicketRuns(0);
          setIsWicketOnNoBall(false);
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
        } else {
          const errMsg = (res as any)?.error || 'Database rejected wicket recording.';
          setError(`❌ Wicket NOT recorded: ${errMsg}`);
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            recordOfflineOperation('RECORD_DELIVERY', wicketPayload).catch(() => {});
          }
        }
      } catch (err: any) {
        console.warn('[Online Route Wicket] Failed, falling back to IndexedDB outbox:', err);
        recordOfflineOperation('RECORD_DELIVERY', wicketPayload).catch((storeErr: any) => {
          setError(`⚠️ Network failed and local backup failed: ${storeErr?.message}`);
        });
        setNewBatterId('');
        setWicketRuns(0);
        setIsWicketOnNoBall(false);
      }
    });
  };

  const handleUndo = () => {
    if (!currentInnings || isPending) return;
    setError(null);

    const operationId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveClientId = clientId || getPersistentClientId();

    if (isOffline || syncStatus.pendingCount > 0 || syncStatus.blockedCount > 0) {
      recordOfflineOperation('UNDO_DELIVERY', { inningsId: currentInnings.id, operationId, clientId: effectiveClientId }).catch((err: any) => {
        setError(`⚠️ Local Undo Save Failed: ${err?.message}`);
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await undoLastDeliveryAction(currentInnings.id, operationId, effectiveClientId);
        if (res && res.success) {
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
        } else {
          setError((res as any)?.error || 'Failed to undo.');
        }
      } catch (err: any) {
        console.warn('[Online Route Undo] Failed, falling back to outbox:', err);
        recordOfflineOperation('UNDO_DELIVERY', { inningsId: currentInnings.id, operationId, clientId: effectiveClientId }).catch(() => {});
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

    const operationId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveClientId = clientId || getPersistentClientId();

    if (isOffline || syncStatus.pendingCount > 0 || syncStatus.blockedCount > 0) {
      recordOfflineOperation('SWAP_STRIKER', { operationId, clientId: effectiveClientId }).catch((err: any) => {
        setError(`⚠️ Local Strike Swap Failed: ${err?.message}`);
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await swapStrikerAction(currentInnings.id, operationId, effectiveClientId);
        if (res && res.success) {
          if ((res as any).updatedMatch) {
            setMatch((res as any).updatedMatch);
          }
        } else {
          setError((res as any)?.error || 'Failed to swap strike.');
        }
      } catch (err: any) {
        console.warn('[Online Route Swap] Failed, falling back to outbox:', err);
        recordOfflineOperation('SWAP_STRIKER', { operationId, clientId: effectiveClientId }).catch(() => {});
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

    const operationId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveClientId = clientId || getPersistentClientId();

    if (isOffline || syncStatus.pendingCount > 0 || syncStatus.blockedCount > 0) {
      recordOfflineOperation('CHANGE_BOWLER', { bowlerId: selectedBowlerId, operationId, clientId: effectiveClientId }).catch((err: any) => {
        setError(`⚠️ Local Bowler Change Failed: ${err?.message}`);
      });
      return;
    }

    lastLocalActionRef.current = Date.now();
    startTransition(async () => {
      try {
        const res = await changeBowlerAction(currentInnings.id, selectedBowlerId, operationId, effectiveClientId);
        if (!res.success) {
          setError(res.error || 'Failed to change bowler.');
        } else if ((res as any).updatedMatch) {
          setMatch((res as any).updatedMatch);
        }
      } catch (err: any) {
        console.warn('[Online Route Bowler] Failed, falling back to outbox:', err);
        recordOfflineOperation('CHANGE_BOWLER', { bowlerId: selectedBowlerId, operationId, clientId: effectiveClientId }).catch(() => {});
      }
    });
  };

  const handleSwitchBatter = () => {
    if (!currentInnings || !selectedBatterId) return;

    if (isPlayerDismissedInInnings(selectedBatterId)) {
      setError('⚠️ Cannot select this player. They have already been dismissed in this innings and cannot bat again (MCC Cricket Law 25).');
      return;
    }

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
            currentStriker: isStriker ? (sPlayer || incomingPlayer || inn.currentStriker) : (sPlayer || inn.currentStriker),
            currentNonStriker: !isStriker ? (nsPlayer || incomingPlayer || inn.currentNonStriker) : (nsPlayer || inn.currentNonStriker),
            battingScores: updatedBattingScores,
          };
        }
        return inn;
      });
      return { ...prev, innings: nextInnings };
    });

    const operationId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveClientId = clientId || getPersistentClientId();

    if (isOffline || syncStatus.pendingCount > 0 || syncStatus.blockedCount > 0) {
      recordOfflineOperation('SWITCH_BATTER', { role: targetRole, newPlayerId: selectedBatterId, operationId, clientId: effectiveClientId }).catch((err: any) => {
        setError(`⚠️ Local Batter Switch Failed: ${err?.message}`);
      });
      setSelectedBatterId('');
      return;
    }

    lastLocalActionRef.current = Date.now();
    startTransition(async () => {
      try {
        const res = await switchBatterAction(currentInnings.id, targetRole, selectedBatterId, operationId, effectiveClientId);
        if (!res.success) {
          setError(res.error || 'Failed to assign incoming batter.');
        } else if ((res as any).updatedMatch) {
          setMatch((res as any).updatedMatch);
        }
        setSelectedBatterId('');
      } catch (err: any) {
        console.warn('[Online Route Switch Batter] Failed, falling back to outbox:', err);
        setError(`Failed to assign incoming batter: ${err?.message || 'Server error'}`);
        recordOfflineOperation('SWITCH_BATTER', { role: targetRole, newPlayerId: selectedBatterId, operationId, clientId: effectiveClientId }).catch(() => {});
        setSelectedBatterId('');
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
            const updated = (res as any).updatedMatch;
            setMatch(updated);
            // Advance the tab to the new innings immediately
            if (updated.currentInnings) {
              setActiveInningsTabNumber(updated.currentInnings);
            }
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

  const resetToAllRegisteredSquads = () => {
    setSelectedTeamAPlayerIds(rawTeamAPlayers.map((p: any) => p.id));
    setSelectedTeamBPlayerIds(rawTeamBPlayers.map((p: any) => p.id));
  };

  const getMaxWicketsForInnings = (inn: any) => {
    if (!inn) return 10;
    return getInningsWicketLimit(inn, match);
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
              const overRuns = overBalls.reduce((sum: number, b: any) => sum + calculateDeliveryRuns(b).totalRuns, 0);
              const overWickets = overBalls.filter((b: any) => b.isWicket && b.wicketType !== 'RETIRED_HURT').length;
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
                      const bCalc = calculateDeliveryRuns(b);
                      let label = `${bCalc.batterRuns}`;
                      let bg = '#1E2638';
                      let color = '#FFF';
                      let border = '1px solid rgba(255,255,255,0.15)';

                      if (b.isWicket) {
                        const r = bCalc.batterRuns || b.runs || 0;
                        if (b.wicketType === 'RETIRED_HURT') {
                          label = r > 0 ? `${r}+RH` : 'RH';
                          bg = '#0284C7';
                          border = '1px solid #0369A1';
                        } else if (b.extraType === 'WIDE') {
                          label = r > 0 ? `WD+${r}+W` : (b.extras > 1 ? `WD+${b.extras - 1}+W` : 'WD+W');
                          bg = '#EF4444';
                          border = '1px solid #DC2626';
                        } else if (b.extraType === 'NO_BALL') {
                          label = r > 0 ? `NB+${r}+W` : 'NB+W';
                          bg = '#EF4444';
                          border = '1px solid #DC2626';
                        } else if (r > 0) {
                          label = `${r}+W`;
                          bg = '#EF4444';
                          border = '1px solid #DC2626';
                        } else {
                          label = 'W';
                          bg = '#EF4444';
                          border = '1px solid #DC2626';
                        }
                      } else if (b.extraType === 'WIDE') {
                        label = b.extras > 1 ? `WD+${b.extras - 1}` : 'WD';
                        bg = '#F59E0B';
                        color = '#000';
                        border = '1px solid #D97706';
                      } else if (b.extraType === 'NO_BALL') {
                        if (bCalc.byeRuns > 0) {
                          label = `NB+${bCalc.byeRuns}B`;
                        } else if (bCalc.legByeRuns > 0) {
                          label = `NB+${bCalc.legByeRuns}LB`;
                        } else if (bCalc.batterRuns > 0) {
                          label = `NB+${bCalc.batterRuns}`;
                        } else {
                          label = 'NB';
                        }
                        bg = '#F97316';
                        color = '#000';
                        border = '1px solid #EA580C';
                      } else if (b.extraType === 'BYE') {
                        label = `${bCalc.byeRuns || bCalc.totalRuns || 1}B`;
                        bg = '#1E2638';
                      } else if (b.extraType === 'LEG_BYE') {
                        label = `${bCalc.legByeRuns || bCalc.totalRuns || 1}LB`;
                        bg = '#1E2638';
                      } else if (b.runs === 4) {
                        label = '4';
                        bg = '#10B981';
                        border = '1px solid #059669';
                      } else if (b.runs === 6) {
                        label = '6';
                        bg = '#8B5CF6';
                        border = '1px solid #7C3AED';
                      }

                      const isLocal = Boolean(b.isLocalPending || b.id?.startsWith('offline-') || b.id?.startsWith('temp-'));
                      const effectiveBorder = isLocal ? '2px dashed #F59E0B' : border;

                      return (
                        <button
                          key={b.id || idx}
                          type="button"
                          onClick={() => openEditBallModal(b)}
                          title={`${isLocal ? '[Saved Offline / Pending Sync] ' : ''}Over ${ovNum + 1}.${b.ballNumber || idx + 1}`}
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
                              minWidth: '34px',
                              width: label.length > 2 ? 'auto' : '34px',
                              height: '34px',
                              padding: label.length > 2 ? '0 6px' : '0',
                              borderRadius: label.length > 2 ? '17px' : '50%',
                              background: bg,
                              color: color,
                              border: effectiveBorder,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: label.length > 3 ? '0.72rem' : '0.82rem',
                              fontFamily: 'monospace',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              transition: 'transform 0.1s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            {label}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: isLocal ? '#FBBF24' : '#94A3B8', fontWeight: 700, fontFamily: 'monospace' }}>
                            {b.isLegal ? `.${b.ballNumber || idx + 1}` : (b.wicketType === 'RETIRED_HURT' ? 'ret' : 'ext')} {isLocal ? '⚡LOCAL' : '✏️'}
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
      {/* PWA OFFLINE RESILIENT STATUS BAR */}
      <div
        id="offline-sync-status-bar"
        suppressHydrationWarning
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          borderRadius: '12px',
          background: syncStatus.state === 'OFFLINE'
            ? 'rgba(245, 158, 11, 0.12)'
            : syncStatus.state === 'SYNCING'
            ? 'rgba(59, 130, 246, 0.12)'
            : syncStatus.state === 'SYNC_ERROR' || syncStatus.state === 'BLOCKED'
            ? 'rgba(239, 68, 68, 0.15)'
            : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${
            syncStatus.state === 'OFFLINE'
              ? 'rgba(245, 158, 11, 0.4)'
              : syncStatus.state === 'SYNCING'
              ? 'rgba(59, 130, 246, 0.4)'
              : syncStatus.state === 'SYNC_ERROR' || syncStatus.state === 'BLOCKED'
              ? 'rgba(239, 68, 68, 0.45)'
              : 'rgba(16, 185, 129, 0.25)'
          }`,
          fontSize: '0.84rem',
          fontWeight: 600,
          color: '#F8FAFC',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            suppressHydrationWarning
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: syncStatus.state === 'OFFLINE'
                ? '#F59E0B'
                : syncStatus.state === 'SYNCING'
                ? '#3B82F6'
                : syncStatus.state === 'SYNC_ERROR' || syncStatus.state === 'BLOCKED'
                ? '#EF4444'
                : '#10B981',
              boxShadow: syncStatus.state === 'ONLINE' ? '0 0 8px #10B981' : undefined,
            }}
          />
          <span suppressHydrationWarning style={{ letterSpacing: '0.04em', fontWeight: 800 }}>
            {syncStatus.state === 'OFFLINE' && `OFFLINE • ${syncStatus.pendingCount} saved locally`}
            {syncStatus.state === 'SYNCING' && `SYNCING (${syncStatus.pendingCount} remaining)`}
            {syncStatus.state === 'SYNCED' && `SYNCED`}
            {syncStatus.state === 'ONLINE' && `ONLINE • 0 pending`}
            {syncStatus.state === 'SYNC_ERROR' && `SYNC ERROR • ${syncStatus.failedCount || 1} delivery requires attention`}
            {syncStatus.state === 'BLOCKED' && `${syncStatus.blockedCount} deliveries waiting for authorization`}
          </span>
          {syncStatus.pendingCount > 0 && syncStatus.state !== 'SYNCING' && (
            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              ({syncStatus.pendingCount} delivery queued locally)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(syncStatus.pendingCount > 0 || syncStatus.state === 'SYNC_ERROR' || syncStatus.state === 'BLOCKED') && (
            <button
              id="sync-now-button"
              type="button"
              onClick={() => syncNow()}
              style={{
                background: '#3B82F6',
                color: '#FFF',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sync now ↻
            </button>
          )}
        </div>
      </div>

      {/* LIVE EQUATION & BOUNDARY COUNTER TICKER */}
      <LiveEquationTicker match={match} ballsPerOver={matchBallsPerOver} compact={true} />

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
              {match.tournament?.name} • {match.currentInnings >= 3 ? '⚡ Super Over (1 Over Tie-Breaker)' : `${match.oversPerInnings} Overs`} ({match.ballsPerOver || 6} Balls/Over)
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
              {match.currentInnings >= 3
                ? `⚡ Super Over ${match.currentInnings === 3 ? 1 : match.currentInnings === 4 ? '2 (Chase)' : match.currentInnings - 2}`
                : `Innings ${match.currentInnings}`}
            </div>

            {/* EDIT OVERS & BALLS PER OVER BUTTON */}
            <button
              type="button"
              onClick={() => {
                setRulesOvers(match.oversPerInnings || 20);
                setRulesBallsPerOver(match.ballsPerOver || 6);
                setShowRulesModal(true);
              }}
              title="Edit match overs per innings and balls per over dynamically"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid #3B82F6',
                color: '#93C5FD',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>⚙️</span>
              <span>Edit Overs ({match.oversPerInnings} ov • {match.ballsPerOver || 6} b/ov)</span>
            </button>

            {/* UNDO SUPER OVER BUTTON (ACTIVE DURING SUPER OVER ROUNDS) */}
            {(isSuperOver || match.currentInnings >= 3) && (
              <button
                type="button"
                onClick={handleUndoSuperOver}
                disabled={isUndoSuperOverSaving}
                title="Cancel and undo the Super Over, restoring match to Innings 2"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1.5px solid #EF4444',
                  color: '#FCA5A5',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: isUndoSuperOverSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.25)',
                }}
              >
                <span>↩️</span>
                <span>{isUndoSuperOverSaving ? 'Undoing...' : 'Undo Super Over'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Teams and Score Line - Google Cricket Standard */}
        {(() => {
          const isPreMatch = match.status === 'UPCOMING' && !match.tossWinnerId;
          const inn1 = match.innings?.find((i: any) => i.inningsNumber === 1);
          const inn2 = match.innings?.find((i: any) => i.inningsNumber === 2);
          const effectiveOversLimit = isSuperOver ? 1 : (match.oversPerInnings || 20);

          let leftTeam: any;
          let rightTeam: any;
          let leftInnings: any = null;
          let rightInnings: any = null;
          let leftSOList: any[] = [];
          let rightSOList: any[] = [];
          let leftSquadCount = 0;
          let rightSquadCount = 0;
          let isLeftBattingCurrent = false;
          let isRightBattingCurrent = false;

          if (isPreMatch) {
            // Pre-match (before toss): Show Team A (Left) vs Team B (Right)
            leftTeam = match.teamA;
            rightTeam = match.teamB;
            leftSquadCount = selectedTeamAPlayerIds.length;
            rightSquadCount = selectedTeamBPlayerIds.length;
          } else {
            const inn1BattingTeamId = inn1?.battingTeamId || (
              match.tossWinnerId
                ? (match.tossDecision === 'BAT' ? match.tossWinnerId : (match.tossWinnerId === match.teamAId ? match.teamBId : match.teamAId))
                : match.teamAId
            );
            const inn2BattingTeamId = inn1BattingTeamId === match.teamAId ? match.teamBId : match.teamAId;

            leftTeam = inn1BattingTeamId === match.teamBId ? match.teamB : match.teamA;
            rightTeam = inn2BattingTeamId === match.teamBId ? match.teamB : match.teamA;

            leftSquadCount = inn1BattingTeamId === match.teamBId ? selectedTeamBPlayerIds.length : selectedTeamAPlayerIds.length;
            rightSquadCount = inn2BattingTeamId === match.teamBId ? selectedTeamBPlayerIds.length : selectedTeamAPlayerIds.length;

            leftInnings = inn1 || match.innings?.find((i: any) => i.battingTeamId === leftTeam?.id && i.inningsNumber === 1);
            rightInnings = inn2 || match.innings?.find((i: any) => i.battingTeamId === rightTeam?.id && i.inningsNumber === 2);

            const allSO = (match.innings || []).filter((i: any) => i.inningsNumber >= 3).sort((a: any, b: any) => a.inningsNumber - b.inningsNumber);
            leftSOList = allSO.filter((i: any) => i.battingTeamId === leftTeam?.id);
            rightSOList = allSO.filter((i: any) => i.battingTeamId === rightTeam?.id);

            // Indicator: A badge or 🏏 next to the team currently batting
            if (match.status === 'LIVE' && currentInnings) {
              isLeftBattingCurrent = currentInnings.battingTeamId === leftTeam?.id;
              isRightBattingCurrent = currentInnings.battingTeamId === rightTeam?.id;
            }
          }

          return (
            <div>
              {/* Desktop View (>= 768px): 3-Column Grid */}
              <div className="scorecard-desktop-view">
                <div className="scorecard-match-header-grid">
                  {/* Left Team: Team A pre-match, or Innings 1 batting team post-toss */}
                  <div className="scorecard-team-a-box">
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{leftTeam?.name || 'Team 1'}</span>
                        {isLeftBattingCurrent && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid #EF4444',
                              color: '#FCA5A5',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                            }}
                          >
                            🏏 BATTING
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                        {leftTeam?.shortName} • ({leftSquadCount} players)
                      </div>
                      {leftSOList.length > 0 ? (
                        <div>
                          {leftSOList.map((so: any) => {
                            const soRound = Math.floor((so.inningsNumber - 3) / 2) + 1;
                            return (
                              <div key={so.id} style={{ fontSize: '0.95rem', color: '#FBBF24', fontFamily: 'monospace', fontWeight: 900, marginTop: '2px' }}>
                                ⚡ SO {soRound}: {so.runs}/{so.wickets} ({so.overs}.{so.balls} ov)
                              </div>
                            );
                          })}
                          {leftInnings && (
                            <div style={{ fontSize: '0.76rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                              Main: {leftInnings.runs}/{leftInnings.wickets} ({leftInnings.overs}.{leftInnings.balls} ov)
                            </div>
                          )}
                        </div>
                      ) : leftInnings ? (
                        <div style={{ fontSize: '0.95rem', color: '#FBBF24', fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>
                          {leftInnings.runs}/{leftInnings.wickets} ({leftInnings.overs}.{leftInnings.balls} ov)
                        </div>
                      ) : !isPreMatch ? (
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace', marginTop: '2px' }}>
                          Yet to bat
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Center Box */}
                  <div className="scorecard-center-score-box">
                    {currentInnings && match.status === 'LIVE' ? (
                      <div>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FBBF24', fontFamily: 'monospace', lineHeight: 1 }}>
                          {currentInnings.runs} / {currentInnings.wickets}
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', marginTop: '4px' }}>
                          {currentInnings.overs}.{currentInnings.balls} / {effectiveOversLimit} {effectiveOversLimit === 1 ? 'Over' : 'Overs'}
                        </div>
                        {isSuperOver && (() => {
                          const curInn = currentInnings.inningsNumber;
                          const soRound = Math.floor((curInn - 3) / 2) + 1;
                          const soType = (curInn - 3) % 2 === 0 ? '1' : '2 (CHASE)';
                          return (
                            <div style={{ marginTop: '5px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.2)', border: '1.5px solid #F59E0B', color: '#FBBF24', fontSize: '0.74rem', fontWeight: 900, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                              ⚡ SUPER OVER {soRound} • INNINGS {soType} (1 OV • 2 WKTS MAX)
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.5)' }}>
                        {match.status === 'UPCOMING' ? 'NOT STARTED' : match.status}
                      </div>
                    )}
                  </div>

                  {/* Right Team: Team B pre-match, or Innings 2 batting team post-toss */}
                  <div className="scorecard-team-b-box">
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                        {isRightBattingCurrent && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid #EF4444',
                              color: '#FCA5A5',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                            }}
                          >
                            🏏 BATTING
                          </span>
                        )}
                        <span>{rightTeam?.name || 'Team 2'}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                        {rightTeam?.shortName} • ({rightSquadCount} players)
                      </div>
                      {rightSOList.length > 0 ? (
                        <div>
                          {rightSOList.map((so: any) => {
                            const soRound = Math.floor((so.inningsNumber - 3) / 2) + 1;
                            return (
                              <div key={so.id} style={{ fontSize: '0.95rem', color: '#FBBF24', fontFamily: 'monospace', fontWeight: 900, marginTop: '2px' }}>
                                ⚡ SO {soRound}: {so.runs}/{so.wickets} ({so.overs}.{so.balls} ov)
                              </div>
                            );
                          })}
                          {rightInnings && (
                            <div style={{ fontSize: '0.76rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                              Main: {rightInnings.runs}/{rightInnings.wickets} ({rightInnings.overs}.{rightInnings.balls} ov)
                            </div>
                          )}
                        </div>
                      ) : rightInnings ? (
                        <div style={{ fontSize: '0.95rem', color: '#FBBF24', fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>
                          {rightInnings.runs}/{rightInnings.wickets} ({rightInnings.overs}.{rightInnings.balls} ov)
                        </div>
                      ) : !isPreMatch ? (
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace', marginTop: '2px' }}>
                          Yet to bat
                        </div>
                      ) : null}
                    </div>
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
                        <span className="scorecard-mobile-card-title">{leftTeam?.name || 'Team 1'}</span>
                        {isLeftBattingCurrent && <span className="scorecard-mobile-batting-badge">🏏 BATTING</span>}
                        <span className="scorecard-mobile-shortname">{leftTeam?.shortName} • ({leftSquadCount}p)</span>
                      </div>
                    </div>

                    <div className="scorecard-mobile-card-scores left">
                      {leftSOList.length > 0 ? (
                        <>
                          {leftSOList.map((so: any) => {
                            const soRound = Math.floor((so.inningsNumber - 3) / 2) + 1;
                            return (
                              <div key={so.id}>
                                <span className="scorecard-mobile-big-score" style={{ color: '#FBBF24' }}>{so.runs}/{so.wickets}</span>
                                <span className="scorecard-mobile-overs-tag">({so.overs}.{so.balls} ov [SO {soRound}])</span>
                              </div>
                            );
                          })}
                          {leftInnings && <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginTop: '1px' }}>Main: {leftInnings.runs}/{leftInnings.wickets}</span>}
                        </>
                      ) : leftInnings ? (
                        <>
                          <span className="scorecard-mobile-big-score">{leftInnings.runs}/{leftInnings.wickets}</span>
                          <span className="scorecard-mobile-overs-tag">({leftInnings.overs}.{leftInnings.balls} ov)</span>
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
                        <span className="scorecard-mobile-card-title">{rightTeam?.name || 'Team 2'}</span>
                        {isRightBattingCurrent && <span className="scorecard-mobile-batting-badge">🏏 BATTING</span>}
                        <span className="scorecard-mobile-shortname">{rightTeam?.shortName} • ({rightSquadCount}p)</span>
                      </div>
                    </div>

                    <div className="scorecard-mobile-card-scores right">
                      {rightSOList.length > 0 ? (
                        <>
                          {rightSOList.map((so: any) => {
                            const soRound = Math.floor((so.inningsNumber - 3) / 2) + 1;
                            return (
                              <div key={so.id}>
                                <span className="scorecard-mobile-big-score" style={{ color: '#FBBF24' }}>{so.runs}/{so.wickets}</span>
                                <span className="scorecard-mobile-overs-tag">({so.overs}.{so.balls} ov [SO {soRound}])</span>
                              </div>
                            );
                          })}
                          {rightInnings && <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginTop: '1px' }}>Main: {rightInnings.runs}/{rightInnings.wickets}</span>}
                        </>
                      ) : rightInnings ? (
                        <>
                          <span className="scorecard-mobile-big-score">{rightInnings.runs}/{rightInnings.wickets}</span>
                          <span className="scorecard-mobile-overs-tag">({rightInnings.overs}.{rightInnings.balls} ov)</span>
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

                {/* Mobile Status Strip */}
                <div className="scorecard-mobile-status-strip">
                  <div className="scorecard-mobile-status-live">
                    <span className="scorecard-live-dot" />
                    <span>
                      {match.status === 'LIVE' && currentInnings
                        ? (isSuperOver
                            ? (() => {
                                const curInn = currentInnings.inningsNumber;
                                const soRound = Math.floor((curInn - 3) / 2) + 1;
                                const soType = (curInn - 3) % 2 === 0 ? '1' : '2 (CHASE)';
                                return `⚡ SUPER OVER ${soRound} • INNINGS ${soType} (${currentInnings.overs}.${currentInnings.balls}/1.0 OV)`;
                              })()
                            : `INNINGS ${currentInnings.inningsNumber} (${currentInnings.overs}.${currentInnings.balls}/${match.oversPerInnings} OV)`)
                        : match.status}
                    </span>
                  </div>
                  {currentInnings && (
                    <div className="scorecard-mobile-rates">
                      CRR: {currentInnings.overs + currentInnings.balls / 6 > 0 ? (currentInnings.runs / (currentInnings.overs + currentInnings.balls / 6)).toFixed(2) : '0.00'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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
                  All registered players play by default. If opposing captains agree to equalize to the smaller squad, you can equalize below.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {rawTeamAPlayers.length !== rawTeamBPlayers.length && (
                  <button
                    type="button"
                    onClick={autoBalanceSquads}
                    title="If both captains mutually agree, reduce squad size to match the smaller team"
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#F59E0B',
                      border: '1px solid #F59E0B',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🤝 Mutual Agreement: Equalize ({Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)} vs {Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)})</span>
                  </button>
                )}
                {(selectedTeamAPlayerIds.length !== rawTeamAPlayers.length || selectedTeamBPlayerIds.length !== rawTeamBPlayers.length) && (
                  <button
                    type="button"
                    onClick={resetToAllRegisteredSquads}
                    title="Restore full registered squad for both teams"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#94A3B8',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>↺ Restore Full Squads ({rawTeamAPlayers.length} vs {rawTeamBPlayers.length})</span>
                  </button>
                )}
              </div>
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
                  {rawTeamAPlayers.length === 0 ? (
                    <div style={{ color: '#64748B', fontSize: '0.8rem', fontStyle: 'italic', padding: '8px', gridColumn: '1 / -1' }}>No registered players found</div>
                  ) : rawTeamAPlayers.map((p: any) => {
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
                  {rawTeamBPlayers.length === 0 ? (
                    <div style={{ color: '#64748B', fontSize: '0.8rem', fontStyle: 'italic', padding: '8px', gridColumn: '1 / -1' }}>No registered players found</div>
                  ) : rawTeamBPlayers.map((p: any) => {
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
                  All registered players play by default. If opposing captains agree to equalize to the smaller squad, you can equalize below.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {rawTeamAPlayers.length !== rawTeamBPlayers.length && (
                  <button
                    type="button"
                    onClick={autoBalanceSquads}
                    title="If both captains mutually agree, reduce squad size to match the smaller team"
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#F59E0B',
                      border: '1px solid #F59E0B',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🤝 Mutual Agreement: Equalize ({Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)} vs {Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)})</span>
                  </button>
                )}
                {(selectedTeamAPlayerIds.length !== rawTeamAPlayers.length || selectedTeamBPlayerIds.length !== rawTeamBPlayers.length) && (
                  <button
                    type="button"
                    onClick={resetToAllRegisteredSquads}
                    title="Restore full registered squad for both teams"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#94A3B8',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>↺ Restore Full Squads ({rawTeamAPlayers.length} vs {rawTeamBPlayers.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Team A Selection */}
              <div style={{ background: '#141A26', border: '1px solid #1E2638', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ color: '#FFF', fontSize: '0.9rem' }}>{match.teamA.name}</strong>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#C0272D', color: '#FFF', fontWeight: 800, fontFamily: 'monospace' }}>
                    {selectedTeamAPlayerIds.length} / {rawTeamAPlayers.length} Playing
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {rawTeamAPlayers.length === 0 ? (
                    <div style={{ color: '#64748B', fontSize: '0.8rem', fontStyle: 'italic', padding: '8px', gridColumn: '1 / -1' }}>No registered players found</div>
                  ) : rawTeamAPlayers.map((p: any) => {
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
                  {rawTeamBPlayers.length === 0 ? (
                    <div style={{ color: '#64748B', fontSize: '0.8rem', fontStyle: 'italic', padding: '8px', gridColumn: '1 / -1' }}>No registered players found</div>
                  ) : rawTeamBPlayers.map((p: any) => {
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

          {(currentInnings.inningsNumber === 2 || (currentInnings.inningsNumber >= 4 && currentInnings.inningsNumber % 2 === 0)) && (() => {
            const isSOChase = currentInnings.inningsNumber >= 4;
            const prevInnNum = isSOChase ? currentInnings.inningsNumber - 1 : 1;
            const innPrev = match.innings?.find((i: any) => i.inningsNumber === prevInnNum);
            const target = (innPrev?.runs || 0) + 1;
            const oversLimit = isSOChase ? 1 : (match.oversPerInnings || 6);
            const rrr = (target / oversLimit).toFixed(2);
            return (
              <div style={{ background: isSOChase ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.1)', border: isSOChase ? '1.5px solid #F59E0B' : '1px solid #10B981', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: isSOChase ? '#FBBF24' : '#10B981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isSOChase ? `⚡ Super Over ${Math.floor((currentInnings.inningsNumber - 3) / 2) + 1} Target Chase` : '🎯 2nd Innings Target Chase'}
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', fontFamily: 'monospace' }}>
                    Target: {target} Runs in {oversLimit} {oversLimit === 1 ? 'Over' : 'Overs'}
                  </div>
                </div>
                <div style={{ background: '#141A26', border: '1px solid #2A364E', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', color: isSOChase ? '#FBBF24' : '#10B981', fontWeight: 800 }}>
                  Req. RR: {rrr}
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
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
          {(currentInnings.inningsNumber === 2 || (currentInnings.inningsNumber >= 4 && currentInnings.inningsNumber % 2 === 0)) && (() => {
            const isSOChase = currentInnings.inningsNumber >= 4;
            const firstInnNum = isSOChase ? currentInnings.inningsNumber - 1 : 1;
            const inn1 = match.innings?.find((i: any) => i.inningsNumber === firstInnNum);
            const target = (inn1?.runs || 0) + 1;
            const needed = Math.max(0, target - currentInnings.runs);
            const bPerOver = match.ballsPerOver || 6;
            const totalOvers = isSOChase ? 1 : (match.oversPerInnings || 20);
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
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
                          🔄 Change
                        </button>
                        <button
                          type="button"
                          onClick={() => openRenameModal(activeStriker?.id, activeStriker?.name, activeStriker?.jerseyNumber)}
                          title="Edit/correct player name without affecting score"
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid #3B82F6',
                            color: '#93C5FD',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          ✏️ Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDismissedId(activeStriker?.id || currentInnings.currentStrikerId || '');
                            setWicketRuns(0);
                            setWicketType('RETIRED_HURT');
                            setRetHurtWithoutFacingBall(true);
                            setShowWicketModal(true);
                          }}
                          title="Striker leaves field retired hurt (not a wicket lost under MCC Law 25.4)"
                          style={{
                            background: 'rgba(2, 132, 199, 0.15)',
                            border: '1px solid #0284C7',
                            color: '#38BDF8',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          🏥 Ret. Hurt
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
                      onClick={() => { setTargetRole('striker'); setSelectedBatterId(''); setShowBatterModal(true); }}
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
                          🔄 Change
                        </button>
                        <button
                          type="button"
                          onClick={() => openRenameModal(activeNonStriker?.id, activeNonStriker?.name, activeNonStriker?.jerseyNumber)}
                          title="Edit/correct player name without affecting score"
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid #3B82F6',
                            color: '#93C5FD',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          ✏️ Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDismissedId(activeNonStriker?.id || currentInnings.currentNonStrikerId || '');
                            setWicketRuns(0);
                            setWicketType('RETIRED_HURT');
                            setRetHurtWithoutFacingBall(true);
                            setShowWicketModal(true);
                          }}
                          title="Non-striker leaves field retired hurt (not a wicket lost under MCC Law 25.4)"
                          style={{
                            background: 'rgba(2, 132, 199, 0.15)',
                            border: '1px solid #0284C7',
                            color: '#38BDF8',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          🏥 Ret. Hurt
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBowlerId(activeBowler?.id || '');
                      setShowBowlerModal(true);
                    }}
                    style={{ background: '#1E2638', border: '1px solid #2A364E', color: currentInnings.balls > 0 ? '#60A5FA' : '#FBBF24', borderRadius: '4px', padding: '3px 9px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    {currentInnings.balls > 0 ? '🚑 Replace Bowler (Injury)' : '🔄 Change Bowler'}
                  </button>
                  {activeBowler && (
                    <button
                      type="button"
                      onClick={() => openRenameModal(activeBowler?.id, activeBowler?.name, activeBowler?.jerseyNumber)}
                      title="Edit/correct bowler name without affecting bowling figures"
                      style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid #3B82F6',
                        color: '#93C5FD',
                        borderRadius: '4px',
                        padding: '3px 9px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      ✏️ Rename
                    </button>
                  )}
                </div>
              </div>

              {activeBowler ? (
                (() => {
                  const isSuperOver = currentInnings.inningsNumber >= 3;
                  const maxOvers = isSuperOver ? 1 : (match.oversPerInnings || 20);
                  const matchBallsPerOver = match.ballsPerOver || 6;
                  const isNewOverPending = !isSuperOver && currentInnings.balls === 0 && currentInnings.overs > 0 && currentInnings.overs < maxOvers;

                  if (isSuperOver && (currentInnings.overs >= 1 || currentInnings.wickets >= 2)) {
                    const soRound = Math.floor((currentInnings.inningsNumber - 3) / 2) + 1;
                    const soType = (currentInnings.inningsNumber - 3) % 2 === 0 ? '1' : '2 (CHASE)';
                    return (
                      <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1.5px solid #F59E0B', borderRadius: '8px', padding: '10px', marginTop: '6px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#FBBF24', marginBottom: '4px' }}>
                          ⚡ SUPER OVER {soRound} • INNINGS {soType} COMPLETE!
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
                          {activeBowler.name} bowled {bowlerScore?.overs || 0}.{bowlerScore?.balls || 0} ov ({bowlerScore?.wickets || 0}w - {bowlerScore?.runsConceded || 0}r)
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
            const currentOverRuns = currentOverDeliveries.reduce((sum: number, b: any) => sum + calculateDeliveryRuns(b).totalRuns, 0);
            const legalBallsInCurrentOver = currentOverDeliveries.filter((b: any) => b.isLegal).length;
            const remainingSlots = Math.max(0, matchBallsPerOver - legalBallsInCurrentOver);

            const prevOverNum = currentOverNum - 1;
            const prevOverDeliveries = prevOverNum >= 0 ? sortBalls(allDeliveries.filter((b: any) => b.overNumber === prevOverNum)) : [];
            const prevOverRuns = prevOverDeliveries.reduce((sum: number, b: any) => sum + calculateDeliveryRuns(b).totalRuns, 0);

            const getBallStyle = (b: any) => {
              const bCalc = calculateDeliveryRuns(b);
              let label = `${bCalc.batterRuns}`;
              let bg = '#1E2638';
              let color = '#FFF';
              let border = '1px solid rgba(255,255,255,0.15)';

              if (b.isWicket) {
                const r = bCalc.batterRuns || b.runs || 0;
                if (b.wicketType === 'RETIRED_HURT') {
                  label = r > 0 ? `${r}+RH` : 'RH';
                  bg = '#0284C7';
                  border = '1px solid #0369A1';
                } else if (b.extraType === 'WIDE') {
                  label = r > 0 ? `WD+${r}+W` : (b.extras > 1 ? `WD+${b.extras - 1}+W` : 'WD+W');
                  bg = '#EF4444';
                  border = '1px solid #DC2626';
                } else if (b.extraType === 'NO_BALL') {
                  label = r > 0 ? `NB+${r}+W` : 'NB+W';
                  bg = '#EF4444';
                  border = '1px solid #DC2626';
                } else if (r > 0) {
                  label = `${r}+W`;
                  bg = '#EF4444';
                  border = '1px solid #DC2626';
                } else {
                  label = 'W';
                  bg = '#EF4444';
                  border = '1px solid #DC2626';
                }
              } else if (b.extraType === 'WIDE') {
                label = b.extras > 1 ? `WD+${b.extras - 1}` : 'WD';
                bg = '#F59E0B';
                color = '#000';
                border = '1px solid #D97706';
              } else if (b.extraType === 'NO_BALL') {
                if (bCalc.byeRuns > 0) {
                  label = `NB+${bCalc.byeRuns}B`;
                } else if (bCalc.legByeRuns > 0) {
                  label = `NB+${bCalc.legByeRuns}LB`;
                } else if (bCalc.batterRuns > 0) {
                  label = `NB+${bCalc.batterRuns}`;
                } else {
                  label = 'NB';
                }
                bg = '#F97316';
                color = '#000';
                border = '1px solid #EA580C';
              } else if (b.extraType === 'BYE') {
                label = `${bCalc.byeRuns || bCalc.totalRuns || 1}B`;
                bg = '#1E2638';
              } else if (b.extraType === 'LEG_BYE') {
                label = `${bCalc.legByeRuns || bCalc.totalRuns || 1}LB`;
                bg = '#1E2638';
              } else if (b.runs === 4) {
                label = '4';
                bg = '#10B981';
                border = '1px solid #059669';
              } else if (b.runs === 6) {
                label = '6';
                bg = '#8B5CF6';
                border = '1px solid #7C3AED';
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
                              minWidth: '36px',
                              width: style.label.length > 2 ? 'auto' : '36px',
                              height: '36px',
                              padding: style.label.length > 2 ? '0 6px' : '0',
                              borderRadius: style.label.length > 2 ? '18px' : '50%',
                              background: style.bg,
                              color: style.color,
                              border: style.border,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: style.label.length > 3 ? '0.74rem' : '0.88rem',
                              fontFamily: 'monospace',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            }}
                          >
                            {style.label}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, fontFamily: 'monospace' }}>
                            {b.isLegal ? `.${b.ballNumber || idx + 1}` : (b.wicketType === 'RETIRED_HURT' ? 'ret' : 'ext')}
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
            const inn2MaxWickets = getMaxWicketsForInnings(inn2);
            const isMainTied = Boolean(
              inn1 && inn2 && inn1.runs === inn2.runs &&
              (inn2.status === 'COMPLETED' || inn2.overs >= match.oversPerInnings || inn2.wickets >= inn2MaxWickets || match.status === 'COMPLETED') &&
              match.currentInnings <= 2
            );

            // Super Over Tie evaluation (Innings 4, 6, 8, etc.)
            const allInnings = match.innings || [];
            const completedSOChase = allInnings
              .filter((i: any) => i.inningsNumber >= 4 && i.inningsNumber % 2 === 0)
              .sort((a: any, b: any) => b.inningsNumber - a.inningsNumber)[0];

            let isSOTied = false;
            let tiedSORound = 1;
            let tiedSORuns = 0;
            let nextSORound = 2;

            if (completedSOChase) {
              const prevSO = allInnings.find((i: any) => i.inningsNumber === completedSOChase.inningsNumber - 1);
              if (
                prevSO &&
                prevSO.runs === completedSOChase.runs &&
                (completedSOChase.status === 'COMPLETED' || completedSOChase.overs >= 1 || completedSOChase.wickets >= 2 || (match.resultNote && match.resultNote.toLowerCase().includes('tied'))) &&
                match.currentInnings <= completedSOChase.inningsNumber
              ) {
                isSOTied = true;
                tiedSORound = Math.floor((completedSOChase.inningsNumber - 3) / 2) + 1;
                tiedSORuns = completedSOChase.runs;
                nextSORound = tiedSORound + 1;
              }
            }

            if (!isMainTied && !isSOTied) return null;

            const isSO = isSOTied;
            const title = isSO
              ? `🔥 SUPER OVER ${tiedSORound} TIED! (${tiedSORuns} - ${tiedSORuns})`
              : `🔥 MATCH TIED! (${inn1.runs} - ${inn2.runs})`;
            const subtitle = isSO
              ? `Super Over ${tiedSORound} ended in a tie! You can start Super Over ${nextSORound} (Round ${nextSORound}), or declare the final match result.`
              : `Scores are level! You can start an official 1-Over Super Over tie-breaker, or declare the match result.`;
            const buttonLabel = isSO
              ? `⚡ Start Super Over ${nextSORound} (Round ${nextSORound}) →`
              : `⚡ Start Super Over (Tie-Breaker) →`;

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
                      <span>{title}</span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginTop: '4px' }}>
                      {subtitle}
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
                      {buttonLabel}
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
          {match.currentInnings === 1 && (currentInnings.overs >= match.oversPerInnings || currentInnings.wickets >= getMaxWicketsForInnings(currentInnings)) && (
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
                    {currentInnings.wickets >= getMaxWicketsForInnings(currentInnings) ? 'All out!' : `All ${match.oversPerInnings} overs have been bowled.`} Review or edit deliveries below, or close Innings 1 to begin the 2nd Innings run chase.
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

          {/* SUPER OVER 1ST INNINGS QUOTA REACHED BANNER */}
          {match.currentInnings >= 3 && currentInnings.inningsNumber % 2 === 1 && (currentInnings.overs >= 1 || currentInnings.wickets >= 2 || currentInnings.status === 'COMPLETED') && (() => {
            const currentSORound = Math.floor((currentInnings.inningsNumber - 3) / 2) + 1;
            return (
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
                      🔥 SUPER OVER {currentSORound} (1st Innings) COMPLETED ({currentInnings.runs}/{currentInnings.wickets} in {currentInnings.overs}.{currentInnings.balls} ov)
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginTop: '4px' }}>
                      Super Over {currentSORound} 1st Innings finished! Target for Chase is {currentInnings.runs + 1} runs in 1.0 Over.
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
                    🏁 End 1st Innings & Start Super Over {currentSORound} Chase →
                  </button>
                </div>
              </div>
            );
          })()}

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
                    A batter has retired hurt or a wicket has fallen. Scoring is locked until you select the incoming {!currentInnings.currentStrikerId ? 'Striker' : 'Non-Striker'}.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTargetRole(!currentInnings.currentStrikerId ? 'striker' : 'nonStriker');
                  setSelectedBatterId('');
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

                {isPreviousDeliveryNoBall && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%)',
                      border: '1.5px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 0 16px rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>⚡</span>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#FCA5A5', letterSpacing: '0.04em' }}>
                          RE-BOWLED DELIVERY (EXTRA BALL)
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#FED7AA', marginTop: '2px' }}>
                          Previous delivery was a No-Ball (+1 Extra). Delivery to be re-bowled — any wicket on this delivery is <strong>100% VALID</strong>!
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        color: '#FFF',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
                      }}
                    >
                      ALL WICKETS VALID
                    </span>
                  </div>
                )}

                {/* SUPER OVER ACTIVE IN-GAME BANNER WITH UNDO BUTTON */}
                {isSuperOver && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1.5px solid #F59E0B',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡</span>
                        <span>SUPER OVER {currentInnings?.inningsNumber === 3 ? '1' : '2 (CHASE)'} IN PROGRESS</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#CBD5E1', marginTop: '2px' }}>
                        1 Over Limit ({match.ballsPerOver || 6} Balls) • 2 Wickets Maximum
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUndoSuperOver}
                      disabled={isUndoSuperOverSaving}
                      title="Cancel and undo the Super Over, restoring match to Innings 2"
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #EF4444',
                        color: '#FCA5A5',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: isUndoSuperOverSaving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>↩️</span>
                      <span>{isUndoSuperOverSaving ? 'Undoing...' : 'Undo Super Over'}</span>
                    </button>
                  </div>
                )}

                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', marginBottom: '14px' }}>
                  Runs off the Bat
                </div>

                {/* Standard Runs */}
                <div className="scoring-runs-grid">
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

                <div className="scoring-extras-grid">
                  <button
                    disabled={isScorePadLocked}
                    title="Wide Delivery Options: standard +1, boundary 4 (+5 wides), running extra runs (MCC Law 22)"
                    onClick={() => {
                      setWideRuns(0);
                      setWideIsBoundary(false);
                      setShowWideModal(true);
                    }}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#FBBF24',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      padding: '14px 0',
                      borderRadius: '8px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>WIDE</span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.3)', padding: '1px 5px', borderRadius: '4px' }}>+Options</span>
                  </button>

                  <button
                    disabled={isScorePadLocked}
                    title="CPL Rule: Above chest height or chucking (+1 run & extra delivery to be re-bowled)"
                    onClick={() => {
                      setNbType('BAT');
                      setNbRuns(0);
                      setNbReason('CHEST_HEIGHT');
                      setShowNoBallModal(true);
                    }}
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
                    type="button"
                    disabled={isScorePadLocked}
                    title="MCC Law 23: Byes (1 Bye, Boundary 4 Byes, running byes) - Opens Bye Options"
                    onClick={() => {
                      setByeType('BYE');
                      setByeRunsCount(1);
                      setShowByeModal(true);
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#60A5FA',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      padding: '14px 0',
                      borderRadius: '8px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>BYE</span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.3)', padding: '1px 5px', borderRadius: '4px' }}>+Options</span>
                  </button>

                  <button
                    type="button"
                    disabled={isScorePadLocked}
                    title="MCC Law 23: Leg Byes (1 Leg Bye, Boundary 4 Leg Byes, running leg byes) - Opens Leg Bye Options"
                    onClick={() => {
                      setByeType('LEG_BYE');
                      setByeRunsCount(1);
                      setShowByeModal(true);
                    }}
                    style={{
                      background: '#141A26',
                      border: '1px solid #2A364E',
                      color: '#CBD5E1',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      padding: '14px 0',
                      borderRadius: '8px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>LEG BYE</span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.12)', padding: '1px 5px', borderRadius: '4px' }}>+Options</span>
                  </button>

                  <button
                    disabled={isScorePadLocked}
                    onClick={() => {
                      setDismissedId(currentInnings.currentStrikerId || '');
                      setWicketRuns(0);
                      setWicketType(isFreeHitActive ? 'RUN_OUT' : 'CAUGHT');
                      setRetHurtWithoutFacingBall(false);
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

                  <button
                    type="button"
                    disabled={isScorePadLocked}
                    title="Record batter Retired Hurt (leaves field, not a wicket lost under MCC Law 25.4)"
                    onClick={() => {
                      setDismissedId(currentInnings.currentStrikerId || '');
                      setWicketRuns(0);
                      setWicketType('RETIRED_HURT');
                      setRetHurtWithoutFacingBall(true);
                      setShowWicketModal(true);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                      border: '1px solid #38BDF8',
                      color: '#FFF',
                      fontSize: '0.88rem',
                      fontWeight: 900,
                      padding: '14px 0',
                      borderRadius: '8px',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>🏥</span>
                    <span>RETIRED HURT</span>
                  </button>
                </div>

                {/* Direct 1-Tap Extras Shortcut Bar (Boundary Wides, 4 Byes & Running Extras) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    disabled={isScorePadLocked}
                    title="Ball beats keeper to boundary fence (1 wide to bowler + 4 extras to batting team, delivery re-bowled)"
                    onClick={() => {
                      const bName = activeBowler?.name || 'Bowler';
                      const sName = activeStriker?.name || 'Striker';
                      handleRecordBall(4, 'WIDE', 5, 0, 0, `5 WIDES! Wild delivery from ${bName} beats ${sName} and keeper, racing all the way to the boundary for 5 extras (1 to bowler, 4 extras)!`);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.12))',
                      border: '1.5px solid rgba(245, 158, 11, 0.55)',
                      color: '#FBBF24',
                      padding: '10px 10px',
                      borderRadius: '8px',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>🏏</span>
                    <span>5 WD (Boundary)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isScorePadLocked}
                    title="MCC Law 23: Ball misses bat/batter and races to boundary for 4 Byes (extras to batting team, legal delivery, 0 to bowler)"
                    onClick={() => {
                      const bName = activeBowler?.name || 'Bowler';
                      const sName = activeStriker?.name || 'Striker';
                      handleRecordBall(0, 'BYE', 4, 4, 0, `4 BYES! Delivery from ${bName} evades ${sName} and keeper, racing across the boundary rope for 4 Byes!`);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.15))',
                      border: '1.5px solid rgba(59, 130, 246, 0.65)',
                      color: '#60A5FA',
                      padding: '10px 10px',
                      borderRadius: '8px',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>⚡</span>
                    <span>4 BYES (Boundary)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isScorePadLocked}
                    title="MCC Law 23: Ball deflects off pads and races to boundary for 4 Leg Byes (extras to batting team, legal delivery, 0 to bowler)"
                    onClick={() => {
                      const bName = activeBowler?.name || 'Bowler';
                      const sName = activeStriker?.name || 'Striker';
                      handleRecordBall(0, 'LEG_BYE', 4, 0, 4, `4 LEG BYES! Delivery from ${bName} deflects off ${sName}'s pads, speeding past the boundary rope for 4 Leg Byes!`);
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.10)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#93C5FD',
                      padding: '10px 10px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>🛡️</span>
                    <span>4 LEG BYES</span>
                  </button>

                  <button
                    type="button"
                    disabled={isScorePadLocked}
                    title="MCC Law 22: Batters scamper 1 extra run on a wide (1 wide penalty + 1 run = 2 wides total, strike rotates)"
                    onClick={() => {
                      const bName = activeBowler?.name || 'Bowler';
                      const sName = activeStriker?.name || 'Striker';
                      handleRecordBall(1, 'WIDE', 2, 0, 0, `WIDE + 1 RUN! Delivery outside reach of ${sName}. Batters scamper through for 1 extra run (2 wides total) conceded by ${bName}.`);
                    }}
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#FBBF24',
                      padding: '10px 10px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: isScorePadLocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>🏃</span>
                    <span>2 WD (1 Run)</span>
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

            {(currentInnings.inningsNumber <= 2 || currentInnings.inningsNumber % 2 === 0) && (() => {
              const nextRoundNum = currentInnings.inningsNumber <= 2 ? 1 : Math.floor((currentInnings.inningsNumber - 3) / 2) + 2;
              return (
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
                  ⚡ Super Over {nextRoundNum > 1 ? nextRoundNum : ''}
                </button>
              );
            })()}

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
                const isSO = inn.inningsNumber >= 3;
                const soRound = Math.floor((inn.inningsNumber - 3) / 2) + 1;
                const soType = inn.inningsNumber % 2 === 1 ? '1st Inn' : 'Chase';
                const label = inn.inningsNumber === 1
                  ? '1st Innings'
                  : inn.inningsNumber === 2
                  ? '2nd Innings'
                  : `⚡ Super Over ${soRound} (${soType})`;
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0 }}>
                  Adjust active lineup or equalize by mutual agreement:
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {rawTeamAPlayers.length !== rawTeamBPlayers.length && (
                    <button
                      type="button"
                      onClick={autoBalanceSquads}
                      title="If opposing team mutually agrees, adjust playing squad to match the smaller team"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        color: '#F59E0B',
                        border: '1px solid #F59E0B',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      🤝 Mutual Agreement: Equalize ({Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)} vs {Math.min(rawTeamAPlayers.length, rawTeamBPlayers.length)})
                    </button>
                  )}
                  {(selectedTeamAPlayerIds.length !== rawTeamAPlayers.length || selectedTeamBPlayerIds.length !== rawTeamBPlayers.length) && (
                    <button
                      type="button"
                      onClick={resetToAllRegisteredSquads}
                      title="Restore full registered squad for both teams"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#94A3B8',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      ↺ Restore Full Squads ({rawTeamAPlayers.length} vs {rawTeamBPlayers.length})
                    </button>
                  )}
                </div>
              </div>

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
                    {rawTeamAPlayers.length === 0 ? (
                      <div style={{ color: '#64748B', fontSize: '0.75rem', fontStyle: 'italic', padding: '6px', gridColumn: '1 / -1' }}>No registered players found</div>
                    ) : rawTeamAPlayers.map((p: any) => {
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
                    {rawTeamBPlayers.length === 0 ? (
                      <div style={{ color: '#64748B', fontSize: '0.75rem', fontStyle: 'italic', padding: '6px', gridColumn: '1 / -1' }}>No registered players found</div>
                    ) : rawTeamBPlayers.map((p: any) => {
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

          {/* HEAD-TO-HEAD BOUNDARY COUNTER (TOURNAMENT TIE-BREAK REGULATIONS AT THE BOTTOM) */}
          <div style={{ marginTop: '16px' }}>
            <HeadToHeadBoundaryCounter match={match} compact={true} />
          </div>
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
                const soRound = Math.floor((inn.inningsNumber - 3) / 2) + 1;
                const soType = inn.inningsNumber % 2 === 1 ? '1st Inn' : 'Chase';
                const label = inn.inningsNumber === 1
                  ? '1st Innings'
                  : inn.inningsNumber === 2
                  ? '2nd Innings'
                  : `⚡ Super Over ${soRound} (${soType})`;
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
              <button
                type="button"
                onClick={() => router.push(`/${entryPath}/matches`)}
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFF',
                  border: 'none',
                  padding: '12px 22px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                }}
              >
                ← Return to Matches List
              </button>

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

              {/* UNDO SUPER OVER BUTTON (COMPLETED SCREEN) */}
              {(match.innings || []).some((i: any) => i.inningsNumber >= 3) && (
                <button
                  type="button"
                  onClick={handleUndoSuperOver}
                  disabled={isUndoSuperOverSaving}
                  title="Cancel and undo the Super Over, restoring match to Innings 2"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1.5px solid #EF4444',
                    color: '#FCA5A5',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '0.92rem',
                    fontWeight: 900,
                    cursor: isUndoSuperOverSaving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 12px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <span>↩️</span>
                  <span>{isUndoSuperOverSaving ? 'Undoing Super Over...' : 'Undo Super Over'}</span>
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

              <a
                href={`/${entryPath}/tournaments`}
                style={{
                  background: '#141A26',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
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
                🏆 Tournament Hub
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
                const isSO = inn.inningsNumber >= 3;
                const soRound = Math.floor((inn.inningsNumber - 3) / 2) + 1;
                const soType = inn.inningsNumber % 2 === 1 ? '1st Inn' : 'Chase';
                const label = inn.inningsNumber === 1
                  ? '1st Innings'
                  : inn.inningsNumber === 2
                  ? '2nd Innings'
                  : `⚡ Super Over ${soRound} (${soType})`;
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
                              <span>{bs.player?.name || 'Player'}</span>
                              {bs.isOut ? (
                                <span style={{ color: '#EF4444', fontSize: '0.72rem', marginLeft: '4px' }}>({bs.dismissal || 'out'})</span>
                              ) : bs.dismissal?.toLowerCase().includes('retired hurt') && bs.playerId !== selectedInn.currentStrikerId && bs.playerId !== selectedInn.currentNonStrikerId ? (
                                <span style={{ color: '#38BDF8', fontSize: '0.72rem', marginLeft: '4px', fontWeight: 600 }}>(retired hurt)</span>
                              ) : (
                                <span style={{ color: '#10B981', fontSize: '0.72rem', marginLeft: '4px' }}>*</span>
                              )}
                              <button
                                type="button"
                                onClick={() => openRenameModal(bs.player?.id, bs.player?.name, bs.player?.jerseyNumber)}
                                title="Edit/correct player name without affecting scores"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#60A5FA',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  marginLeft: '6px',
                                  padding: '1px 3px',
                                }}
                              >
                                ✏️
                              </button>
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
                              <td style={{ padding: '6px 8px', fontWeight: 700 }}>
                                <span>{bw.player?.name || 'Bowler'}</span>
                                <button
                                  type="button"
                                  onClick={() => openRenameModal(bw.player?.id, bw.player?.name, bw.player?.jerseyNumber)}
                                  title="Edit/correct bowler name without affecting figures"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#60A5FA',
                                    cursor: 'pointer',
                                    fontSize: '0.72rem',
                                    marginLeft: '6px',
                                    padding: '1px 3px',
                                  }}
                                >
                                  ✏️
                                </button>
                              </td>
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
                          onClick={() => openRenameModal()}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid #3B82F6',
                            color: '#93C5FD',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Rename Any Player (Fix Typo)
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

                      {(selectedInn.inningsNumber <= 2 || selectedInn.inningsNumber % 2 === 0) && (() => {
                        const nextRoundNum = selectedInn.inningsNumber <= 2 ? 1 : Math.floor((selectedInn.inningsNumber - 3) / 2) + 2;
                        return (
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
                            ⚡ Start Official Super Over {nextRoundNum > 1 ? nextRoundNum : ''}
                          </button>
                        );
                      })()}

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

      {/* WIDE OPTIONS MODAL (MCC Law 22 Conformance) */}
      {showWideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', maxWidth: '480px', width: '100%', maxHeight: 'min(90vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.06)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FBBF24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🟡 Record Wide Delivery</span>
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                  MCC Law 22 • 1 Wide penalty + running / boundary extras
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWideModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '0.78rem', color: '#FDE68A' }}>
                💡 <strong>MCC Law 22:</strong> All runs scored from a wide ball (including the 1 penalty, running byes, and boundary 4) are scored as <strong>WIDES</strong> and charged to the bowler. Delivery must be re-bowled.
              </div>

              {/* Presets Grid */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '8px', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Select Wide Outcome
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {/* Standard 1 Wide */}
                  <button
                    type="button"
                    onClick={() => { setWideRuns(0); setWideIsBoundary(false); }}
                    style={{
                      background: wideRuns === 0 && !wideIsBoundary ? '#F59E0B' : '#141A26',
                      color: wideRuns === 0 && !wideIsBoundary ? '#000' : '#FFF',
                      border: wideRuns === 0 && !wideIsBoundary ? '2px solid #D97706' : '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>1 Wide (+1)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Standard wide • No running</div>
                  </button>

                  {/* 5 Wides (Boundary 4) */}
                  <button
                    type="button"
                    onClick={() => { setWideRuns(4); setWideIsBoundary(true); }}
                    style={{
                      background: wideRuns === 4 && wideIsBoundary ? '#F59E0B' : 'rgba(245, 158, 11, 0.12)',
                      color: wideRuns === 4 && wideIsBoundary ? '#000' : '#FBBF24',
                      border: wideRuns === 4 && wideIsBoundary ? '2px solid #D97706' : '1.5px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>🏏 5 Wides (Boundary)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Wide + 4 to boundary cushion</div>
                  </button>

                  {/* 2 Wides (1 Run) */}
                  <button
                    type="button"
                    onClick={() => { setWideRuns(1); setWideIsBoundary(false); }}
                    style={{
                      background: wideRuns === 1 && !wideIsBoundary ? '#F59E0B' : '#141A26',
                      color: wideRuns === 1 && !wideIsBoundary ? '#000' : '#FFF',
                      border: wideRuns === 1 && !wideIsBoundary ? '2px solid #D97706' : '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>2 Wides (+1 Run)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>1 run ran • Strike swaps</div>
                  </button>

                  {/* 3 Wides (2 Runs) */}
                  <button
                    type="button"
                    onClick={() => { setWideRuns(2); setWideIsBoundary(false); }}
                    style={{
                      background: wideRuns === 2 && !wideIsBoundary ? '#F59E0B' : '#141A26',
                      color: wideRuns === 2 && !wideIsBoundary ? '#000' : '#FFF',
                      border: wideRuns === 2 && !wideIsBoundary ? '2px solid #D97706' : '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>3 Wides (+2 Runs)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>2 runs ran • Strike stays</div>
                  </button>

                  {/* 4 Wides (3 Runs) */}
                  <button
                    type="button"
                    onClick={() => { setWideRuns(3); setWideIsBoundary(false); }}
                    style={{
                      background: wideRuns === 3 && !wideIsBoundary ? '#F59E0B' : '#141A26',
                      color: wideRuns === 3 && !wideIsBoundary ? '#000' : '#FFF',
                      border: wideRuns === 3 && !wideIsBoundary ? '2px solid #D97706' : '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>4 Wides (+3 Runs)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>3 runs ran • Strike swaps</div>
                  </button>

                  {/* Custom Extra Runs */}
                  <button
                    type="button"
                    onClick={() => { if (wideRuns <= 4 && !wideIsBoundary) setWideRuns(5); }}
                    style={{
                      background: (wideRuns > 4 || (wideRuns === 4 && !wideIsBoundary)) ? '#F59E0B' : '#141A26',
                      color: (wideRuns > 4 || (wideRuns === 4 && !wideIsBoundary)) ? '#000' : '#FFF',
                      border: (wideRuns > 4 || (wideRuns === 4 && !wideIsBoundary)) ? '2px solid #D97706' : '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>Other Extra Runs</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Custom runs taken</div>
                  </button>
                </div>
              </div>

              {/* Custom Number Input if selected */}
              {(wideRuns > 4 || (wideRuns === 4 && !wideIsBoundary)) && (
                <div style={{ background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                    Additional Runs Ran by Batters:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={wideRuns}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setWideRuns(val);
                      setWideIsBoundary(false);
                    }}
                    style={{ width: '100%', background: '#0D111A', border: '1px solid #2A364E', borderRadius: '6px', padding: '8px 12px', color: '#FFF', fontWeight: 800 }}
                  />
                </div>
              )}

              {/* Live Preview Card */}
              {(() => {
                const totalExtras = 1 + wideRuns;
                const willRotate = !wideIsBoundary && (wideRuns % 2 !== 0);
                return (
                  <div style={{ background: '#141A26', border: '1px solid #2A364E', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Total Team Runs Conceded:</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FBBF24', fontFamily: 'monospace' }}>
                        {totalExtras} {totalExtras === 1 ? 'Run' : 'Runs'} ({totalExtras} Wides)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>• <strong>1 Wide Penalty</strong> (1 run charged to {activeBowler?.name || 'Bowler'})</div>
                      {wideRuns > 0 && (
                        <div>• <strong>+{wideRuns} {wideIsBoundary ? 'Boundary Runs' : 'Running Extras'}</strong> scored as extras (NOT charged to {activeBowler?.name || 'Bowler'})</div>
                      )}
                      <div>• Strike: <strong style={{ color: willRotate ? '#34D399' : '#FBBF24' }}>{
                        willRotate
                          ? `🔄 Strike rotates (${activeStriker?.name || 'Striker'} and ${activeNonStriker?.name || 'Non-striker'} swap ends)`
                          : `Strike remains with ${activeStriker?.name || 'Striker'}`
                      }</strong></div>
                      <div style={{ color: '#F87171', marginTop: '4px', fontWeight: 700 }}>
                        🚫 Ball is illegal & must be re-bowled.
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dismissal on Wide Button */}
              <button
                type="button"
                onClick={() => {
                  setShowWideModal(false);
                  setDismissedId(currentInnings.currentStrikerId || '');
                  setWicketType('STUMPED');
                  setWicketRuns(wideRuns);
                  setShowWicketModal(true);
                }}
                style={{
                  width: '100%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid #EF4444',
                  color: '#FCA5A5',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>🔴</span>
                <span>Dismissal on this Wide? (Record Stumped or Run Out)</span>
              </button>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowWideModal(false)}
                style={{ flex: 1, background: '#141A26', border: '1px solid #2A364E', color: '#94A3B8', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const bName = activeBowler?.name || 'Bowler';
                  const sName = activeStriker?.name || 'Striker';
                  const totalWideExtras = 1 + wideRuns;

                  let commentary = `Wide ball. Delivery outside ${sName}'s reasonable hitting reach. 1 extra run conceded by ${bName} and delivery to be re-bowled.`;
                  if (wideIsBoundary || wideRuns === 4) {
                    commentary = `5 WIDES! Wild delivery from ${bName} beats ${sName} and keeper, racing all the way to the boundary for 5 extras!`;
                  } else if (wideRuns > 0) {
                    commentary = `WIDE + ${wideRuns} RUN${wideRuns > 1 ? 'S' : ''}! Delivery outside reach of ${sName}, batters complete ${wideRuns} extra run${wideRuns > 1 ? 's' : ''} (${totalWideExtras} total wides) conceded by ${bName}.`;
                  }

                  setShowWideModal(false);
                  handleRecordBall(wideRuns, 'WIDE', totalWideExtras, 0, 0, commentary);
                }}
                style={{ flex: 2, background: '#F59E0B', border: 'none', color: '#000', padding: '11px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.92rem' }}
              >
                Confirm {1 + wideRuns} {1 + wideRuns === 1 ? 'Wide' : 'Wides'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BYE / LEG BYE RECORDING MODAL */}
      {showByeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #3B82F6', borderRadius: '16px', maxWidth: '480px', width: '100%', maxHeight: 'min(90vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto', boxShadow: '0 8px 32px rgba(59, 130, 246, 0.25)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(59, 130, 246, 0.25)', background: 'rgba(59, 130, 246, 0.08)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#60A5FA', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡ Record {byeType === 'BYE' ? 'Byes' : 'Leg Byes'}</span>
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                  MCC Law 23 • Legal delivery • Extras to team • 0 charged to bowler
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowByeModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>
              {/* Type Switcher (BYE vs LEG_BYE) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setByeType('BYE')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    background: byeType === 'BYE' ? '#3B82F6' : '#141A26',
                    color: byeType === 'BYE' ? '#FFF' : '#94A3B8',
                    border: byeType === 'BYE' ? '2px solid #60A5FA' : '1px solid #2A364E',
                  }}
                >
                  BYES (Misses bat)
                </button>
                <button
                  type="button"
                  onClick={() => setByeType('LEG_BYE')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    background: byeType === 'LEG_BYE' ? '#3B82F6' : '#141A26',
                    color: byeType === 'LEG_BYE' ? '#FFF' : '#94A3B8',
                    border: byeType === 'LEG_BYE' ? '2px solid #60A5FA' : '1px solid #2A364E',
                  }}
                >
                  LEG BYES (Off pads/body)
                </button>
              </div>

              {/* Presets Grid */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '8px', color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Select {byeType === 'BYE' ? 'Bye' : 'Leg Bye'} Outcome
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {/* 4 Byes (Boundary) */}
                  <button
                    type="button"
                    onClick={() => setByeRunsCount(4)}
                    style={{
                      background: byeRunsCount === 4 ? '#3B82F6' : 'rgba(59, 130, 246, 0.15)',
                      color: '#FFF',
                      border: byeRunsCount === 4 ? '2px solid #93C5FD' : '1.5px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>🏏 4 {byeType === 'BYE' ? 'Byes' : 'Leg Byes'} (Boundary)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Ball beats keeper to fence • Strike stays</div>
                  </button>

                  {/* 1 Bye (+1) */}
                  <button
                    type="button"
                    onClick={() => setByeRunsCount(1)}
                    style={{
                      background: byeRunsCount === 1 ? '#3B82F6' : '#141A26',
                      color: '#FFF',
                      border: byeRunsCount === 1 ? '2px solid #93C5FD' : '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>1 {byeType === 'BYE' ? 'Bye' : 'Leg Bye'} (+1)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>1 single completed • Strike swaps</div>
                  </button>

                  {/* 2 Byes (+2 Runs) */}
                  <button
                    type="button"
                    onClick={() => setByeRunsCount(2)}
                    style={{
                      background: byeRunsCount === 2 ? '#3B82F6' : '#141A26',
                      color: '#FFF',
                      border: byeRunsCount === 2 ? '2px solid #93C5FD' : '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>2 {byeType === 'BYE' ? 'Byes' : 'Leg Byes'} (+2 Runs)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>2 runs ran • Strike stays</div>
                  </button>

                  {/* 3 Byes (+3 Runs) */}
                  <button
                    type="button"
                    onClick={() => setByeRunsCount(3)}
                    style={{
                      background: byeRunsCount === 3 ? '#3B82F6' : '#141A26',
                      color: '#FFF',
                      border: byeRunsCount === 3 ? '2px solid #93C5FD' : '1px solid #2A364E',
                      borderRadius: '8px',
                      padding: '12px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>3 {byeType === 'BYE' ? 'Byes' : 'Leg Byes'} (+3 Runs)</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>3 runs ran • Strike swaps</div>
                  </button>
                </div>
              </div>

              {/* Summary Card */}
              <div style={{ background: '#141A26', border: '1px solid #2A364E', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Total Team Runs:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#60A5FA', fontFamily: 'monospace' }}>
                    +{byeRunsCount} {byeRunsCount === 1 ? 'Run' : 'Runs'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>• <strong>+{byeRunsCount} {byeType === 'BYE' ? 'Byes' : 'Leg Byes'}</strong> added to team total and extras</div>
                  <div>• <strong>0 runs</strong> debited to bowler ({activeBowler?.name || 'Bowler'}) under MCC Law 23</div>
                  <div>• Legal delivery: <strong>Yes</strong> (counts towards the balls in the over)</div>
                  <div>• Batter on Strike after this: <strong>{
                    (byeRunsCount % 2 === 1)
                      ? `${activeNonStriker?.name || 'Non-Striker'} (Strike swapped)`
                      : `${activeStriker?.name || 'Striker'} (Strike retained)`
                  }</strong></div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowByeModal(false)}
                style={{ flex: 1, background: '#141A26', border: '1px solid #2A364E', color: '#94A3B8', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const bName = activeBowler?.name || 'Bowler';
                  const sName = activeStriker?.name || 'Striker';

                  let commentary = `${byeRunsCount} ${byeType === 'BYE' ? 'BYE' : 'LEG BYE'}${byeRunsCount > 1 ? 'S' : ''}. Delivery from ${bName} misses bat, batters complete ${byeRunsCount} extra run${byeRunsCount > 1 ? 's' : ''}.`;
                  if (byeRunsCount === 4) {
                    commentary = `4 ${byeType === 'BYE' ? 'BYES' : 'LEG BYES'}! Ball beats ${sName} and wicketkeeper, racing across the boundary rope for 4 extras!`;
                  }

                  setShowByeModal(false);
                  handleRecordBall(
                    0,
                    byeType,
                    byeRunsCount,
                    byeType === 'BYE' ? byeRunsCount : 0,
                    byeType === 'LEG_BYE' ? byeRunsCount : 0,
                    commentary
                  );
                }}
                style={{ flex: 2, background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '0.92rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)' }}
              >
                Confirm {byeRunsCount} {byeType === 'BYE' ? (byeRunsCount === 1 ? 'Bye' : 'Byes') : (byeRunsCount === 1 ? 'Leg Bye' : 'Leg Byes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NO-BALL RECORDING MODAL */}
      {showNoBallModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F97316', borderRadius: '16px', maxWidth: '460px', width: '100%', maxHeight: 'min(88vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto', boxShadow: '0 8px 32px rgba(249, 115, 22, 0.25)' }}>
            {/* Header (Fixed) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(249, 115, 22, 0.25)', background: 'rgba(249, 115, 22, 0.05)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FB923C', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️ Record No-Ball Delivery</span>
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                  Automatic +1 No-ball penalty extra + any runs scored
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNoBallModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>

            {/* CPL Official Rules Notice */}
            <div style={{ background: 'rgba(249, 115, 22, 0.12)', border: '1px solid rgba(249, 115, 22, 0.35)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.78rem', color: '#FED7AA' }}>
              ⚡ <strong>CPL 2026 Rule:</strong> Any delivery above chest height or chucking/illegal action will be called a No Ball (+1 run & extra delivery to be re-bowled).
            </div>

            {/* Reason / Infraction Switcher */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: '#CBD5E1' }}>
                No-Ball Reason / Infraction
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setNbReason('CHEST_HEIGHT')}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    background: nbReason === 'CHEST_HEIGHT' ? '#F97316' : '#141A26',
                    color: nbReason === 'CHEST_HEIGHT' ? '#000' : '#CBD5E1',
                    border: nbReason === 'CHEST_HEIGHT' ? '1.5px solid #FB923C' : '1px solid #2A364E',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <span>📏 Chest Height</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.85 }}>CPL Rule</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNbReason('CHUCKING')}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    background: nbReason === 'CHUCKING' ? '#F97316' : '#141A26',
                    color: nbReason === 'CHUCKING' ? '#000' : '#CBD5E1',
                    border: nbReason === 'CHUCKING' ? '1.5px solid #FB923C' : '1px solid #2A364E',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <span>🚫 Chucking</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.85 }}>Illegal Action</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNbReason('OVERSTEP')}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    background: nbReason === 'OVERSTEP' ? '#F97316' : '#141A26',
                    color: nbReason === 'OVERSTEP' ? '#000' : '#CBD5E1',
                    border: nbReason === 'OVERSTEP' ? '1.5px solid #FB923C' : '1px solid #2A364E',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <span>🦶 Overstep</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.85 }}>Crease Line</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNbReason('FULL_TOSS')}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    background: nbReason === 'FULL_TOSS' ? '#F97316' : '#141A26',
                    color: nbReason === 'FULL_TOSS' ? '#000' : '#CBD5E1',
                    border: nbReason === 'FULL_TOSS' ? '1.5px solid #FB923C' : '1px solid #2A364E',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <span>🚀 Full Toss</span>
                  <span style={{ fontSize: '0.62rem', opacity: 0.85 }}>Beamer</span>
                </button>
              </div>
            </div>

            {/* Run Origin Switcher */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: '#CBD5E1' }}>
                How Were The Runs Scored?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setNbType('BAT'); setNbRuns(0); }}
                  style={{
                    padding: '9px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: nbType === 'BAT' ? '#F97316' : '#141A26',
                    color: nbType === 'BAT' ? '#000' : '#CBD5E1',
                    border: nbType === 'BAT' ? '1.5px solid #FB923C' : '1px solid #2A364E',
                  }}
                >
                  🏏 Off The Bat
                </button>
                <button
                  type="button"
                  onClick={() => { setNbType('BYE'); setNbRuns(1); }}
                  style={{
                    padding: '9px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: nbType === 'BYE' ? '#F97316' : '#141A26',
                    color: nbType === 'BYE' ? '#000' : '#CBD5E1',
                    border: nbType === 'BYE' ? '1.5px solid #FB923C' : '1px solid #2A364E',
                  }}
                >
                  🏃 Byes (NB+B)
                </button>
                <button
                  type="button"
                  onClick={() => { setNbType('LEG_BYE'); setNbRuns(1); }}
                  style={{
                    padding: '9px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: nbType === 'LEG_BYE' ? '#F97316' : '#141A26',
                    color: nbType === 'LEG_BYE' ? '#000' : '#CBD5E1',
                    border: nbType === 'LEG_BYE' ? '1.5px solid #FB923C' : '1px solid #2A364E',
                  }}
                >
                  🛡️ Leg Byes (NB+LB)
                </button>
              </div>
            </div>

            {/* Run Selection Buttons */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: '#CBD5E1' }}>
                {nbType === 'BAT' ? 'Runs Hit by Striker' : (nbType === 'BYE' ? 'Completed Bye Runs' : 'Completed Leg Bye Runs')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: nbType === 'BAT' ? 'repeat(6, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
                {(nbType === 'BAT' ? [0, 1, 2, 3, 4, 6] : [1, 2, 3, 4]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNbRuns(r)}
                    style={{
                      padding: '12px 0',
                      borderRadius: '8px',
                      fontWeight: 900,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      background: nbRuns === r ? '#FB923C' : '#141A26',
                      color: nbRuns === r ? '#000' : '#FFF',
                      border: nbRuns === r ? '2px solid #F97316' : '1px solid #2A364E',
                    }}
                  >
                    {r === 0 ? '0 (Dot)' : `+${r}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown & Preview Card */}
            {(() => {
              const preview = calculateDeliveryRuns({
                runs: nbType === 'BAT' ? nbRuns : 0,
                extraType: 'NO_BALL',
                extras: 1,
                byeRuns: nbType === 'BYE' ? nbRuns : 0,
                legByeRuns: nbType === 'LEG_BYE' ? nbRuns : 0,
              });
              return (
                <div style={{ background: '#141A26', border: '1px solid #2A364E', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Total Team Runs:</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FB923C', fontFamily: 'monospace' }}>
                      {preview.totalRuns} Run{preview.totalRuns !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>• Reason: <strong style={{ color: '#FB923C' }}>{
                      nbReason === 'CHEST_HEIGHT' ? 'Above Chest Height (CPL Rule)' :
                      nbReason === 'CHUCKING' ? 'Chucking / Illegal Action (CPL Rule)' :
                      nbReason === 'OVERSTEP' ? 'Crease Overstep (Missing Mark)' :
                      nbReason === 'FULL_TOSS' ? 'Waist-High Full Toss (Beamer)' : 'Bouncer Height Violation'
                    }</strong></div>
                    <div>• <strong>1 No-Ball Penalty (+1 Run)</strong> added to Extras & Bowler</div>
                    {nbType === 'BAT' && nbRuns > 0 && (
                      <div>• <strong>+{nbRuns} Runs</strong> credited to Striker ({activeStriker?.name || 'Striker'}) & Bowler</div>
                    )}
                    {nbType === 'BYE' && nbRuns > 0 && (
                      <div>• <strong>+{nbRuns} Byes</strong> added to Extras (NOT charged to Bowler under MCC rules)</div>
                    )}
                    {nbType === 'LEG_BYE' && nbRuns > 0 && (
                      <div>• <strong>+{nbRuns} Leg Byes</strong> added to Extras (NOT charged to Bowler under MCC rules)</div>
                    )}
                    <div style={{ color: '#F87171', marginTop: '6px', fontWeight: 800 }}>
                      🚫 Extra delivery to be re-bowled (+1 penalty run).
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => {
                setShowNoBallModal(false);
                setIsWicketOnNoBall(true);
                setWicketType('RUN_OUT');
                setShowWicketModal(true);
              }}
              style={{
                width: '100%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                padding: '10px 12px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>🔴</span>
              <span>Dismissal on this No-Ball? (Record Wicket + No-Ball)</span>
            </button>

            </div>

            {/* Footer (Fixed) */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowNoBallModal(false)}
                style={{ flex: 1, background: '#141A26', border: '1px solid #2A364E', color: '#94A3B8', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmNoBall}
                style={{ flex: 2, background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)' }}
              >
                Confirm No-Ball
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WICKET / RETIRED HURT RECORDING MODAL */}
      {showWicketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{
            background: '#10141E',
            border: wicketType === 'RETIRED_HURT' ? '1.5px solid #0284C7' : '1.5px solid #EF4444',
            borderRadius: '16px',
            maxWidth: '450px',
            width: '100%',
            maxHeight: 'min(88vh, calc(100dvh - 32px))',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            margin: 'auto'
          }}>
            {/* Header (Fixed) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: `1px solid ${wicketType === 'RETIRED_HURT' ? 'rgba(2, 132, 199, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`, background: wicketType === 'RETIRED_HURT' ? 'rgba(2, 132, 199, 0.08)' : 'rgba(239, 68, 68, 0.05)', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: wicketType === 'RETIRED_HURT' ? '#38BDF8' : '#EF4444', margin: 0 }}>
                {wicketType === 'RETIRED_HURT' ? '🏥 Record Batter Retired Hurt' : '🔴 Record Wicket Dismissal'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setWicketModalError(null);
                  setShowWicketModal(false);
                }}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>

            {/* Mode Switch Tabs: Wicket vs Retired Hurt */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setWicketType(isFreeHitActive ? 'RUN_OUT' : 'CAUGHT');
                  setRetHurtWithoutFacingBall(false);
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  border: wicketType !== 'RETIRED_HURT' ? '1.5px solid #EF4444' : '1px solid #2A364E',
                  background: wicketType !== 'RETIRED_HURT' ? 'rgba(239, 68, 68, 0.2)' : '#141A26',
                  color: wicketType !== 'RETIRED_HURT' ? '#FCA5A5' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>🔴</span>
                <span>Wicket (Out)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWicketType('RETIRED_HURT');
                  setRetHurtWithoutFacingBall(true);
                  setIsWicketOnNoBall(false);
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  border: wicketType === 'RETIRED_HURT' ? '1.5px solid #0284C7' : '1px solid #2A364E',
                  background: wicketType === 'RETIRED_HURT' ? 'rgba(2, 132, 199, 0.25)' : '#141A26',
                  color: wicketType === 'RETIRED_HURT' ? '#38BDF8' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>🏥</span>
                <span>Retired Hurt</span>
              </button>
            </div>

            {wicketModalError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
                {wicketModalError}
              </div>
            )}

            {isPreviousDeliveryNoBall && wicketType !== 'RETIRED_HURT' && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1.5px solid #10B981',
                  color: '#6EE7B7',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  fontSize: '0.82rem',
                  lineHeight: 1.4,
                }}
              >
                ✓ <strong>RE-BOWLED DELIVERY:</strong> Previous delivery was a No-Ball. Batters <strong>CAN be dismissed</strong> by any method (Bowled, Caught, LBW, Stumped, Run Out). This wicket is <strong>100% VALID</strong>.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                  {wicketType === 'RETIRED_HURT' ? 'Retiring Batter *' : 'Dismissed Batter *'}
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
                  {wicketType === 'RETIRED_HURT' ? 'Status Type *' : 'Wicket Type *'}
                </label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                  style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                >
                  {wicketType === 'RETIRED_HURT' ? (
                    <>
                      <option value="RETIRED_HURT">🏥 Retired Hurt (Eligible to return & resume batting)</option>
                      <option value="RETIRED_OUT">⛔ Retired Out (Treated as dismissed)</option>
                    </>
                  ) : (
                    <>
                      <option value="CAUGHT">Caught</option>
                      <option value="BOWLED">Bowled</option>
                      <option value="LBW">LBW</option>
                      <option value="RUN_OUT">Run Out</option>
                      <option value="STUMPED">Stumped</option>
                      <option value="HIT_WICKET">Hit Wicket</option>
                      <option value="HIT_BALL_TWICE">Hit Ball Twice</option>
                      <option value="OBSTRUCTING_FIELD">Obstructing The Field</option>
                      <option value="RETIRED_HURT">Retired Hurt</option>
                      <option value="RETIRED_OUT">Retired Out</option>
                      <option value="OTHER">Other</option>
                    </>
                  )}
                </select>
              </div>

              {wicketType === 'RETIRED_HURT' && (
                <div
                  style={{
                    background: 'rgba(2, 132, 199, 0.12)',
                    border: '1.5px solid #0284C7',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#BAE6FD',
                    fontSize: '0.8rem',
                    lineHeight: 1.45,
                  }}
                >
                  🏥 <strong>NOT A WICKET:</strong> Under MCC Law 25.4, Retired Hurt is <strong>NOT a wicket lost</strong>. Total team wickets will not increase, bowler will not be credited with a wicket, and this batter remains eligible to return and resume batting later.
                </div>
              )}

              {/* Retired Without Facing Ball Switch */}
              {wicketType === 'RETIRED_HURT' && (
                <div
                  style={{
                    background: 'rgba(2, 132, 199, 0.08)',
                    border: '1.5px solid #0284C7',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⏱️</span>
                      <span>Retired Without Facing Ball?</span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: '2px', lineHeight: 1.35 }}>
                      {dismissedId === currentInnings?.currentNonStrikerId
                        ? 'Non-striker retirement does not count as a ball bowled.'
                        : retHurtWithoutFacingBall
                          ? 'Does NOT calculate a ball (overs & bowler balls unchanged, 0 balls added to batter).'
                          : 'Calculates 1 ball faced by striker during this delivery.'}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="ret-hurt-without-ball-toggle"
                    checked={dismissedId === currentInnings?.currentNonStrikerId || retHurtWithoutFacingBall}
                    disabled={dismissedId === currentInnings?.currentNonStrikerId}
                    onChange={(e) => setRetHurtWithoutFacingBall(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: '#0284C7', cursor: dismissedId === currentInnings?.currentNonStrikerId ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                  />
                </div>
              )}

              {/* Delivery is a No-Ball Switch */}
              {wicketType !== 'RETIRED_HURT' && (
                <div style={{ background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#CBD5E1' }}>
                      Delivery is a No-Ball?
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      +1 penalty extra to batting team (+ extra delivery)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isWicketOnNoBall}
                    onChange={(e) => setIsWicketOnNoBall(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#F97316', cursor: 'pointer' }}
                  />
                </div>
              )}

              {/* RUN OUT: Completed Runs Selector */}
              {wicketType === 'RUN_OUT' && (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#F59E0B', marginBottom: '8px' }}>
                    🏃 Runs Completed Before Run Out
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {[0, 1, 2, 3, 4].map((r) => (
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

              {availableBatters.filter((p: any) => p.id !== (dismissedId || currentInnings?.currentStrikerId) && !isPlayerDismissedInInnings(p.id)).length > 0 && (
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
                    {availableBatters
                      .filter((p: any) => p.id !== (dismissedId || currentInnings?.currentStrikerId) && !isPlayerDismissedInInnings(p.id))
                      .map((p: any) => {
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

            </div>

            {/* Footer (Fixed) */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  setWicketModalError(null);
                  setShowWicketModal(false);
                }}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordWicket}
                disabled={isPending}
                style={{ flex: 2, background: wicketType === 'RETIRED_HURT' ? '#0284C7' : '#EF4444', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 800, cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                {wicketType === 'RETIRED_HURT' ? 'Confirm Retired Hurt (Leaves Field)' : 'Confirm Wicket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOWLER SELECTOR MODAL */}
      {showBowlerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', maxWidth: '460px', width: '100%', maxHeight: 'min(88vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto' }}>
            {/* Header (Fixed) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.05)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FBBF24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{(currentInnings?.balls || 0) > 0 ? '🚑 Mid-Over Bowler Replacement (Injury)' : '🎯 Select / Change Active Bowler'}</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '2px 0 0' }}>
                  {(currentInnings?.balls || 0) > 0
                    ? `Over ${currentInnings.overs}.${currentInnings.balls} in progress (${matchBallsPerOver - currentInnings.balls} ball${(matchBallsPerOver - currentInnings.balls) === 1 ? '' : 's'} remaining). Replacement bowler will complete this over (MCC Law 17.8).`
                    : `Bowling Team: ${currentInnings?.bowlingTeam?.name} (Max ${maxOversPerBowler} over${maxOversPerBowler === 1 ? '' : 's'} per bowler)`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBowlerModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>
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
                  const legalBallsBowled = (bScore?.overs || 0) * matchBallsPerOver + (bScore?.balls || 0);
                  const maxBallsAllowed = maxOversPerBowler * matchBallsPerOver;
                  const isMaxReached = legalBallsBowled >= maxBallsAllowed;
                  const isCurrent = p.id === currentInnings?.currentBowlerId;
                  const bowledInPrevOver = previousOverBowlerIds.has(p.id);
                  const isMidOver = (currentInnings?.balls || 0) > 0;
                  const isDisabled = isMaxReached || bowledInPrevOver || (isMidOver && isCurrent);
                  const oversText = bScore ? `${bScore.overs}.${bScore.balls} ov (${bScore.wickets}w, ${bScore.runsConceded}r)` : 'Yet to bowl';
                  
                  let statusTag = '';
                  if (isMidOver && isCurrent) statusTag = '🚑 [INCAPACITATED / CURRENT BOWLER]';
                  else if (bowledInPrevOver) statusTag = '⛔ [BOWLED PREVIOUS OVER]';
                  else if (isMaxReached) statusTag = `⛔ [MAX ${maxOversPerBowler} OVER QUOTA REACHED]`;
                  else if (isCurrent) statusTag = '★ (Current)';

                  return (
                    <option key={p.id} value={p.id} disabled={isDisabled}>
                      {p.name} — {oversText} {statusTag}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Footer (Fixed) */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowBowlerModal(false)}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangeBowler}
                disabled={isPending || !selectedBowlerId}
                style={{
                  flex: 2,
                  background: (currentInnings?.balls || 0) > 0 ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  border: 'none',
                  color: (currentInnings?.balls || 0) > 0 ? '#FFF' : '#000',
                  padding: '11px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: isPending || !selectedBowlerId ? 'not-allowed' : 'pointer',
                }}
              >
                {(currentInnings?.balls || 0) > 0 ? '🚑 Confirm Mid-Over Replacement' : 'Set Bowler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATTER SELECTOR MODAL */}
      {showBatterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', maxWidth: '460px', width: '100%', maxHeight: 'min(88vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto' }}>
            {/* Header (Fixed) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.05)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FBBF24', margin: 0 }}>
                  🏏 Set / Change {targetRole === 'striker' ? 'Striker (On Strike)' : 'Non-Striker'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '2px 0 0' }}>
                  Batting Team: <strong style={{ color: '#FFF' }}>{currentInnings?.battingTeam?.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatterModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>
              {(() => {
                const eligibleBatters = battingSquad.filter((p: any) => !isPlayerDismissedInInnings(p.id));
                const dismissedBatters = battingSquad.filter((p: any) => isPlayerDismissedInInnings(p.id));
                const isSelectedOut = Boolean(selectedBatterId && isPlayerDismissedInInnings(selectedBatterId));

                return (
                  <>
                    {isSelectedOut && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', lineHeight: 1.4 }}>
                        ⛔ <strong>Player Already Dismissed:</strong> This batter is OUT and cannot bat again in this innings (MCC Cricket Law 25). Please select an eligible incoming batter.
                      </div>
                    )}

                    {eligibleBatters.length === 0 && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', lineHeight: 1.4 }}>
                        ⚠️ <strong>No Eligible Batters Remaining:</strong> All players in the batting squad have already batted and been dismissed (Team All Out / Wicket Limit reached).
                      </div>
                    )}

                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1' }}>
                          Select Batter ({eligibleBatters.length} eligible)
                        </label>
                        {dismissedBatters.length > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 700 }}>
                            {dismissedBatters.length} player{dismissedBatters.length > 1 ? 's' : ''} out
                          </span>
                        )}
                      </div>

                      <select
                        value={selectedBatterId}
                        onChange={(e) => setSelectedBatterId(e.target.value)}
                        style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                      >
                        <option value="">Select Batter...</option>
                        <optgroup label="✓ AVAILABLE / ELIGIBLE BATTERS">
                          {eligibleBatters.map((p: any) => {
                            const bScore = currentInnings?.battingScores?.find((b: any) => b.playerId === p.id);
                            const isStriker = p.id === currentInnings?.currentStrikerId;
                            const isNonStriker = p.id === currentInnings?.currentNonStrikerId;
                            const isRetHurt = bScore?.dismissal?.toLowerCase().includes('retired hurt');

                            let tag = 'Yet to bat';
                            if (isStriker) tag = 'Currently Striker';
                            else if (isNonStriker) tag = 'Currently Non-Striker';
                            else if (isRetHurt) tag = `🏥 Retired Hurt (${bScore.runs}* off ${bScore.balls}b) — Resume Batting`;
                            else if (bScore && bScore.balls > 0) tag = `${bScore.runs}* (${bScore.balls}b)`;

                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} [{tag}]
                              </option>
                            );
                          })}
                        </optgroup>

                        {dismissedBatters.length > 0 && (
                          <optgroup label="⛔ DISMISSED BATTERS (OUT — CANNOT BAT AGAIN)">
                            {dismissedBatters.map((p: any) => {
                              const bScore = currentInnings?.battingScores?.find((b: any) => b.playerId === p.id);
                              const runs = bScore?.runs ?? 0;
                              const balls = bScore?.balls ?? 0;
                              const dismissal = bScore?.dismissal || 'Out';
                              return (
                                <option key={p.id} value={p.id} disabled style={{ color: '#94A3B8', background: '#0D111A' }}>
                                  ❌ {p.name} — OUT ({dismissal} • {runs}r off {balls}b)
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer (Fixed) */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowBatterModal(false)}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSwitchBatter}
                disabled={!selectedBatterId || isPlayerDismissedInInnings(selectedBatterId) || isPending}
                style={{
                  flex: 2,
                  background: (!selectedBatterId || isPlayerDismissedInInnings(selectedBatterId) || isPending) ? '#2A364E' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  border: 'none',
                  color: (!selectedBatterId || isPlayerDismissedInInnings(selectedBatterId) || isPending) ? '#64748B' : '#000',
                  padding: '11px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: (!selectedBatterId || isPlayerDismissedInInnings(selectedBatterId) || isPending) ? 'not-allowed' : 'pointer',
                }}
              >
                Confirm Batter
              </button>
            </div>
          </div>
        </div>
      )}
      {showCompleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #10B981', borderRadius: '16px', maxWidth: '460px', width: '100%', maxHeight: 'min(88vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto' }}>
            {/* Header (Fixed) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(16, 185, 129, 0.25)', background: 'rgba(16, 185, 129, 0.05)', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34D399', margin: 0 }}>
                🏆 Finalize & Complete Match
              </h3>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
            </div>

            {/* Footer (Fixed) */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteMatch}
                disabled={isPending}
                style={{ flex: 2, background: '#10B981', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 800, cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                Declare Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BALL MODAL */}
      {editingBall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', maxWidth: '460px', width: '100%', maxHeight: 'min(88vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto' }}>
            {/* Header (Fixed) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.05)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FBBF24', margin: 0 }}>
                  ✏️ Edit Delivery (Over {editingBall.overNumber + 1}, Ball {editingBall.ballNumber})
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                  {editingBall.batsman?.name || 'Batter'} vs {editingBall.bowler?.name || 'Bowler'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBall(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>

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
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditExtras(val);
                      if (editExtraType === 'BYE') setEditByeRuns(val);
                      if (editExtraType === 'LEG_BYE') setEditLegByeRuns(val);
                    }}
                    style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                  />
                  {editExtraType === 'WIDE' && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setEditExtras(w)}
                          style={{
                            padding: '5px 10px',
                            background: editExtras === w ? '#F59E0B' : '#141A26',
                            color: editExtras === w ? '#000' : '#FFF',
                            border: editExtras === w ? '1.5px solid #F59E0B' : '1px solid #2A364E',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {w === 1 ? '1 Wide' : w === 5 ? '5 WD (Boundary)' : `${w} Wides`}
                        </button>
                      ))}
                    </div>
                  )}
                  {(editExtraType === 'BYE' || editExtraType === 'LEG_BYE') && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setEditExtras(r);
                            if (editExtraType === 'BYE') setEditByeRuns(r);
                            if (editExtraType === 'LEG_BYE') setEditLegByeRuns(r);
                          }}
                          style={{
                            padding: '5px 10px',
                            background: editExtras === r ? '#3B82F6' : '#141A26',
                            color: editExtras === r ? '#FFF' : '#94A3B8',
                            border: editExtras === r ? '1.5px solid #60A5FA' : '1px solid #2A364E',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {r === 4 ? `4 ${editExtraType === 'BYE' ? 'Byes' : 'Leg Byes'} (Boundary)` : `${r} ${editExtraType === 'BYE' ? (r === 1 ? 'Bye' : 'Byes') : (r === 1 ? 'Leg Bye' : 'Leg Byes')}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editExtraType === 'NO_BALL' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                      Bye Runs (on NB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={editByeRuns}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditByeRuns(val);
                        if (val > 0) setEditLegByeRuns(0);
                      }}
                      style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#CBD5E1' }}>
                      Leg Bye Runs (on NB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={editLegByeRuns}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditLegByeRuns(val);
                        if (val > 0) setEditByeRuns(0);
                      }}
                      style={{ width: '100%', background: '#141A26', border: '1px solid #2A364E', borderRadius: '8px', padding: '10px', color: '#FFF' }}
                    />
                  </div>
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
                    <option value="HIT_BALL_TWICE">Hit Ball Twice</option>
                    <option value="OBSTRUCTING_FIELD">Obstructing The Field</option>
                    <option value="RETIRED_OUT">Retired Out</option>
                  </select>
                </div>
              )}
            </div>

            </div>

            {/* Footer (Fixed) */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleDeleteBall}
                disabled={isEditingBallSaving}
                style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                🗑️ Delete Ball
              </button>
              <button
                type="button"
                onClick={handleSaveEditedBall}
                disabled={isEditingBallSaving}
                style={{ flex: 2, background: '#F59E0B', border: 'none', color: '#000', padding: '11px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
              >
                {isEditingBallSaving ? 'Saving...' : '💾 Save Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPER OVER SETUP MODAL */}
      {showSuperOverModal && (() => {
        const existingSO = (match.innings || []).filter((i: any) => i.inningsNumber >= 3);
        const nextSORound = existingSO.length > 0
          ? Math.floor((Math.max(...existingSO.map((i: any) => i.inningsNumber)) - 3) / 2) + 2
          : 1;
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #F59E0B', borderRadius: '16px', maxWidth: '460px', width: '100%', maxHeight: 'min(88vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)' }}>
            {/* Header (Fixed) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.05)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FBBF24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡ Launch Super Over {nextSORound > 1 ? `${nextSORound} (Round ${nextSORound})` : 'Tie-Breaker'}</span>
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                  1 Over per team • 2 Wickets maximum per innings
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSuperOverModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>

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

            </div>

            {/* Footer (Fixed) */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowSuperOverModal(false)}
                disabled={isEditingBallSaving}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartSuperOver}
                disabled={isEditingBallSaving}
                style={{ flex: 2, background: '#F59E0B', border: 'none', color: '#000', padding: '11px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}
              >
                {isEditingBallSaving ? 'Starting...' : `⚡ Begin Super Over ${nextSORound > 1 ? nextSORound : ''} →`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* EDIT MATCH RULES (OVERS & BALLS PER OVER) MODAL */}
      {showRulesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #3B82F6', borderRadius: '16px', maxWidth: '460px', width: '100%', maxHeight: 'min(88vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto', boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)' }}>
            {/* Header (Fixed) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(59, 130, 246, 0.25)', background: 'rgba(59, 130, 246, 0.05)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#93C5FD', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚙️ Edit Match Overs & Balls</span>
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                  Dynamically update match overs and balls per over during live play
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>
              {/* OVERS PER INNINGS SECTION */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#CBD5E1' }}>
                    Total Overs Per Innings
                  </label>
                  <span style={{ fontSize: '0.82rem', color: '#60A5FA', fontFamily: 'monospace', fontWeight: 800 }}>
                    {rulesOvers} Overs
                  </span>
                </div>

                <input
                  type="number"
                  min={1}
                  max={100}
                  value={rulesOvers}
                  onChange={(e) => setRulesOvers(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                  style={{
                    width: '100%',
                    background: '#141A26',
                    border: '1.5px solid #2A364E',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginBottom: '10px',
                  }}
                />

                {/* Preset Overs Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[5, 6, 8, 10, 12, 15, 20, 50].map((ov) => {
                    const isSelected = rulesOvers === ov;
                    return (
                      <button
                        key={ov}
                        type="button"
                        onClick={() => setRulesOvers(ov)}
                        style={{
                          background: isSelected ? '#3B82F6' : '#141A26',
                          color: isSelected ? '#FFF' : '#94A3B8',
                          border: isSelected ? '1px solid #3B82F6' : '1px solid #2A364E',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {ov} Ov
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BALLS PER OVER SECTION */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#CBD5E1' }}>
                    Balls Per Over
                  </label>
                  <span style={{ fontSize: '0.82rem', color: '#60A5FA', fontFamily: 'monospace', fontWeight: 800 }}>
                    {rulesBallsPerOver} Balls/Over
                  </span>
                </div>

                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rulesBallsPerOver}
                  onChange={(e) => setRulesBallsPerOver(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
                  style={{
                    width: '100%',
                    background: '#141A26',
                    border: '1.5px solid #2A364E',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#FFF',
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginBottom: '10px',
                  }}
                />

                {/* Preset Balls Chips */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[4, 5, 6, 8].map((b) => {
                    const isSelected = rulesBallsPerOver === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setRulesBallsPerOver(b)}
                        style={{
                          flex: 1,
                          background: isSelected ? '#3B82F6' : '#141A26',
                          color: isSelected ? '#FFF' : '#94A3B8',
                          border: isSelected ? '1px solid #3B82F6' : '1px solid #2A364E',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {b} Balls
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notice */}
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.78rem', color: '#93C5FD', lineHeight: 1.45 }}>
                💡 <strong>Live Impact:</strong> Changing these values immediately updates the required over limit, run rates, balls remaining, and public scorecards for this match.
              </div>
            </div>

            {/* Footer (Fixed) */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                disabled={isRulesSaving}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveMatchRules(rulesOvers, rulesBallsPerOver)}
                disabled={isRulesSaving}
                style={{ flex: 2, background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
              >
                {isRulesSaving ? 'Saving...' : '💾 Save Match Rules'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME PLAYER (CORRECT NAME WITHOUT AFFECTING SCORES) MODAL */}
      {showRenameModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#10141E', border: '1.5px solid #3B82F6', borderRadius: '16px', maxWidth: '440px', width: '100%', maxHeight: 'min(88vh, calc(100dvh - 32px))', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto', boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid rgba(59, 130, 246, 0.25)', background: 'rgba(59, 130, 246, 0.05)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#93C5FD', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✏️ Correct Player Name</span>
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                  Fix spelling or names without resetting runs, balls, or wickets
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="scoring-modal-card" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>
              {/* Player Selector if needed */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Select Player To Rename
                </label>
                <select
                  value={renamePlayerId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setRenamePlayerId(pid);
                    const found = allKnownPlayers.find((p: any) => p.id === pid);
                    if (found) {
                      setRenamePlayerName(found.name || '');
                      setRenamePlayerJersey(found.jerseyNumber ?? '');
                    }
                  }}
                  style={{
                    width: '100%',
                    background: '#141A26',
                    border: '1.5px solid #2A364E',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  <option value="">-- Choose Player --</option>
                  <optgroup label={`${match.teamA?.name || 'Team A'}`}>
                    {rawTeamAPlayers.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={`${match.teamB?.name || 'Team B'}`}>
                    {rawTeamBPlayers.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Name Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Player Name *
                </label>
                <input
                  type="text"
                  value={renamePlayerName}
                  onChange={(e) => setRenamePlayerName(e.target.value)}
                  placeholder="e.g. Wanindu Hasaranga"
                  style={{
                    width: '100%',
                    background: '#141A26',
                    border: '1.5px solid #2A364E',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                  }}
                />
              </div>

              {/* Jersey Number */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Jersey Number (Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={renamePlayerJersey}
                  onChange={(e) => setRenamePlayerJersey(e.target.value)}
                  placeholder="e.g. 49"
                  style={{
                    width: '100%',
                    background: '#141A26',
                    border: '1.5px solid #2A364E',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              {/* Notice */}
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.78rem', color: '#6EE7B7', lineHeight: 1.45 }}>
                ✓ <strong>100% Score-Safe:</strong> All batting runs, balls faced, strike rates, overs bowled, wickets, and maidens remain completely untouched and attached to this player.
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#0D111A', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                disabled={isRenamingSaving}
                style={{ flex: 1, background: '#1E2638', border: 'none', color: '#FFF', padding: '11px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRenamePlayer}
                disabled={isRenamingSaving || !renamePlayerId || !renamePlayerName.trim()}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  border: 'none',
                  color: '#FFF',
                  padding: '11px',
                  borderRadius: '8px',
                  fontWeight: 900,
                  cursor: (isRenamingSaving || !renamePlayerId || !renamePlayerName.trim()) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                }}
              >
                {isRenamingSaving ? 'Saving...' : '💾 Update Player Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
