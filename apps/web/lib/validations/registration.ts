import { z } from "zod";

/**
 * Normalizes index numbers by trimming, uppercasing, and removing all internal whitespace.
 * Example: " it 210001 " -> "IT210001"
 */
export function normalizeIndexNumber(value: string): string {
  if (!value) return "";
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Individual player schema in the squad
 */
export const playerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Player name must be at least 2 characters")
    .max(100, "Player name cannot exceed 100 characters"),
  indexNumber: z
    .string()
    .trim()
    .min(3, "University index number is required (min 3 characters)")
    .max(30, "Index number is too long (max 30 characters)"),
});

export type PlayerInput = z.infer<typeof playerSchema>;

/**
 * Main registration form schema
 */
export const registrationFormSchema = z
  .object({
    tournamentId: z.string().min(1, "Tournament ID is required"),

    teamName: z
      .string()
      .trim()
      .min(2, "Team name must be at least 2 characters")
      .max(100, "Team name cannot exceed 100 characters"),

    leaderName: z
      .string()
      .trim()
      .min(2, "Leader name must be at least 2 characters")
      .max(100, "Leader name cannot exceed 100 characters"),

    leaderWhatsapp: z
      .string()
      .trim()
      .min(8, "Enter a valid WhatsApp number (e.g. 0771234567 or +94771234567)")
      .max(20, "WhatsApp number is too long")
      .regex(/^[0-9+\s\-()]{8,20}$/, "Enter a valid phone/WhatsApp number format"),

    leaderIndexNumber: z
      .string()
      .trim()
      .min(3, "Leader index number is required (min 3 characters)")
      .max(30, "Leader index number is too long"),

    players: z
      .array(playerSchema)
      .min(7, "Minimum 7 players are required in the squad")
      .max(13, "Maximum 13 players are allowed in the squad"),

    confirmTermsAgreement: z.boolean().refine((v) => v === true, {
      message: "You must accept the Official Tournament Terms & Eligibility Agreement",
    }),
    confirmInfoCorrect: z.boolean(),
    confirmUniversityStudents: z.boolean(),
    confirmIndexNumbers: z.boolean(),
    confirmLeaderInfo: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // 1. Check for duplicate index numbers within squad
    const seenIndices = new Map<string, number>();

    data.players.forEach((player, index) => {
      const normalized = normalizeIndexNumber(player.indexNumber);
      if (!normalized) return;

      if (seenIndices.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["players", index, "indexNumber"],
          message: "This university index number is already used in this squad",
        });
      } else {
        seenIndices.set(normalized, index);
      }
    });

    // 2. Check that team leader's index number is present in the squad
    const normalizedLeaderIndex = normalizeIndexNumber(data.leaderIndexNumber);
    if (normalizedLeaderIndex) {
      const leaderInSquad = data.players.some(
        (p) => normalizeIndexNumber(p.indexNumber) === normalizedLeaderIndex
      );

      if (!leaderInSquad) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaderIndexNumber"],
          message: "The team leader must also be included in the player squad list",
        });
      }
    }
  });

export type RegistrationFormData = z.infer<typeof registrationFormSchema>;
