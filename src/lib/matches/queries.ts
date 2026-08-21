import { createClient } from "@/lib/supabase/server";
import type { Match, MatchDispute, MatchStatus } from "@/lib/types/database";

export interface TeamRef {
  id: string;
  team_name: string;
  logo_url: string | null;
}

export interface MatchWithContext extends Match {
  team_a: TeamRef | null;
  team_b: TeamRef | null;
  winner: TeamRef | null;
  tournament: { id: string; title: string; slug: string; format: string } | null;
  referee: { id: string; username: string | null } | null;
}

const MATCH_SELECT =
  "*, team_a:team_a_id(id, team_name, logo_url), team_b:team_b_id(id, team_name, logo_url), winner:winner_id(id, team_name, logo_url), tournament:tournament_id(id, title, slug, format), referee:referee_id(id, username)";

export async function getMatch(matchId: string): Promise<MatchWithContext | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("matches").select(MATCH_SELECT).eq("id", matchId).single();
  return (data as unknown as MatchWithContext) ?? null;
}

export interface AdminMatchFilters {
  status?: MatchStatus;
  tournamentId?: string;
  refereeId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminMatches({
  status,
  tournamentId,
  refereeId,
  search,
  page = 1,
  pageSize = 20,
}: AdminMatchFilters): Promise<{ rows: MatchWithContext[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("matches")
    .select(MATCH_SELECT, { count: "exact" })
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (tournamentId) query = query.eq("tournament_id", tournamentId);
  if (refereeId) query = query.eq("referee_id", refereeId);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await query.range(from, to);

  let rows = (data ?? []) as unknown as MatchWithContext[];
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(
      (m) =>
        m.team_a?.team_name.toLowerCase().includes(q) ||
        m.team_b?.team_name.toLowerCase().includes(q) ||
        m.tournament?.title.toLowerCase().includes(q)
    );
  }

  return { rows, total: count ?? 0 };
}

export async function getMatchDisputes(matchId: string): Promise<MatchDispute[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_disputes")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });
  return (data ?? []) as MatchDispute[];
}

/** Upcoming / live / recently-completed matches for a tournament's public page. */
export async function getTournamentMatchSummary(tournamentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("tournament_id", tournamentId)
    .not("team_a_id", "is", null)
    .not("team_b_id", "is", null)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  const all = (data ?? []) as unknown as MatchWithContext[];
  return {
    upcoming: all.filter((m) => m.status === "SCHEDULED" || m.status === "READY"),
    live: all.filter((m) => m.status === "LIVE"),
    recentResults: all
      .filter((m) => m.status === "COMPLETED")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6),
  };
}

/** All admin/staff profiles selectable as a referee (any account works — see ARCHITECTURE.md). */
export async function getRefereeOptions(): Promise<{ id: string; username: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .order("username", { ascending: true })
    .limit(200);
  return data ?? [];
}
