"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { REQUIRED_ROLES } from "@/lib/validation/team";

export type ActionResult = { error: string } | { success: true };

async function hasCompleteRoster(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string
): Promise<boolean> {
  const { data } = await supabase.from("team_members").select("role").eq("team_id", teamId);
  const roles = new Set((data ?? []).map((m) => m.role));
  return REQUIRED_ROLES.every((r) => roles.has(r));
}

export async function registerTeamForTournament(
  teamId: string,
  tournamentId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to register a team." };

  const { data: team } = await supabase
    .from("teams")
    .select("id, owner_id, team_name")
    .eq("id", teamId)
    .single();
  if (!team) return { error: "Team not found." };
  if (team.owner_id !== user.id) return { error: "You do not own this team." };

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, title, status, registration_deadline, max_teams")
    .eq("id", tournamentId)
    .single();
  if (!tournament) return { error: "Tournament not found." };
  if (tournament.status !== "REGISTRATION_OPEN") {
    return { error: "Registration is not open for this tournament." };
  }
  if (new Date(tournament.registration_deadline).getTime() < Date.now()) {
    return { error: "The registration deadline for this tournament has passed." };
  }
  const { count: approvedCount } = await supabase
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "APPROVED");
  if ((approvedCount ?? 0) >= tournament.max_teams) {
    return { error: "This tournament has reached its maximum number of teams." };
  }

  const complete = await hasCompleteRoster(supabase, teamId);
  if (!complete) {
    return {
      error: "Your team's roster is incomplete. EXP, JUNGLE, MID, GOLD, and ROAM are all required.",
    };
  }

  const { data: existing } = await supabase
    .from("tournament_registrations")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "PENDING" || existing.status === "APPROVED") {
      return { error: "This team is already registered for this tournament." };
    }
    // REJECTED or WITHDRAWN — allow re-registration by resetting the row.
    const { error } = await supabase
      .from("tournament_registrations")
      .update({
        status: "PENDING",
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
        withdrawn_at: null,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("tournament_registrations").insert({
      tournament_id: tournamentId,
      team_id: teamId,
      status: "PENDING",
    });
    if (error) return { error: error.message };
  }

  await createNotification(
    supabase,
    user.id,
    "Registration Submitted",
    `${team.team_name}'s registration for ${tournament.title} is pending review.`,
    "tournament"
  );

  revalidatePath("/dashboard/registrations");
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function withdrawRegistration(registrationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, status, team_id, tournament_id, teams(team_name), tournaments(title)")
    .eq("id", registrationId)
    .single<{
      id: string;
      status: string;
      team_id: string;
      tournament_id: string;
      teams: { team_name: string } | null;
      tournaments: { title: string } | null;
    }>();

  if (!registration) return { error: "Registration not found." };
  if (registration.status !== "PENDING") {
    return { error: "Only pending registrations can be withdrawn." };
  }

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status: "WITHDRAWN", withdrawn_at: new Date().toISOString() })
    .eq("id", registrationId);
  if (error) return { error: error.message };

  await createNotification(
    supabase,
    user.id,
    "Registration Withdrawn",
    `${registration.teams?.team_name ?? "Your team"}'s registration for ${
      registration.tournaments?.title ?? "the tournament"
    } was withdrawn.`,
    "tournament"
  );

  revalidatePath("/dashboard/registrations");
  revalidatePath(`/teams/${registration.team_id}`);
  revalidatePath(`/tournaments/${registration.tournament_id}`);
  return { success: true };
}

export interface MyRegistrationRow {
  id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  teams: { id: string; team_name: string } | null;
  tournaments: { id: string; title: string } | null;
}

export async function getMyRegistrations(): Promise<MyRegistrationRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: teams } = await supabase.from("teams").select("id").eq("owner_id", user.id);
  const teamIds = (teams ?? []).map((t) => t.id);
  if (teamIds.length === 0) return [];

  const { data } = await supabase
    .from("tournament_registrations")
    .select("id, status, created_at, reviewed_at, rejection_reason, teams(id, team_name), tournaments(id, title)")
    .in("team_id", teamIds)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as MyRegistrationRow[];
}
