import { createClient } from "@/lib/supabase/server";
import type { Bracket, Match } from "@/lib/types/database";

export async function getBracket(tournamentId: string): Promise<Bracket | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brackets")
    .select("*")
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  return (data as Bracket | null) ?? null;
}

export interface MatchWithTeams extends Match {
  team_a: { id: string; team_name: string; logo_url: string | null } | null;
  team_b: { id: string; team_name: string; logo_url: string | null } | null;
  winner: { id: string; team_name: string } | null;
}

export interface BracketRound {
  round_number: number;
  matches: MatchWithTeams[];
}

export async function getBracketMatches(tournamentId: string): Promise<BracketRound[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(
      "*, team_a:team_a_id(id, team_name, logo_url), team_b:team_b_id(id, team_name, logo_url), winner:winner_id(id, team_name)"
    )
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true })
    .order("match_number", { ascending: true });

  const matches = (data ?? []) as unknown as MatchWithTeams[];
  const byRound = new Map<number, MatchWithTeams[]>();
  for (const m of matches) {
    const list = byRound.get(m.round_number) ?? [];
    list.push(m);
    byRound.set(m.round_number, list);
  }
  return Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round_number, roundMatches]) => ({ round_number, matches: roundMatches }));
}
