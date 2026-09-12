import { z } from "zod";

export const extraTypeEnum = z.enum(["NONE", "WIDE", "NO_BALL", "BYE", "LEG_BYE"]);
export const wicketTypeEnum = z.enum([
  "BOWLED",
  "CAUGHT",
  "LBW",
  "RUN_OUT",
  "STUMPED",
  "HIT_WICKET",
  "TIMED_OUT",
  "RETIRED_HURT",
  "RETIRED_OUT",
  "HIT_BALL_TWICE",
  "OBSTRUCTING_FIELD",
  "OTHER",
]);

export const recordDeliverySchema = z.object({
  runs: z.number().int().min(0).max(10).default(0),
  extraType: extraTypeEnum.default("NONE"),
  extraRuns: z.number().int().min(0).max(10).default(0),
  byeRuns: z.number().int().min(0).max(10).default(0),
  legByeRuns: z.number().int().min(0).max(10).default(0),
  isWicket: z.boolean().default(false),
  wicketType: wicketTypeEnum.optional(),
  dismissedPlayerId: z.string().trim().min(1).max(64).optional(),
  newBatterId: z.string().trim().min(1).max(64).optional(),
  withoutFacingBall: z.boolean().optional(),
  commentary: z.string().trim().max(500).optional(),
  expectedUpdatedAt: z.any().optional(),
  operationId: z.string().trim().min(1).max(128).optional(),
  clientId: z.string().trim().min(1).max(128).optional(),
});

export const createMatchSchema = z.object({
  tournamentId: z.string().trim().min(1, "Tournament ID is required").max(64),
  teamAId: z.string().trim().min(1, "Team A ID is required").max(64),
  teamBId: z.string().trim().min(1, "Team B ID is required").max(64),
  venue: z.string().trim().max(100).optional(),
  scheduledAt: z.union([z.string(), z.date()]).optional(),
  oversPerInnings: z.number().int().min(1).max(100).default(20),
  ballsPerOver: z.number().int().min(1).max(20).default(6),
  stage: z.string().trim().max(50).optional(),
  groupName: z.string().trim().max(50).optional(),
  matchNumber: z.coerce.number().int().min(1).max(200).optional(),
  bracketSlot: z.string().trim().max(50).optional(),
}).refine((data) => data.teamAId !== data.teamBId, {
  message: "Team A and Team B cannot be the same team",
  path: ["teamBId"],
});

export const startMatchSchema = z.object({
  tossWinnerId: z.string().trim().min(1).max(64),
  tossDecision: z.enum(["BAT", "BOWL"]),
});

export const openingLineupSchema = z.object({
  strikerId: z.string().trim().min(1).max(64),
  nonStrikerId: z.string().trim().min(1).max(64),
  bowlerId: z.string().trim().min(1).max(64),
}).refine((data) => data.strikerId !== data.nonStrikerId, {
  message: "Striker and Non-striker must be different players",
  path: ["nonStrikerId"],
});

export const changeBowlerSchema = z.object({
  bowlerId: z.string().trim().min(1).max(64),
  operationId: z.string().trim().min(1).max(128).optional(),
  clientId: z.string().trim().min(1).max(128).optional(),
});

export const switchBatterSchema = z.object({
  role: z.enum(["striker", "nonStriker"]),
  newPlayerId: z.string().trim().min(1).max(64),
  operationId: z.string().trim().min(1).max(128).optional(),
  clientId: z.string().trim().min(1).max(128).optional(),
});

export const completeMatchSchema = z.object({
  winnerTeamId: z.string().trim().min(1).max(64).optional(),
  resultNote: z.string().trim().max(200).optional(),
});

export const editBallDeliverySchema = z.object({
  runs: z.number().int().min(0).max(10).optional(),
  extraType: extraTypeEnum.optional(),
  extras: z.number().int().min(0).max(10).optional(),
  byeRuns: z.number().int().min(0).max(10).optional(),
  legByeRuns: z.number().int().min(0).max(10).optional(),
  isWicket: z.boolean().optional(),
  wicketType: wicketTypeEnum.optional(),
});

export const startSuperOverSchema = z.object({
  battingFirstTeamId: z.string().trim().min(1).max(64),
  ballsPerOver: z.number().int().min(1).max(20).optional(),
});

export const updateMatchRulesSchema = z.object({
  oversPerInnings: z.number().int().min(1).max(100).optional(),
  ballsPerOver: z.number().int().min(1).max(20).optional(),
});

export const renamePlayerSchema = z.object({
  playerId: z.string().trim().min(1).max(64),
  newName: z.string().trim().min(1).max(100),
  jerseyNumber: z.number().int().min(0).max(999).optional().nullable(),
  matchId: z.string().trim().min(1).max(64).optional(),
});
