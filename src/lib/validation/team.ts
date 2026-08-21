import { z } from "zod";

export const REQUIRED_ROLES = ["EXP", "JUNGLE", "MID", "GOLD", "ROAM"] as const;
export const SUB_ROLES = ["SUB1", "SUB2"] as const;
export const COACH_ROLE = "COACH" as const;
export const ALL_ROLES = [...REQUIRED_ROLES, ...SUB_ROLES, COACH_ROLE] as const;

export const MAX_PLAYERS = 7; // 5 required + up to 2 subs
export const MAX_COACH = 1;
export const MAX_MEMBERS = MAX_PLAYERS + MAX_COACH;

export const teamIdentitySchema = z.object({
  team_name: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters.")
    .max(60, "Team name must be 60 characters or fewer."),
  logo_url: z.union([z.string().url(), z.literal("")]).optional(),
  banner_url: z.union([z.string().url(), z.literal("")]).optional(),
  description: z.string().trim().max(1000, "Description is too long.").optional(),
});

export type TeamIdentityInput = z.infer<typeof teamIdentitySchema>;

export const rosterMemberSchema = z.object({
  role: z.enum(ALL_ROLES),
  player_name: z.string().trim().min(1, "Player name is required.").max(40),
  game_id: z.string().trim().max(40).optional(),
  country: z.string().trim().max(56).optional(),
  discord: z.string().trim().max(40).optional(),
  avatar_url: z.union([z.string().url(), z.literal("")]).optional(),
  is_captain: z.boolean().default(false),
});

export type RosterMemberInput = z.infer<typeof rosterMemberSchema>;

export const rosterSchema = z.array(rosterMemberSchema).superRefine((members, ctx) => {
  const roleCounts = new Map<string, number>();
  for (const m of members) roleCounts.set(m.role, (roleCounts.get(m.role) ?? 0) + 1);

  for (const role of REQUIRED_ROLES) {
    if (!roleCounts.get(role)) {
      ctx.addIssue({ code: "custom", message: `${role} is required.` });
    }
  }
  for (const [role, count] of roleCounts) {
    if (count > 1) {
      ctx.addIssue({ code: "custom", message: `Duplicate role: ${role}. Each role can only be filled once.` });
    }
  }

  const subCount = members.filter((m) => (SUB_ROLES as readonly string[]).includes(m.role)).length;
  if (subCount > 2) {
    ctx.addIssue({ code: "custom", message: "Maximum 2 substitutes." });
  }
  const coachCount = members.filter((m) => m.role === COACH_ROLE).length;
  if (coachCount > MAX_COACH) {
    ctx.addIssue({ code: "custom", message: "Maximum 1 coach." });
  }

  const captains = members.filter((m) => m.is_captain);
  if (captains.length === 0) {
    ctx.addIssue({ code: "custom", message: "Select a captain." });
  } else if (captains.length > 1) {
    ctx.addIssue({ code: "custom", message: "Only one player can be captain." });
  } else if (!(REQUIRED_ROLES as readonly string[]).includes(captains[0].role)) {
    ctx.addIssue({ code: "custom", message: "The captain must be one of the starting five players." });
  }

  if (members.length < 5) {
    ctx.addIssue({ code: "custom", message: "At least 5 players are required." });
  }
  if (members.length > MAX_MEMBERS) {
    ctx.addIssue({ code: "custom", message: "Maximum 7 players plus 1 coach." });
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
