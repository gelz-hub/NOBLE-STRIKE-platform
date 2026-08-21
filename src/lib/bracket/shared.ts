import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Fisher-Yates shuffle (RANDOM seeding — the only supported method today). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Places shuffled teams + byes into round-1 slots such that no pair ever
 * gets two byes. Guaranteed possible because byeCount < pairCount always
 * holds (paddedSize is the *smallest* power of 2 >= teamCount).
 */
export function buildRound1Slots(shuffledTeamIds: string[], paddedSize: number): (string | null)[] {
  const pairCount = paddedSize / 2;
  const byeCount = paddedSize - shuffledTeamIds.length;
  const slots: (string | null)[] = new Array(paddedSize).fill(null);
  let teamIdx = 0;
  for (let p = 0; p < pairCount; p++) {
    slots[p * 2] = shuffledTeamIds[teamIdx++];
    slots[p * 2 + 1] = p < byeCount ? null : shuffledTeamIds[teamIdx++];
  }
  return slots;
}

/** Runs `fn` over `items` in concurrency-limited chunks. */
export async function runInChunks<T>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<void>
) {
  for (let i = 0; i < items.length; i += chunkSize) {
    await Promise.all(items.slice(i, i + chunkSize).map(fn));
  }
}

/**
 * Determines which slot (team_a_id / team_b_id) a winner or loser lands in
 * on its next match, purely from bracket_type/round_number/match_number —
 * no extra "round kind" column needed. Lower-bracket round kind is derived
 * arithmetically: round 1 is the seed round (pairs fresh upper-round-1
 * losers), even rounds thereafter are "drop" rounds (a lower survivor faces
 * a freshly dropped upper-bracket loser), odd rounds thereafter are
 * "consolidation" rounds (two lower survivors face each other) — this
 * alternation is guaranteed by how generate-double-elim.ts builds the
 * lower bracket.
 */
export function determineAdvanceSlot(
  source: { bracket_type: string; match_number: number },
  target: { bracket_type: string; round_number: number },
  side: "winner" | "loser"
): "team_a_id" | "team_b_id" {
  const isEven = source.match_number % 2 === 0;

  if (target.bracket_type === "grand_final" || target.bracket_type === "grand_final_reset") {
    if (side === "loser") return "team_b_id"; // only reachable via the 2-team (k=1) degenerate bracket
    return source.bracket_type === "upper" ? "team_a_id" : "team_b_id";
  }

  if (target.bracket_type === "upper") {
    return isEven ? "team_a_id" : "team_b_id";
  }

  // target.bracket_type === "lower"
  if (target.round_number === 1) {
    return isEven ? "team_a_id" : "team_b_id"; // seed round: pairs UB1 losers directly
  }
  const isDropRound = target.round_number % 2 === 0;
  if (isDropRound) {
    return side === "winner" ? "team_a_id" : "team_b_id";
  }
  return isEven ? "team_a_id" : "team_b_id"; // consolidation round
}

export async function fetchApprovedTeamIds(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("tournament_registrations")
    .select("team_id")
    .eq("tournament_id", tournamentId)
    .eq("status", "APPROVED");
  return (data ?? []).map((r) => r.team_id as string);
}

interface MatchForValidation {
  id: string;
  bracket_type: string;
  round_number: number;
  match_number: number;
  team_a_id: string | null;
  team_b_id: string | null;
  next_match_winner_id: string | null;
  next_match_loser_id: string | null;
}

/**
 * Post-generation sanity check: every link target actually exists, no team
 * occupies two round-1 slots, and every non-final match is actually linked
 * to a next match (no orphans). Returns a list of human-readable problems
 * (empty = valid).
 */
export function validateBracketIntegrity(matches: MatchForValidation[]): string[] {
  const problems: string[] = [];
  const ids = new Set(matches.map((m) => m.id));

  for (const m of matches) {
    if (m.next_match_winner_id && !ids.has(m.next_match_winner_id)) {
      problems.push(`Match ${m.id} has a broken winner link.`);
    }
    if (m.next_match_loser_id && !ids.has(m.next_match_loser_id)) {
      problems.push(`Match ${m.id} has a broken loser link.`);
    }
  }

  const round1 = matches.filter((m) => m.bracket_type === "upper" && m.round_number === 1);
  const seen = new Set<string>();
  for (const m of round1) {
    for (const teamId of [m.team_a_id, m.team_b_id]) {
      if (!teamId) continue;
      if (seen.has(teamId)) problems.push(`Team ${teamId} appears in round 1 twice.`);
      seen.add(teamId);
    }
  }

  const finals = matches.filter((m) => !m.next_match_winner_id);
  if (finals.length !== 1) {
    problems.push(`Expected exactly 1 terminal match, found ${finals.length}.`);
  }

  return problems;
}
