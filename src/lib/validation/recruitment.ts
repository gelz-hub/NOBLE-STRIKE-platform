import { z } from "zod";

export const RECRUITMENT_ROLES = ["EXP", "JUNGLE", "MID", "GOLD", "ROAM", "SUB", "COACH", "ANY"] as const;

export const RECRUITMENT_GAMES = ["MLBB", "HOK"] as const;

// The underlying `role` value is one shared vocabulary across both games
// (same lane concept, different name) — MLBB's "Exp Lane"/"Gold Lane"/"Roam"
// are HoK's "Farm Lane"/"Clash Lane"/"Roamer". Storing one enum keeps
// filtering consistent across games; only the *label* shown to the user
// changes with the selected game.
const MLBB_ROLE_LABELS: Record<(typeof RECRUITMENT_ROLES)[number], string> = {
  EXP: "Exp Lane",
  JUNGLE: "Jungle",
  MID: "Mid Lane",
  GOLD: "Gold Lane",
  ROAM: "Roam",
  SUB: "Substitute",
  COACH: "Coach",
  ANY: "Any Role",
};

const HOK_ROLE_LABELS: Record<(typeof RECRUITMENT_ROLES)[number], string> = {
  EXP: "Farm Lane",
  JUNGLE: "Jungle",
  MID: "Mid Lane",
  GOLD: "Clash Lane",
  ROAM: "Roamer",
  SUB: "Substitute",
  COACH: "Coach",
  ANY: "Any Role",
};

/** Defaults to MLBB's terminology when no specific game is selected (e.g. the "All Games" filter option). */
export function getRoleLabels(game?: string): Record<(typeof RECRUITMENT_ROLES)[number], string> {
  return game === "HOK" ? HOK_ROLE_LABELS : MLBB_ROLE_LABELS;
}

// Kept for call sites that genuinely don't have a game in context.
export const RECRUITMENT_ROLE_LABELS = MLBB_ROLE_LABELS;
export const RECRUITMENT_STATUSES = ["OPEN", "CLOSED"] as const;

function normalizeTelegram(value: string): string {
  return value.trim().replace(/^@/, "");
}

// Zod messages are dot-path translation keys — resolved at the call site via
// the shared `firstIssue` helper (see src/app/recruitment/actions.ts), same
// convention used by src/lib/validation/legacy.ts and team.ts.
const baseFields = {
  title: z.string().trim().min(2, "validation.recruitment.titleTooShort").max(80),
  game: z.enum(RECRUITMENT_GAMES),
  role: z.enum(RECRUITMENT_ROLES),
  telegram_username: z
    .string()
    .trim()
    .min(3, "validation.recruitment.telegramTooShort")
    .max(40)
    .transform(normalizeTelegram),
  description: z.string().trim().min(10, "validation.recruitment.descriptionTooShort").max(1000),
  status: z.enum(RECRUITMENT_STATUSES).default("OPEN"),
};

export const lftPostSchema = z.object({
  ...baseFields,
  rank: z.string().trim().min(1, "validation.recruitment.rankRequired").max(40),
  country: z.string().trim().min(1, "validation.recruitment.countryRequired").max(56),
});

export const lfpPostSchema = z.object({
  ...baseFields,
  requirements: z.string().trim().min(5, "validation.recruitment.requirementsTooShort").max(500),
});

export type LftPostInput = z.infer<typeof lftPostSchema>;
export type LfpPostInput = z.infer<typeof lfpPostSchema>;
