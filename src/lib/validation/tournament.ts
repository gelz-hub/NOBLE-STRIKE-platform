import { z } from "zod";

export const TOURNAMENT_STATUSES = [
  "DRAFT",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "ONGOING",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const GAME_TYPES = ["MLBB", "HOK"] as const;
export const MATCH_FORMATS = ["BO1", "BO3", "BO5"] as const;
export const BRACKET_FORMATS = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION"] as const;

/** Selectable tournament capacities. Bracket generation itself is power-of-2
 *  generic, but the admin UI offers this fixed ladder. */
export const MAX_TEAMS_OPTIONS = [8, 16, 32, 64, 128, 256] as const;

/** Which slice of the bracket the PUBLIC site shows. Admin pages always show
 *  the full bracket regardless of this setting. */
export const FEATURED_BRACKET_STAGES = [
  "FULL",
  "TOP_64",
  "TOP_32",
  "TOP_16",
  "TOP_8",
  "TOP_4",
] as const;

export type FeaturedBracketStage = (typeof FEATURED_BRACKET_STAGES)[number];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const tournamentSchema = z
  .object({
    name_en: z.string().trim().min(2, "validation.tournament.nameRequired").max(100),
    name_km: z.string().trim().max(100).optional(),
    slug: z
      .string()
      .trim()
      .min(2, "validation.tournament.slugMinLength")
      .max(80)
      .regex(/^[a-z0-9-]+$/, "validation.tournament.slugFormat"),
    description_en: z.string().trim().max(2000).optional(),
    description_km: z.string().trim().max(2000).optional(),
    rules: z.string().trim().max(4000).optional(),
    banner_url: z.union([z.string().url(), z.literal("")]).optional(),
    game_type: z.enum(GAME_TYPES),
    format: z.enum(MATCH_FORMATS),
    bracket_format: z.enum(BRACKET_FORMATS),
    grand_final_reset_enabled: z.enum(["true", "false"]).transform((v) => v === "true"),
    max_teams: z.coerce
      .number()
      .int()
      .min(2, "validation.tournament.maxTeamsMin")
      .max(256, "validation.tournament.maxTeamsMax"),
    featured_bracket_stage: z.enum(FEATURED_BRACKET_STAGES).catch("FULL"),
    prize_pool: z.coerce.number().min(0, "validation.tournament.prizePoolNonNegative"),
    registration_deadline: z.string().min(1, "validation.tournament.registrationDeadlineRequired"),
    start_date: z.string().min(1, "validation.tournament.startDateRequired"),
    status: z.enum(TOURNAMENT_STATUSES),
    location: z.string().trim().max(100).optional(),
    organizer: z.string().trim().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.start_date).getTime() < new Date(data.registration_deadline).getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["start_date"],
        message: "validation.tournament.startDateBeforeDeadline",
      });
    }
  });

export type TournamentInput = z.infer<typeof tournamentSchema>;
