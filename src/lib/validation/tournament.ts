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

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const tournamentSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters.").max(100),
    slug: z
      .string()
      .trim()
      .min(2, "Slug must be at least 2 characters.")
      .max(80)
      .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
    description: z.string().trim().max(2000).optional(),
    rules: z.string().trim().max(4000).optional(),
    banner_url: z.union([z.string().url(), z.literal("")]).optional(),
    game_type: z.enum(GAME_TYPES),
    format: z.enum(MATCH_FORMATS),
    bracket_format: z.enum(BRACKET_FORMATS),
    grand_final_reset_enabled: z.enum(["true", "false"]).transform((v) => v === "true"),
    max_teams: z.coerce.number().int().min(2, "At least 2 teams required.").max(1024),
    prize_pool: z.coerce.number().min(0, "Prize pool cannot be negative."),
    registration_deadline: z.string().min(1, "Registration deadline is required."),
    start_date: z.string().min(1, "Start date is required."),
    status: z.enum(TOURNAMENT_STATUSES),
    location: z.string().trim().max(100).optional(),
    organizer: z.string().trim().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.start_date).getTime() < new Date(data.registration_deadline).getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["start_date"],
        message: "Start date should be on or after the registration deadline.",
      });
    }
  });

export type TournamentInput = z.infer<typeof tournamentSchema>;
