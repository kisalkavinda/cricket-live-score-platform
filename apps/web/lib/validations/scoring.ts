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
  "OTHER",
]);

export const recordDeliverySchema = z.object({
  runs: z.number().int().min(0).max(10).default(0),
  extraType: extraTypeEnum.default("NONE"),
  extraRuns: z.number().int().min(0).max(10).default(0),
  isWicket: z.boolean().default(false),
  wicketType: wicketTypeEnum.optional(),
  dismissedPlayerId: z.string().trim().min(1).max(64).optional(),
  newBatterId: z.string().trim().min(1).max(64).optional(),
  commentary: z.string().trim().max(500).optional(),
  expectedUpdatedAt: z.union([z.string(), z.date()]).optional(),
});

export const createMatchSchema = z.object({
  tournamentId: z.string().trim().min(1, "Tournament ID is required").max(64),
  teamAId: z.string().trim().min(1, "Team A ID is required").max(64),
  teamBId: z.string().trim().min(1, "Team B ID is required").max(64),
  venue: z.string().trim().max(100).optional(),
  scheduledAt: z.union([z.string(), z.date()]).optional(),
  oversPerInnings: z.number().int().min(1).max(50).default(20),
  ballsPerOver: z.number().int().min(1).max(6).default(6),
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
});

export const switchBatterSchema = z.object({
  role: z.enum(["striker", "nonStriker"]),
  newPlayerId: z.string().trim().min(1).max(64),
});

export const completeMatchSchema = z.object({
  winnerTeamId: z.string().trim().min(1).max(64).optional(),
  resultNote: z.string().trim().max(200).optional(),
});

export const editBallDeliverySchema = z.object({
  runs: z.number().int().min(0).max(10).optional(),
  extraType: extraTypeEnum.optional(),
  extras: z.number().int().min(0).max(10).optional(),
  isWicket: z.boolean().optional(),
  wicketType: wicketTypeEnum.optional(),
});

export const startSuperOverSchema = z.object({
  battingFirstTeamId: z.string().trim().min(1).max(64),
  ballsPerOver: z.number().int().min(1).max(6).optional(),
});

export const updateMatchRulesSchema = z.object({
  oversPerInnings: z.number().int().min(1).max(50).optional(),
  ballsPerOver: z.number().int().min(1).max(6).optional(),
});
