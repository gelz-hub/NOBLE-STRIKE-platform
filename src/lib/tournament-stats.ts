import { createClient } from "@/lib/supabase/server";

export interface TournamentStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  withdrawn: number;
  availableSlots: number;
  progressPct: number;
}

/** Shared by both the admin tournament pages and the public tournament page. */
export async function getTournamentStats(
  tournamentId: string,
  maxTeams: number
): Promise<TournamentStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_registrations")
    .select("status")
    .eq("tournament_id", tournamentId);

  const rows = data ?? [];
  const approved = rows.filter((r) => r.status === "APPROVED").length;
  const pending = rows.filter((r) => r.status === "PENDING").length;
  const rejected = rows.filter((r) => r.status === "REJECTED").length;
  const withdrawn = rows.filter((r) => r.status === "WITHDRAWN").length;

  return {
    total: rows.length,
    approved,
    pending,
    rejected,
    withdrawn,
    availableSlots: Math.max(0, maxTeams - approved),
    progressPct: maxTeams > 0 ? Math.min(100, Math.round((approved / maxTeams) * 100)) : 0,
  };
}
