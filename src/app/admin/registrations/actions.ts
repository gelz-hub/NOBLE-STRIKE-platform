"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { logEvent } from "@/lib/logger";

export type ActionResult = { error: string } | { success: true };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, user, isAdmin: profile?.role === "admin" };
}

async function loadRegistrationForNotify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  registrationId: string
) {
  const { data } = await supabase
    .from("tournament_registrations")
    .select("id, team_id, tournament_id, teams(owner_id, team_name), tournaments(title)")
    .eq("id", registrationId)
    .single<{
      id: string;
      team_id: string;
      tournament_id: string;
      teams: { owner_id: string; team_name: string } | null;
      tournaments: { title: string } | null;
    }>();
  return data;
}

export async function approveRegistration(registrationId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const registration = await loadRegistrationForNotify(supabase, registrationId);
  if (!registration) return { error: "Registration not found." };

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status: "APPROVED", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", registrationId);
  if (error) return { error: error.message };

  if (registration.teams?.owner_id) {
    await createNotification(
      supabase,
      registration.teams.owner_id,
      "Registration Approved",
      `${registration.teams.team_name}'s registration for ${
        registration.tournaments?.title ?? "the tournament"
      } was approved.`,
      "tournament"
    );
  }

  logEvent({
    event: "registration.approved",
    registrationId,
    tournamentId: registration.tournament_id,
    teamId: registration.team_id,
    approvedBy: user.id,
  });

  revalidatePath("/admin/registrations");
  revalidatePath("/dashboard/registrations");
  revalidatePath(`/teams/${registration.team_id}`);
  revalidatePath(`/tournaments/${registration.tournament_id}`);
  return { success: true };
}

export async function rejectRegistration(
  registrationId: string,
  rejectionReason: string
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };
  if (!rejectionReason.trim()) return { error: "A rejection reason is required." };

  const registration = await loadRegistrationForNotify(supabase, registrationId);
  if (!registration) return { error: "Registration not found." };

  const { error } = await supabase
    .from("tournament_registrations")
    .update({
      status: "REJECTED",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason.trim(),
    })
    .eq("id", registrationId);
  if (error) return { error: error.message };

  if (registration.teams?.owner_id) {
    await createNotification(
      supabase,
      registration.teams.owner_id,
      "Registration Rejected",
      `${registration.teams.team_name}'s registration for ${
        registration.tournaments?.title ?? "the tournament"
      } was rejected. Reason: ${rejectionReason.trim()}`,
      "tournament"
    );
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/dashboard/registrations");
  revalidatePath(`/teams/${registration.team_id}`);
  revalidatePath(`/tournaments/${registration.tournament_id}`);
  return { success: true };
}

export interface AdminRegistrationRow {
  id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  teams: {
    id: string;
    team_name: string;
    logo_url: string | null;
    banner_url: string | null;
  } | null;
  tournaments: { id: string; title: string } | null;
}

export interface GetTournamentRegistrationsParams {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getTournamentRegistrations({
  status,
  search,
  page = 1,
  pageSize = 15,
}: GetTournamentRegistrationsParams): Promise<{ rows: AdminRegistrationRow[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("tournament_registrations")
    .select(
      "id, status, created_at, reviewed_at, rejection_reason, teams!inner(id, team_name, logo_url, banner_url), tournaments(id, title)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (search && search.trim()) query = query.ilike("teams.team_name", `%${search.trim()}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await query.range(from, to);

  return { rows: (data ?? []) as unknown as AdminRegistrationRow[], total: count ?? 0 };
}

export async function getTeamRosterForReview(teamId: string) {
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("*").eq("id", teamId).single();
  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId);
  return { team: team ?? null, members: members ?? [] };
}
