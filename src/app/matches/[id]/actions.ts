"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { openDisputeSchema } from "@/lib/validation/match";
import { checkRateLimit } from "@/lib/rate-limit";

export type ActionResult = { error: string } | { success: true };

export async function openDispute(
  matchId: string,
  teamId: string,
  explanation: string,
  evidenceUrls: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to open a dispute." };

  const { allowed, retryAfterSeconds } = await checkRateLimit("dispute-create", user.id);
  if (!allowed) {
    return { error: `Too many disputes opened recently. Try again in ${retryAfterSeconds}s.` };
  }

  const parsed = openDisputeSchema.safeParse({ explanation, evidence_urls: evidenceUrls });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { data: team } = await supabase.from("teams").select("id, owner_id, team_name").eq("id", teamId).single();
  if (!team) return { error: "Team not found." };
  if (team.owner_id !== user.id) return { error: "You do not own this team." };

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, tournament_id, team_a_id, team_b_id, status, team_a:team_a_id(owner_id, team_name), team_b:team_b_id(owner_id, team_name), tournament:tournament_id(title)"
    )
    .eq("id", matchId)
    .single<{
      id: string;
      tournament_id: string;
      team_a_id: string | null;
      team_b_id: string | null;
      status: string;
      team_a: { owner_id: string; team_name: string } | null;
      team_b: { owner_id: string; team_name: string } | null;
      tournament: { title: string } | null;
    }>();
  if (!match) return { error: "Match not found." };
  if (match.team_a_id !== teamId && match.team_b_id !== teamId) {
    return { error: "Your team did not play in this match." };
  }
  if (match.status !== "COMPLETED" && match.status !== "DISPUTED") {
    return { error: "Only completed matches can be disputed." };
  }

  const { error } = await supabase.from("match_disputes").insert({
    match_id: matchId,
    team_id: teamId,
    opened_by: user.id,
    explanation: parsed.data.explanation,
    evidence_urls: parsed.data.evidence_urls,
  });
  if (error) return { error: error.message };

  const opponentOwnerId = match.team_a_id === teamId ? match.team_b?.owner_id : match.team_a?.owner_id;
  if (opponentOwnerId) {
    await createNotification(
      supabase,
      opponentOwnerId,
      "Dispute Opened",
      `${team.team_name} opened a dispute for your match in ${match.tournament?.title ?? "the tournament"}.`,
      "match"
    );
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath("/admin/matches");
  return { success: true };
}
