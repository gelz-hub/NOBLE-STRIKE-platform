import { z } from "zod";

export const REQUIRED_ROLES = ["EXP", "JUNGLE", "MID", "GOLD", "ROAM"] as const;
export const SUB_ROLES = ["SUB1", "SUB2"] as const;
export const COACH_ROLE = "COACH" as const;
export const ALL_ROLES = [...REQUIRED_ROLES, ...SUB_ROLES, COACH_ROLE] as const;

export const MAX_PLAYERS = 7; // 5 required + up to 2 subs
export const MAX_COACH = 1;
export const MAX_MEMBERS = MAX_PLAYERS + MAX_COACH;

export const TEAM_GAMES = ["MLBB", "HOK"] as const;

// Phnom Penh pinned first (capital, most common), rest alphabetical — all
// 25 of Cambodia's current provinces/municipalities.
export const CAMBODIA_PROVINCES = [
  "Phnom Penh",
  "Banteay Meanchey",
  "Battambang",
  "Kampong Cham",
  "Kampong Chhnang",
  "Kampong Speu",
  "Kampong Thom",
  "Kampot",
  "Kandal",
  "Kep",
  "Koh Kong",
  "Kratié",
  "Mondulkiri",
  "Oddar Meanchey",
  "Pailin",
  "Preah Sihanouk",
  "Preah Vihear",
  "Prey Veng",
  "Pursat",
  "Ratanakiri",
  "Siem Reap",
  "Stung Treng",
  "Svay Rieng",
  "Takéo",
  "Tboung Khmum",
] as const;

// A Cambodian mobile number in international format: +855 followed by
// 8-9 digits (covers both 0XX-XXX-XXX and 0XX-XXXX-XXX carrier formats
// with the leading 0 dropped). Validated after stripping spaces/dashes so
// "+855 12 345 678" and "+85512345678" both pass.
const CAMBODIA_PHONE_REGEX = /^\+855\d{8,9}$/;

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, "");
}

// A Telegram username, with or without the leading "@": 5-32 characters,
// letters/numbers/underscores only (Telegram's own username rules).
const TELEGRAM_USERNAME_REGEX = /^@?[A-Za-z0-9_]{5,32}$/;

// Same shared lane vocabulary the Recruitment Hub already established
// (src/lib/validation/recruitment.ts) — MLBB's Exp/Gold/Roam and Honor of
// Kings' Farm/Clash/Roamer are the same lanes with different names, so the
// stored `role` enum stays identical across games; only the label shown
// to the user changes.
const MLBB_ROLE_LABELS: Record<(typeof ALL_ROLES)[number], string> = {
  EXP: "Exp Lane",
  JUNGLE: "Jungle",
  MID: "Mid Lane",
  GOLD: "Gold Lane",
  ROAM: "Roam",
  SUB1: "Substitute 1",
  SUB2: "Substitute 2",
  COACH: "Coach",
};

const HOK_ROLE_LABELS: Record<(typeof ALL_ROLES)[number], string> = {
  EXP: "Farm Lane",
  JUNGLE: "Jungle",
  MID: "Mid Lane",
  GOLD: "Clash Lane",
  ROAM: "Roamer",
  SUB1: "Substitute 1",
  SUB2: "Substitute 2",
  COACH: "Coach",
};

export function getRoleLabelsForGame(game?: string | null): Record<(typeof ALL_ROLES)[number], string> {
  return game === "HOK" ? HOK_ROLE_LABELS : MLBB_ROLE_LABELS;
}

export const teamIdentitySchema = z.object({
  team_name: z
    .string()
    .trim()
    .min(2, "validation.team.nameTooShort")
    .max(60, "validation.team.nameTooLong"),
  logo_url: z.union([z.string().url(), z.literal("")]).optional(),
  banner_url: z.union([z.string().url(), z.literal("")]).optional(),
  description: z.string().trim().max(1000, "validation.team.descriptionTooLong").optional(),
  game: z.enum(TEAM_GAMES, { message: "validation.team.selectGame" }),
  contact_number: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((v) => CAMBODIA_PHONE_REGEX.test(v), {
      message: "validation.team.invalidPhone",
    }),
  captain_telegram: z
    .string()
    .trim()
    .refine((v) => TELEGRAM_USERNAME_REGEX.test(v), {
      message: "validation.team.invalidTelegram",
    }),
  province: z.enum(CAMBODIA_PROVINCES, { message: "validation.team.selectProvince" }),
});

export type TeamIdentityInput = z.infer<typeof teamIdentitySchema>;

// The captain is the team's sole point of contact (Telegram + phone,
// captured once on the team via teamIdentitySchema above) — roster rows
// carry only the in-game identity needed to field a lineup, for captain
// and non-captain members alike.
export const rosterMemberSchema = z.object({
  role: z.enum(ALL_ROLES),
  player_name: z.string().trim().min(1, "validation.roster.ignRequired").max(40),
  game_id: z.string().trim().max(40).optional(),
  avatar_url: z.union([z.string().url(), z.literal("")]).optional(),
  is_captain: z.boolean().default(false),
});

export type RosterMemberInput = z.infer<typeof rosterMemberSchema>;

// Issue messages are dot-path translation keys (see src/app/admin/legacy/actions.ts's
// `firstIssue` for the established resolution pattern). Messages that need a
// dynamic value (e.g. a role name) encode it as `key|param` — the call site
// splits on "|" and passes `{ role: param }` to the translator.
export const rosterSchema = z.array(rosterMemberSchema).superRefine((members, ctx) => {
  const roleCounts = new Map<string, number>();
  for (const m of members) roleCounts.set(m.role, (roleCounts.get(m.role) ?? 0) + 1);

  for (const role of REQUIRED_ROLES) {
    if (!roleCounts.get(role)) {
      ctx.addIssue({ code: "custom", message: `validation.roster.roleRequired|${role}` });
    }
  }
  for (const [role, count] of roleCounts) {
    if (count > 1) {
      ctx.addIssue({ code: "custom", message: `validation.roster.duplicateRole|${role}` });
    }
  }

  const subCount = members.filter((m) => (SUB_ROLES as readonly string[]).includes(m.role)).length;
  if (subCount > 2) {
    ctx.addIssue({ code: "custom", message: "validation.roster.maxSubstitutes" });
  }
  const coachCount = members.filter((m) => m.role === COACH_ROLE).length;
  if (coachCount > MAX_COACH) {
    ctx.addIssue({ code: "custom", message: "validation.roster.maxCoach" });
  }

  const captains = members.filter((m) => m.is_captain);
  if (captains.length === 0) {
    ctx.addIssue({ code: "custom", message: "validation.roster.selectCaptain" });
  } else if (captains.length > 1) {
    ctx.addIssue({ code: "custom", message: "validation.roster.onlyOneCaptain" });
  } else if (!(REQUIRED_ROLES as readonly string[]).includes(captains[0].role)) {
    ctx.addIssue({ code: "custom", message: "validation.roster.captainMustStart" });
  }

  if (members.length < 5) {
    ctx.addIssue({ code: "custom", message: "validation.roster.minPlayers" });
  }
  if (members.length > MAX_MEMBERS) {
    ctx.addIssue({ code: "custom", message: "validation.roster.maxPlayers" });
  }
});

export type RosterInput = z.infer<typeof rosterMemberSchema>[];

/** Derives is_substitute/is_coach from role so the UI never has to set them independently. */
export function withRoleFlags(member: RosterMemberInput) {
  return {
    ...member,
    is_substitute: (SUB_ROLES as readonly string[]).includes(member.role),
    is_coach: member.role === COACH_ROLE,
  };
}
