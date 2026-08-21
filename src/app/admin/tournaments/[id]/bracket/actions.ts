"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runBracketGeneration } from "@/lib/bracket/generate";
import { runDoubleEliminationGeneration } from "@/lib/bracket/generate-double-elim";
import { determineAdvanceSlot } from "@/lib/bracket/shared";
import { logEvent } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

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

async function generateForFormat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  adminId: string
) {
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("bracket_format")
    .eq("id", tournamentId)
    .single();
  return tournament?.bracket_format === "DOUBLE_ELIMINATION"
    ? runDoubleEliminationGeneration(supabase, tournamentId, adminId)
    : runBracketGeneration(supabase, tournamentId, adminId);
}

export async function generateBracket(tournamentId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const { data: existing } = await supabase
    .from("brackets")
    .select("id")
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (existing) {
    return { error: "A bracket already exists for this tournament. Use Regenerate instead." };
  }

  const result = await generateForFormat(supabase, tournamentId, user.id);
  if (!result.ok) return { error: result.message ?? "Failed to generate bracket." };

  revalidatePath(`/admin/tournaments/${tournamentId}/bracket`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function regenerateBracket(tournamentId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const { data: bracket } = await supabase
    .from("brackets")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (!bracket) return { error: "No bracket exists yet — generate one first." };
  if (bracket.status === "LOCKED") {
    return { error: "This bracket is locked and cannot be regenerated." };
  }

  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("bracket_id", bracket.id)
    .not("winner_id", "is", null);
  if ((count ?? 0) > 0) {
    return {
      error: "This bracket already has match results recorded and cannot be regenerated.",
    };
  }

  await supabase.from("matches").delete().eq("bracket_id", bracket.id);
  await supabase.from("brackets").delete().eq("id", bracket.id);

  const result = await generateForFormat(supabase, tournamentId, user.id);
  if (!result.ok) return { error: result.message ?? "Failed to regenerate bracket." };

  revalidatePath(`/admin/tournaments/${tournamentId}/bracket`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function lockBracket(tournamentId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const { data: bracket } = await supabase
    .from("brackets")
    .select("id")
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (!bracket) return { error: "Cannot lock — no bracket has been generated yet." };

  const { error } = await supabase.from("brackets").update({ status: "LOCKED" }).eq("id", bracket.id);
  if (error) return { error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}/bracket`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function advanceWinner(
  matchId: string,
  scoreA: number,
  scoreB: number,
  extras?: { evidenceUrls?: { url: string; type: string; uploaded_at: string }[]; resultNotes?: string }
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    return { error: "Scores must be non-negative whole numbers." };
  }
  if (scoreA === scoreB) return { error: "Scores cannot be tied — a match must have a winner." };

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, tournament_id, bracket_id, bracket_type, round_number, match_number, team_a_id, team_b_id, next_match_winner_id, next_match_loser_id"
    )
    .eq("id", matchId)
    .single();
  if (!match) return { error: "Match not found." };
  if (!match.team_a_id || !match.team_b_id) {
    return { error: "This match doesn't have two teams yet." };
  }

  if (match.bracket_id) {
    const { data: bracket } = await supabase
      .from("brackets")
      .select("status")
      .eq("id", match.bracket_id)
      .single();
    if (bracket?.status === "LOCKED") {
      return { error: "This bracket is locked — results can no longer be edited." };
    }
  }

  const winnerId = scoreA > scoreB ? match.team_a_id : match.team_b_id;
  const loserId = scoreA > scoreB ? match.team_b_id : match.team_a_id;

  const updatePayload: Record<string, unknown> = {
    score_a: scoreA,
    score_b: scoreB,
    winner_id: winnerId,
    status: "COMPLETED",
  };
  if (extras?.evidenceUrls) updatePayload.evidence_urls = extras.evidenceUrls;
  if (extras?.resultNotes !== undefined) updatePayload.result_notes = extras.resultNotes || null;

  const { error } = await supabase.from("matches").update(updatePayload).eq("id", matchId);
  if (error) return { error: error.message };

  logEvent({
    event: "match.completed",
    matchId,
    tournamentId: match.tournament_id,
    bracketType: match.bracket_type,
    winnerId,
    scoreA,
    scoreB,
    completedBy: user.id,
  });

  // Winner progression.
  if (match.next_match_winner_id) {
    const { data: target } = await supabase
      .from("matches")
      .select("bracket_type, round_number")
      .eq("id", match.next_match_winner_id)
      .single();
    if (target) {
      const field = determineAdvanceSlot(match, target, "winner");
      await supabase.from("matches").update({ [field]: winnerId }).eq("id", match.next_match_winner_id);
    }
  }

  // Loser progression (double elimination only — single-elim matches never
  // have next_match_loser_id set).
  if (match.next_match_loser_id) {
    const { data: target } = await supabase
      .from("matches")
      .select("bracket_type, round_number")
      .eq("id", match.next_match_loser_id)
      .single();
    if (target) {
      const field = determineAdvanceSlot(match, target, "loser");
      await supabase.from("matches").update({ [field]: loserId }).eq("id", match.next_match_loser_id);
    }
  }

  // Grand Final special case: decide whether the tournament is over or a
  // reset match is needed. (The DB trigger only auto-completes 'upper' and
  // 'grand_final_reset' matches — plain 'grand_final' is handled here since
  // whether it's actually final depends on which side won.)
  if (match.bracket_type === "grand_final") {
    const upperChampionWon = winnerId === match.team_a_id;
    if (upperChampionWon) {
      await completeTournament(supabase, match.tournament_id, winnerId!, loserId);
    } else {
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("grand_final_reset_enabled, format")
        .eq("id", match.tournament_id)
        .single();
      if (tournament?.grand_final_reset_enabled) {
        await supabase.from("matches").insert({
          tournament_id: match.tournament_id,
          bracket_id: match.bracket_id,
          bracket_type: "grand_final_reset",
          round_number: match.round_number + 1,
          match_number: 0,
          team_a_id: match.team_a_id,
          team_b_id: match.team_b_id,
          best_of: tournament.format || "BO1",
          status: "PENDING",
          score_a: 0,
          score_b: 0,
        });
      } else {
        await completeTournament(supabase, match.tournament_id, winnerId!, loserId);
      }
    }
  }

  // Terminal-match types only — a lower-bracket or non-final upper match
  // can never be what completes the tournament, so skip the extra query.
  const isTerminalType =
    match.bracket_type === "grand_final" ||
    match.bracket_type === "grand_final_reset" ||
    (match.bracket_type === "upper" && !match.next_match_winner_id);
  if (isTerminalType) {
    await notifyChampionCrowned(supabase, match.tournament_id);
  }

  revalidatePath(`/admin/tournaments/${match.tournament_id}/bracket`);
  revalidatePath(`/tournaments/${match.tournament_id}`);
  return { success: true };
}

/**
 * Fires once the tournament's status/champion columns actually reflect
 * completion — true whether that happened via the maybe_complete_tournament
 * DB trigger (upper/grand_final_reset terminal matches) or via this file's
 * own completeTournament() call (the plain grand_final case). Notifies both
 * finalists' team owners; the tournament category preference gates delivery
 * exactly like every other tournament notification.
 */
async function notifyChampionCrowned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string
) {
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("title, status, champion_team_id, champion_team_name, runner_up_team_id, runner_up_team_name")
    .eq("id", tournamentId)
    .single();
  if (!tournament || tournament.status !== "COMPLETED" || !tournament.champion_team_id) return;

  const [{ data: championTeam }, { data: runnerUpTeam }] = await Promise.all([
    supabase.from("teams").select("owner_id").eq("id", tournament.champion_team_id).single(),
    tournament.runner_up_team_id
      ? supabase.from("teams").select("owner_id").eq("id", tournament.runner_up_team_id).single()
      : Promise.resolve({ data: null }),
  ]);

  if (championTeam?.owner_id) {
    await createNotification(
      supabase,
      championTeam.owner_id,
      "Champion Crowned",
      `${tournament.champion_team_name ?? "Your team"} won ${tournament.title}! Congratulations.`,
      "tournament"
    );
  }
  if (runnerUpTeam?.owner_id) {
    await createNotification(
      supabase,
      runnerUpTeam.owner_id,
      "Champion Crowned",
      `${tournament.title} has a champion: ${tournament.champion_team_name ?? "the winning team"}. ${
        tournament.runner_up_team_name ?? "Your team"
      } finished as runner-up — well played.`,
      "tournament"
    );
  }
}

async function completeTournament(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  championTeamId: string,
  runnerUpTeamId: string | null
) {
  const [{ data: team }, { data: runnerUp }] = await Promise.all([
    supabase.from("teams").select("team_name").eq("id", championTeamId).single(),
    runnerUpTeamId
      ? supabase.from("teams").select("team_name").eq("id", runnerUpTeamId).single()
      : Promise.resolve({ data: null }),
  ]);
  await supabase
    .from("tournaments")
    .update({
      status: "COMPLETED",
      champion_team_id: championTeamId,
      champion_team_name: team?.team_name ?? null,
      champion_date: new Date().toISOString(),
      runner_up_team_id: runnerUpTeamId,
      runner_up_team_name: runnerUp?.team_name ?? null,
    })
    .eq("id", tournamentId);
}
