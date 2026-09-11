/**
 * Deterministic Local Match Projection & Replay Model
 * 
 * Computes: localProjection = authoritativeSnapshot + pendingOperations
 * Ensures the UI always reflects the combined state without accumulating state drift.
 */

import {
  calculateDeliveryRuns,
  isBowlerCreditedDismissal,
  getInningsWicketLimit,
} from '../scoring/scoring-rules';
import { OfflineOperation } from './offline-db';

export function computeLocalProjection(
  authoritativeSnapshot: any,
  pendingOperations: OfflineOperation[]
): any {
  if (!authoritativeSnapshot) return null;

  // Deep clone the authoritative snapshot as the baseline
  const projected = JSON.parse(JSON.stringify(authoritativeSnapshot));

  if (!pendingOperations || pendingOperations.length === 0) {
    return projected;
  }

  // Sort strictly by clientSequence
  const sorted = [...pendingOperations].sort((a, b) => a.clientSequence - b.clientSequence);

  for (const op of sorted) {
    applyOperationToProjection(projected, op);
  }

  return projected;
}

function applyOperationToProjection(match: any, op: OfflineOperation): void {
  const innings = (match.innings || []).find((i: any) => i.id === op.inningsId);
  if (!innings) return;

  const ballsPerOver = match.ballsPerOver || 6;

  switch (op.operationType) {
    case 'RECORD_DELIVERY': {
      const payload = op.payload || {};
      const runs = Number(payload.runs || 0);
      const extraType = payload.extraType || 'NONE';
      const extraRuns = Number(payload.extraRuns || 0);
      const byeRuns = Number(payload.byeRuns || 0);
      const legByeRuns = Number(payload.legByeRuns || 0);
      const isWicket = Boolean(payload.isWicket);
      const wicketType = payload.wicketType;
      const dismissedPlayerId = payload.dismissedPlayerId || innings.currentStrikerId;
      const newBatterId = payload.newBatterId;

      const delivery = calculateDeliveryRuns({
        runs,
        extraType,
        extraRuns,
        byeRuns,
        legByeRuns,
      });

      const isLegal = delivery.isLegal;
      const totalBallRuns = delivery.totalRuns;
      const bowlerChargedRuns = delivery.bowlerRuns;
      const batterRuns = delivery.batterRuns;

      let nextOvers = innings.overs;
      let nextBalls = innings.balls;
      let isOverComplete = false;

      if (isLegal) {
        if (nextBalls + 1 >= ballsPerOver) {
          nextOvers += 1;
          nextBalls = 0;
          isOverComplete = true;
        } else {
          nextBalls += 1;
        }
      }

      const teamWicketLost = isWicket && wicketType !== 'RETIRED_HURT';
      const nextWickets = innings.wickets + (teamWicketLost ? 1 : 0);
      const nextRuns = innings.runs + totalBallRuns;

      const wicketLimit = getInningsWicketLimit(innings, match);
      const isTeamAllOut = nextWickets >= wicketLimit;

      let nextStrikerId = innings.currentStrikerId;
      let nextNonStrikerId = innings.currentNonStrikerId;

      // Update Batter stats
      if (innings.currentStrikerId && extraType !== 'WIDE') {
        innings.battingScores = innings.battingScores || [];
        let batter = innings.battingScores.find((b: any) => b.playerId === innings.currentStrikerId);
        if (!batter) {
          batter = { playerId: innings.currentStrikerId, runs: 0, balls: 0, fours: 0, sixes: 0, isStriker: true, isOut: false };
          innings.battingScores.push(batter);
        }
        batter.runs += batterRuns;
        batter.balls += 1;
        if (batterRuns === 4) batter.fours += 1;
        if (batterRuns === 6) batter.sixes += 1;
      }

      // Update Bowler stats
      if (innings.currentBowlerId) {
        innings.bowlingScores = innings.bowlingScores || [];
        let bowler = innings.bowlingScores.find((b: any) => b.playerId === innings.currentBowlerId);
        if (!bowler) {
          bowler = { playerId: innings.currentBowlerId, overs: 0, balls: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0, isCurrent: true };
          innings.bowlingScores.push(bowler);
        }
        if (isLegal) {
          const bpo = match.ballsPerOver || 6;
          const currentTotalBalls = (bowler.overs || 0) * bpo + (bowler.balls || 0) + 1;
          bowler.overs = Math.floor(currentTotalBalls / bpo);
          bowler.balls = currentTotalBalls % bpo;
        }
        bowler.runsConceded += bowlerChargedRuns;
        if (isWicket && isBowlerCreditedDismissal(wicketType)) {
          bowler.wickets += 1;
        }
        if (extraType === 'WIDE') bowler.wides += delivery.wideRuns;
        if (extraType === 'NO_BALL') bowler.noBalls += delivery.noBallPenalty;
      }

      // Handle Wicket & Incoming Batter
      if (isWicket) {
        if (dismissedPlayerId) {
          innings.battingScores = innings.battingScores || [];
          let dismissedBatter = innings.battingScores.find((b: any) => b.playerId === dismissedPlayerId);
          if (!dismissedBatter) {
            dismissedBatter = { playerId: dismissedPlayerId, runs: 0, balls: 0, fours: 0, sixes: 0, isStriker: false, isOut: true };
            innings.battingScores.push(dismissedBatter);
          }
          dismissedBatter.isOut = wicketType !== 'RETIRED_HURT';
          dismissedBatter.dismissal = wicketType || 'out';
        }

        if (newBatterId) {
          innings.battingScores = innings.battingScores || [];
          const existingIncoming = innings.battingScores.find((b: any) => b.playerId === newBatterId);
          if (!existingIncoming) {
            innings.battingScores.push({
              playerId: newBatterId,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              isStriker: dismissedPlayerId === innings.currentStrikerId,
              isOut: false,
            });
          } else {
            existingIncoming.isOut = false;
            existingIncoming.dismissal = null;
            existingIncoming.isStriker = dismissedPlayerId === innings.currentStrikerId;
          }
          if (dismissedPlayerId === innings.currentStrikerId) {
            nextStrikerId = newBatterId;
          } else {
            nextNonStrikerId = newBatterId;
          }
        } else {
          if (dismissedPlayerId === innings.currentStrikerId) nextStrikerId = null;
          else nextNonStrikerId = null;
        }
      }

      // Strike Rotation
      const physicalRuns = delivery.batterRuns + delivery.byeRuns + delivery.legByeRuns;
      if (physicalRuns % 2 !== 0) {
        const temp = nextStrikerId;
        nextStrikerId = nextNonStrikerId;
        nextNonStrikerId = temp;
      }
      if (isOverComplete) {
        const temp = nextStrikerId;
        nextStrikerId = nextNonStrikerId;
        nextNonStrikerId = temp;
      }

      // Check Match & Innings completion
      let inningsFinished = false;
      if (innings.inningsNumber === 1) {
        if (isTeamAllOut || (isOverComplete && nextOvers >= (match.oversPerInnings || 20))) {
          inningsFinished = true;
        }
      } else if (innings.inningsNumber === 2) {
        const inn1 = match.innings.find((i: any) => i.inningsNumber === 1);
        const target = (inn1?.runs || 0) + 1;
        if (nextRuns >= target || isTeamAllOut || (isOverComplete && nextOvers >= (match.oversPerInnings || 20))) {
          inningsFinished = true;
          match.status = 'COMPLETED';
        }
      }

      const deliveryBowlerId = innings.currentBowlerId;

      // Update projected innings
      innings.runs = nextRuns;
      innings.wickets = nextWickets;
      innings.overs = nextOvers;
      innings.balls = nextBalls;
      innings.isAllOut = isTeamAllOut;
      innings.currentStrikerId = nextStrikerId;
      innings.currentNonStrikerId = nextNonStrikerId;
      innings.currentBowlerId = isOverComplete ? null : innings.currentBowlerId;
      innings.status = inningsFinished ? 'COMPLETED' : 'IN_PROGRESS';

      // Prepend to ballEvents array for UI display
      innings.ballEvents = innings.ballEvents || [];
      innings.ballEvents.unshift({
        id: `offline-${op.operationId}`,
        operationId: op.operationId,
        isLocalPending: op.status !== 'SYNCED',
        overNumber: innings.overs,
        ballNumber: innings.balls,
        bowlerId: deliveryBowlerId,
        runs: delivery.batterRuns,
        extras: delivery.wideRuns + delivery.noBallPenalty + delivery.byeRuns + delivery.legByeRuns,
        extraType,
        byeRuns: delivery.byeRuns,
        legByeRuns: delivery.legByeRuns,
        isLegal,
        isWicket,
        wicketType,
        createdAt: op.createdAt,
      });
      break;
    }

    case 'CHANGE_BOWLER': {
      const bowlerId = op.payload?.bowlerId;
      if (bowlerId) {
        innings.currentBowlerId = bowlerId;
        innings.bowlingScores = innings.bowlingScores || [];
        innings.bowlingScores.forEach((b: any) => { b.isCurrent = b.playerId === bowlerId; });
        if (!innings.bowlingScores.some((b: any) => b.playerId === bowlerId)) {
          innings.bowlingScores.push({
            playerId: bowlerId,
            overs: 0,
            balls: 0,
            runsConceded: 0,
            wickets: 0,
            wides: 0,
            noBalls: 0,
            isCurrent: true,
          });
        }
      }
      break;
    }

    case 'SWAP_STRIKER': {
      const temp = innings.currentStrikerId;
      innings.currentStrikerId = innings.currentNonStrikerId;
      innings.currentNonStrikerId = temp;
      break;
    }

    case 'SWITCH_BATTER': {
      const { role, newPlayerId } = op.payload || {};
      if (newPlayerId) {
        if (role === 'striker') {
          if (innings.currentNonStrikerId === newPlayerId) {
            innings.currentNonStrikerId = innings.currentStrikerId;
          }
          innings.currentStrikerId = newPlayerId;
        } else {
          if (innings.currentStrikerId === newPlayerId) {
            innings.currentStrikerId = innings.currentNonStrikerId;
          }
          innings.currentNonStrikerId = newPlayerId;
        }
      }
      break;
    }

    case 'UNDO_DELIVERY': {
      // In offline projection, undo removes the most recent ball event and adjusts basic counts
      if (innings.ballEvents && innings.ballEvents.length > 0) {
        const undone = innings.ballEvents.shift();
        if (undone) {
          const runsToDeduct = (undone.runs || 0) + (undone.extras || 0);
          innings.runs = Math.max(0, innings.runs - runsToDeduct);
          if (undone.isWicket && undone.wicketType !== 'RETIRED_HURT') {
            innings.wickets = Math.max(0, innings.wickets - 1);
          }
          if (undone.isLegal) {
            if (innings.balls === 0 && innings.overs > 0) {
              innings.overs -= 1;
              innings.balls = ballsPerOver - 1;
              if (undone.bowlerId && !innings.currentBowlerId) {
                innings.currentBowlerId = undone.bowlerId;
              }
            } else if (innings.balls > 0) {
              innings.balls -= 1;
            }
          }
          if (undone.bowlerId) {
            const bowler = innings.bowlingScores?.find((b: any) => b.playerId === undone.bowlerId);
            if (bowler) {
              if (undone.isLegal) {
                const currentTotal = (bowler.overs || 0) * ballsPerOver + (bowler.balls || 0);
                const nextTotal = Math.max(0, currentTotal - 1);
                bowler.overs = Math.floor(nextTotal / ballsPerOver);
                bowler.balls = nextTotal % ballsPerOver;
              }
              const undoneDelivery = calculateDeliveryRuns(undone);
              const bowlerCharged = undoneDelivery.bowlerRuns;
              bowler.runsConceded = Math.max(0, (bowler.runsConceded || 0) - bowlerCharged);
              if (undone.isWicket && isBowlerCreditedDismissal(undone.wicketType)) {
                bowler.wickets = Math.max(0, (bowler.wickets || 0) - 1);
              }
              if (undone.extraType === 'WIDE') {
                bowler.wides = Math.max(0, (bowler.wides || 0) - undoneDelivery.wideRuns);
              }
              if (undone.extraType === 'NO_BALL') {
                bowler.noBalls = Math.max(0, (bowler.noBalls || 0) - undoneDelivery.noBallPenalty);
              }
            }
          }
        }
      }
      break;
    }
  }
}
