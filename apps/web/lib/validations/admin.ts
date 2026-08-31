import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters").max(100),
  shortName: z.string().trim().min(1).max(10).toUpperCase(),
  city: z.string().trim().max(50).optional(),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const updateTeamSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  shortName: z.string().trim().min(1).max(10).toUpperCase().optional(),
  city: z.string().trim().max(50).optional(),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const playerRoleEnum = z.enum(["BATTER", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"]);

export const createPlayerSchema = z.object({
  name: z.string().trim().min(2, "Player name must be at least 2 characters").max(100),
  indexNumber: z.string().trim().min(2).max(30).toUpperCase().optional().or(z.literal("")),
  role: playerRoleEnum.default("ALL_ROUNDER"),
  battingStyle: z.string().trim().max(50).optional(),
  bowlingStyle: z.string().trim().max(50).optional(),
  profileImageUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const createTournamentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  season: z.string().trim().min(1).max(20),
  format: z.string().trim().min(1).max(50),
  oversPerInnings: z.number().int().min(1).max(100).default(20),
  ballsPerOver: z.number().int().min(1).max(20).default(6),
});

export const tournamentStatusEnum = z.enum([
  "DRAFT",
  "REGISTRATION",
  "SCHEDULED",
  "LIVE",
  "KNOCKOUT",
  "COMPLETED",
  "CANCELLED",
]);

export const updateTournamentSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  season: z.string().trim().min(1).max(20).optional(),
  format: z.string().trim().min(1).max(50).optional(),
  status: tournamentStatusEnum.optional(),
});

export const createExceptionSchema = z.object({
  tournamentId: z.string().trim().min(1).max(64),
  name: z.string().trim().max(100).optional(),
  teamName: z.string().trim().max(100).optional(),
  indexPrefix: z.string().trim().max(30).toUpperCase().optional(),
  minPlayers: z.number().int().min(7).max(13).default(7),
  notes: z.string().trim().max(500).optional(),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(15),
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().max(30).optional(),
  backupStatus: z.string().trim().max(30).optional(),
});
