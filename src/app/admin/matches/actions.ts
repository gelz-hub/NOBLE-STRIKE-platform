"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import {
  scheduleMatchSchema,
  matchNotesSchema,
  resolveDisputeSchema,
} from "@/lib/validation/match";

export type ActionResult = { error: string } | { success: true };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, isAdmin: profile?.role === "admin" };
}

async function loadMatchForNotify(supabase: Awaited<ReturnType<typeof createClient>>, matchId: string) {
  const { data } = await supabase
    .from("matches")
    .select(
      "id, tournament_id, status, team_a:team_a_id(owner_id, team_name), team_b:team_b_id(owner_id, team_name), tournament:tournament_id(title)"
    )
    .eq("id", matchId)
    .single<{
      id: string;
      tournament_id: string;
      status: string;
      team_a: { owner_id: string; team_name: string } | null;
      team_b: { owner_id: string; team_name: string } | null;
      tournament: { title: string } | null;
    }>();
  return data;
}

async function notifyBothTeams(
  supabase: Awaited<ReturnType<typeof createClient>>,
  match: NonNullable<Awaited<ReturnType<typeof loadMatchForNotify>>>,
  title: string,
  message: string
) {
  if (match.team_a?.owner_id) await createNotification(supabase, match.team_a.owner_id, title, message, "match");
  if (match.team_b?.owner_id) await createNotification(supabase, match.team_b.owner_id, title, message, "match");
}

function revalidateMatch(matchId: string, tournamentId: string) {
  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/tournaments/${tournamentId}`);
}

export async function scheduleMatch(
  matchId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const parsed = scheduleMatchSchema.safeParse({
    scheduled_at: String(formData.get("scheduled_at") || ""),
    stream_url: String(formData.get("stream_url") || ""),
    lobby_id: String(formData.get("lobby_id") || ""),
    lobby_password: String(formData.get("lobby_password") || ""),
    referee_id: String(formData.get("referee_id") || ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const match = await loadMatchForNotify(supabase, matchId);
  if (!match) return { error: "Match not found." };
  const wasScheduled = match.status === "SCHEDULED" || match.status === "READY";

  const { error } = await supabase
    .from("matches")
    .update({
      scheduled_at: new Date(parsed.data.scheduled_at).toISOString(),
      stream_url: parsed.data.stream_url || null,
      lobby_id: parsed.data.lobby_id || null,
      lobby_password: parsed.data.lobby_password || null,
      referee_id: parsed.data.referee_id || null,
      status: match.status === "PENDING" ? "SCHEDULED" : match.status,
    })
    .eq("id", matchId);
  if (error) return { error: error.message };

  await notifyBothTeams(
    supabase,
    match,
    wasScheduled ? "Match Rescheduled" : "Match Scheduled",
    `${match.team_a?.team_name} vs ${match.team_b?.team_name} in ${match.tournament?.title ?? "the tournament"} ${
      wasScheduled ? "was rescheduled" : "was scheduled"
    } for ${new Date(parsed.data.scheduled_at).toLocaleString()}.`
  );

  revalidateMatch(matchId, match.tournament_id);
  return { success: true };
}

export async function assignReferee(matchId: string, refereeId: string | null): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const { data: match, error } = await supabase
    .from("matches")
    .update({ referee_id: refereeId })
    .eq("id", matchId)
    .select("tournament_id")
    .single();
  if (error) return { error: error.message };

  revalidateMatch(matchId, match.tournament_id);
  return { success: true };
}

export async function markMatchReady(matchId: string): Promise<ActionResult> {
  return setMatchStatus(matchId, "READY");
}

export async function markMatchLive(matchId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const match = await loadMatchForNotify(supabase, matchId);
  if (!match) return { error: "Match not found." };

  const { error } = await supabase.from("matches").update({ status: "LIVE" }).eq("id", matchId);
  if (error) return { error: error.message };

  await notifyBothTeams(
    supabase,
    match,
    "Match Goes Live",
    `${match.team_a?.team_name} vs ${match.team_b?.team_name} in ${match.tournament?.title ?? "the tournament"} is now live.`
  );

  revalidateMatch(matchId, match.tournament_id);
  return { success: true };
}

export async function cancelMatch(matchId: string): Promise<ActionResult> {
  return setMatchStatus(matchId, "CANCELLED");
}

async function setMatchStatus(matchId: string, status: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const { data: match, error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", matchId)
    .select("tournament_id")
    .single();
  if (error) return { error: error.message };

  revalidateMatch(matchId, match.tournament_id);
  return { success: true };
}

export async function updateMatchNotes(
  matchId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const parsed = matchNotesSchema.safeParse({
    admin_notes: String(formData.get("admin_notes") || ""),
    result_notes: String(formData.get("result_notes") || ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { data: match, error } = await supabase
    .from("matches")
    .update({
      admin_notes: parsed.data.admin_notes || null,
      result_notes: parsed.data.result_notes || null,
    })
    .eq("id", matchId)
    .select("tournament_id")
    .single();
  if (error) return { error: error.message };

  revalidateMatch(matchId, match.tournament_id);
  return { success: true };
}

export async function resolveDispute(
  disputeId: string,
  status: "RESOLVED" | "REJECTED",
  adminResponse: string
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const parsed = resolveDisputeSchema.safeParse({ status, admin_response: adminResponse });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { data: dispute } = await supabase
    .from("match_disputes")
    .select("id, match_id, team_id, opened_by, teams:team_id(team_name)")
    .eq("id", disputeId)
    .single<{
      id: string;
      match_id: string;
      team_id: string;
      opened_by: string | null;
      teams: { team_name: string } | null;
    }>();
  if (!dispute) return { error: "Dispute not found." };

  const { error } = await supabase
    .from("match_disputes")
    .update({
      status: parsed.data.status,
      admin_response: parsed.data.admin_response,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);
  if (error) return { error: error.message };

  const match = await loadMatchForNotify(supabase, dispute.match_id);
  if (match) {
    // Resolving a dispute doesn't change the match's score/winner (an admin
    // uses the existing result-entry flow for that if the dispute is upheld)
    // — it just clears the DISPUTED flag back to COMPLETED.
    await supabase.from("matches").update({ status: "COMPLETED" }).eq("id", dispute.match_id);

    const outcome = parsed.data.status === "RESOLVED" ? "resolved" : "rejected";
    await notifyBothTeams(
      supabase,
      match,
      "Dispute Resolved",
      `The dispute raised by ${dispute.teams?.team_name ?? "a team"} for ${match.team_a?.team_name} vs ${
        match.team_b?.team_name
      } was ${outcome}. ${parsed.data.admin_response}`
    );

    revalidateMatch(dispute.match_id, match.tournament_id);
  }
  revalidatePath(`/admin/matches/${dispute.match_id}`);
  return { success: true };
}
