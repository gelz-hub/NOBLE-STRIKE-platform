"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  teamIdentitySchema,
  rosterSchema,
  withRoleFlags,
  type RosterMemberInput,
} from "@/lib/validation/team";

export type ActionResult = { error: string } | { success: true };

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

function readTeamIdentity(formData: FormData) {
  return {
    team_name: String(formData.get("team_name") || ""),
    logo_url: String(formData.get("logo_url") || ""),
    banner_url: String(formData.get("banner_url") || ""),
    description: String(formData.get("description") || ""),
  };
}

export async function createTeam(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to create a team." };

  const parsed = teamIdentitySchema.safeParse(readTeamIdentity(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { data, error } = await supabase
    .from("teams")
    .insert({
      owner_id: user.id,
      team_name: parsed.data.team_name,
      logo_url: parsed.data.logo_url || null,
      banner_url: parsed.data.banner_url || null,
      description: parsed.data.description || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/teams");
  redirect(`/dashboard/teams/${data.id}/roster`);
}

export async function updateTeam(
  teamId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = teamIdentitySchema.safeParse(readTeamIdentity(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { error } = await supabase
    .from("teams")
    .update({
      team_name: parsed.data.team_name,
      logo_url: parsed.data.logo_url || null,
      banner_url: parsed.data.banner_url || null,
      description: parsed.data.description || null,
    })
    .eq("id", teamId);

  // RLS silently returns 0 rows updated (no error) if the caller doesn't own
  // the team, so we still surface a real error message from Postgres here
  // when there is one (e.g. constraint violations).
  if (error) return { error: error.message };

  revalidatePath("/dashboard/teams");
  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

export async function deleteTeam(teamId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/teams");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

/**
 * Roster rows are free-text player names (a team can list people who've
 * never signed up), but when a name matches a real registered username,
 * linking that row to the account is what makes "Captain Teams" / "Coach
 * Teams" on a profile page possible at all — see src/lib/profile/queries.ts.
 * Best-effort, case-insensitive, exact match; no match just leaves user_id
 * null, same as before this existed.
 */
async function resolveUserIdByPlayerName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  playerName: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", playerName.trim())
    .maybeSingle();
  return data?.id ?? null;
}

export async function createRosterMember(
  teamId: string,
  member: RosterMemberInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await resolveUserIdByPlayerName(supabase, member.player_name);
  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: teamId, user_id: userId, ...withRoleFlags(member) });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/teams/${teamId}/roster`);
  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

export async function updateRosterMember(
  memberId: string,
  teamId: string,
  member: RosterMemberInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await resolveUserIdByPlayerName(supabase, member.player_name);
  const { error } = await supabase
    .from("team_members")
    .update({ user_id: userId, ...withRoleFlags(member) })
    .eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/teams/${teamId}/roster`);
  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

export async function deleteRosterMember(
  memberId: string,
  teamId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").delete().eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/teams/${teamId}/roster`);
  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

/**
 * Saves the whole roster in one go (used by the roster editor's Save
 * button). Roles are the natural key, so this replaces the team's entire
 * team_members set rather than diffing row by row.
 */
export async function saveRoster(
  teamId: string,
  members: RosterMemberInput[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = rosterSchema.safeParse(members);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { error: deleteError } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId);
  if (deleteError) return { error: deleteError.message };

  const rows = await Promise.all(
    parsed.data.map(async (m) => ({
      team_id: teamId,
      user_id: await resolveUserIdByPlayerName(supabase, m.player_name),
      ...withRoleFlags(m),
    }))
  );
  const { error: insertError } = await supabase.from("team_members").insert(rows);
  if (insertError) return { error: insertError.message };

  revalidatePath(`/dashboard/teams/${teamId}/roster`);
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/dashboard/teams");
  return { success: true };
}
