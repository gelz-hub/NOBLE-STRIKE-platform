import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  nextPowerOf2,
  shuffle,
  buildRound1Slots,
  runInChunks,
  fetchApprovedTeamIds,
  validateBracketIntegrity,
} from "./shared";
import type { GenerateBracketResult } from "./generate";

interface LbRoundDef {
  round: number;
  count: number;
  kind: "seed" | "consolidation" | "drop";
  feedsFromUBRound?: number;
}

/**
 * Standard double-elimination lower-bracket shape: for k upper-bracket
 * rounds, the lower bracket has 2(k-1) rounds, alternating "drop" rounds
 * (LB survivors face fresh UB losers) and "consolidation" rounds (LB
 * survivors face each other). Round 1 is a special "seed" round that just
 * pairs UB round 1's losers against each other.
 */
function buildLbRoundDefs(k: number, paddedSize: number): LbRoundDef[] {
  if (k < 2) return []; // 2-team bracket: no lower bracket, UB loser goes straight to Grand Final.

  const defs: LbRoundDef[] = [];
  let currentSize = paddedSize / 4;
  let round = 1;
  let ubRoundToFeed = 2;
  const target = 2 * (k - 1);

  defs.push({ round: round++, count: currentSize, kind: "seed" });
  while (defs.length < target) {
    defs.push({ round: round++, count: currentSize, kind: "drop", feedsFromUBRound: ubRoundToFeed });
    ubRoundToFeed++;
    if (defs.length >= target) break;
    currentSize = currentSize / 2;
    defs.push({ round: round++, count: currentSize, kind: "consolidation" });
  }
  return defs;
}

type MatchRow = {
  tournament_id: string;
  bracket_id: string;
  bracket_type: "upper" | "lower" | "grand_final";
  round_number: number;
  match_number: number;
  best_of: string;
  status: "PENDING";
  score_a: number;
  score_b: number;
};

export async function runDoubleEliminationGeneration(
  supabase: SupabaseClient,
  tournamentId: string,
  adminId: string
): Promise<GenerateBracketResult> {
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, format")
    .eq("id", tournamentId)
    .single();
  if (!tournament) return { ok: false, error: "TOURNAMENT_NOT_FOUND", message: "Tournament not found." };

  const teamIds = await fetchApprovedTeamIds(supabase, tournamentId);
  if (teamIds.length < 2) {
    return {
      ok: false,
      error: "NOT_ENOUGH_TEAMS",
      message: "At least 2 approved teams are required to generate a bracket.",
    };
  }

  const paddedSize = nextPowerOf2(teamIds.length);
  const k = Math.log2(paddedSize); // upper bracket rounds
  const shuffled = shuffle(teamIds);
  const round1Slots = buildRound1Slots(shuffled, paddedSize);
  const bestOf = tournament.format || "BO1";
  const lbRoundDefs = buildLbRoundDefs(k, paddedSize);

  const { data: bracket, error: bracketError } = await supabase
    .from("brackets")
    .insert({
      tournament_id: tournamentId,
      bracket_format: "DOUBLE_ELIMINATION",
      status: "ACTIVE",
      generated_by: adminId,
    })
    .select("id")
    .single();
  if (bracketError || !bracket) {
    return { ok: false, message: bracketError?.message ?? "Failed to create bracket." };
  }

  // 1. Build every match row: upper (k rounds), lower (lbRoundDefs), grand final (1).
  const matchRows: MatchRow[] = [];
  for (let r = 1; r <= k; r++) {
    const count = paddedSize / 2 ** r;
    for (let mi = 0; mi < count; mi++) {
      matchRows.push({
        tournament_id: tournamentId,
        bracket_id: bracket.id,
        bracket_type: "upper",
        round_number: r,
        match_number: mi,
        best_of: bestOf,
        status: "PENDING",
        score_a: 0,
        score_b: 0,
      });
    }
  }
  for (const def of lbRoundDefs) {
    for (let mi = 0; mi < def.count; mi++) {
      matchRows.push({
        tournament_id: tournamentId,
        bracket_id: bracket.id,
        bracket_type: "lower",
        round_number: def.round,
        match_number: mi,
        best_of: bestOf,
        status: "PENDING",
        score_a: 0,
        score_b: 0,
      });
    }
  }
  matchRows.push({
    tournament_id: tournamentId,
    bracket_id: bracket.id,
    bracket_type: "grand_final",
    round_number: 1,
    match_number: 0,
    best_of: bestOf,
    status: "PENDING",
    score_a: 0,
    score_b: 0,
  });

  const { data: inserted, error: insertError } = await supabase
    .from("matches")
    .insert(matchRows)
    .select("id, bracket_type, round_number, match_number");
  if (insertError || !inserted) {
    await supabase.from("brackets").delete().eq("id", bracket.id);
    return { ok: false, message: insertError?.message ?? "Failed to create matches." };
  }

  const idOf = new Map<string, string>();
  for (const m of inserted) idOf.set(`${m.bracket_type}-${m.round_number}-${m.match_number}`, m.id);
  const ub = (r: number, mi: number) => idOf.get(`upper-${r}-${mi}`)!;
  const lb = (r: number, mi: number) => idOf.get(`lower-${r}-${mi}`)!;
  const gf = idOf.get("grand_final-1-0")!;

  const lbByRound = new Map(lbRoundDefs.map((d) => [d.round, d]));
  const lastLbRound = lbRoundDefs.at(-1)?.round ?? 0;

  // 2. Link winner progression.
  const winnerLinks: { id: string; next_match_winner_id: string }[] = [];
  for (let r = 1; r < k; r++) {
    const count = paddedSize / 2 ** r;
    for (let mi = 0; mi < count; mi++) {
      winnerLinks.push({ id: ub(r, mi), next_match_winner_id: ub(r + 1, Math.floor(mi / 2)) });
    }
  }
  winnerLinks.push({ id: ub(k, 0), next_match_winner_id: gf }); // UB champion -> Grand Final (team_a)

  for (const def of lbRoundDefs) {
    if (def.round === lastLbRound) {
      for (let mi = 0; mi < def.count; mi++) {
        winnerLinks.push({ id: lb(def.round, mi), next_match_winner_id: gf }); // LB champion -> Grand Final (team_b)
      }
      continue;
    }
    const next = lbByRound.get(def.round + 1)!;
    for (let mi = 0; mi < def.count; mi++) {
      const nextMi = next.kind === "consolidation" ? Math.floor(mi / 2) : mi;
      winnerLinks.push({ id: lb(def.round, mi), next_match_winner_id: lb(def.round + 1, nextMi) });
    }
  }

  // 3. Link loser progression: every upper match's loser drops to the lower bracket.
  const loserLinks: { id: string; next_match_loser_id: string }[] = [];
  if (k >= 2) {
    // UB round 1 losers seed LB round 1 directly.
    const round1Count = paddedSize / 2;
    for (let mi = 0; mi < round1Count; mi++) {
      loserLinks.push({ id: ub(1, mi), next_match_loser_id: lb(1, Math.floor(mi / 2)) });
    }
    // UB rounds 2..k losers feed the LB "drop" round assigned to that UB round.
    for (const def of lbRoundDefs) {
      if (def.kind !== "drop" || !def.feedsFromUBRound) continue;
      const ubRound = def.feedsFromUBRound;
      for (let mi = 0; mi < def.count; mi++) {
        loserLinks.push({ id: ub(ubRound, mi), next_match_loser_id: lb(def.round, mi) });
      }
    }
  } else {
    // 2-team bracket: no lower bracket — the sole UB match's loser goes straight to the Grand Final.
    loserLinks.push({ id: ub(1, 0), next_match_loser_id: gf });
  }

  await runInChunks(winnerLinks, 20, async (op) => {
    await supabase.from("matches").update({ next_match_winner_id: op.next_match_winner_id }).eq("id", op.id);
  });
  await runInChunks(loserLinks, 20, async (op) => {
    await supabase.from("matches").update({ next_match_loser_id: op.next_match_loser_id }).eq("id", op.id);
  });

  // 4. Seed slot conventions:
  //    - Drop rounds: team_a = incoming LB survivor, team_b = dropped UB loser.
  //    - The one exception is when a UB loser lands directly in the Grand
  //      Final (2-team case) — it always takes team_b there.
  //    - Grand Final: team_a = UB champion, team_b = LB champion.
  // We encode this by which *_id column each link targets; loser links
  // always target team_b except the UB1->LB1 seed round, where the first
  // (even-indexed) UB1 match's loser is team_a and the second is team_b —
  // handled below via isEven, matching the "advanceWinner" propagation
  // convention used for winners in the single-elimination generator.

  // 5. Populate round 1 (upper bracket) with seeded teams, auto-resolving byes.
  type Slot = { team_a_id: string | null; team_b_id: string | null };
  const ubState = new Map<number, Map<number, Slot>>();
  for (let r = 1; r <= k; r++) ubState.set(r, new Map());

  const round1Count = paddedSize / 2;
  const round1Ops: {
    id: string;
    mi: number;
    team_a_id: string | null;
    team_b_id: string | null;
    winner_id: string | null;
    status: "PENDING" | "COMPLETED";
    score_a: number;
    score_b: number;
  }[] = [];
  for (let mi = 0; mi < round1Count; mi++) {
    const teamA = round1Slots[mi * 2];
    const teamB = round1Slots[mi * 2 + 1];
    const id = ub(1, mi);
    if (teamA && !teamB) {
      round1Ops.push({ id, mi, team_a_id: teamA, team_b_id: null, winner_id: teamA, status: "COMPLETED", score_a: 1, score_b: 0 });
    } else if (!teamA && teamB) {
      round1Ops.push({ id, mi, team_a_id: null, team_b_id: teamB, winner_id: teamB, status: "COMPLETED", score_a: 0, score_b: 1 });
    } else {
      round1Ops.push({ id, mi, team_a_id: teamA, team_b_id: teamB, winner_id: null, status: "PENDING", score_a: 0, score_b: 0 });
    }
  }
  await runInChunks(round1Ops, 20, async (op) => {
    await supabase
      .from("matches")
      .update({
        team_a_id: op.team_a_id,
        team_b_id: op.team_b_id,
        winner_id: op.winner_id,
        status: op.status,
        score_a: op.score_a,
        score_b: op.score_b,
      })
      .eq("id", op.id);
  });

  // Bye wins never produce a loser (only one real team was ever present), so
  // they never populate the lower bracket — only winner-side propagation
  // into upper round 2 applies here, exactly like single elimination.
  for (const op of round1Ops) {
    if (op.winner_id && k >= 2) {
      const nextMatchNumber = Math.floor(op.mi / 2);
      const isEven = op.mi % 2 === 0;
      const slot = ubState.get(2)!.get(nextMatchNumber) ?? { team_a_id: null, team_b_id: null };
      if (isEven) slot.team_a_id = op.winner_id;
      else slot.team_b_id = op.winner_id;
      ubState.get(2)!.set(nextMatchNumber, slot);
    }
  }

  // 6. Forward sweep across upper bracket rounds 2..k, same cascading-bye
  // logic as single elimination. A bye-resolved match here never drops a
  // loser to LB (there wasn't a real opponent to lose).
  for (let r = 2; r <= k; r++) {
    const count = paddedSize / 2 ** r;
    for (let mi = 0; mi < count; mi++) {
      const slot = ubState.get(r)!.get(mi);
      if (!slot) continue;
      const id = ub(r, mi);
      if (slot.team_a_id && slot.team_b_id) {
        await supabase.from("matches").update({ team_a_id: slot.team_a_id, team_b_id: slot.team_b_id }).eq("id", id);
      } else if (slot.team_a_id || slot.team_b_id) {
        const winnerId = (slot.team_a_id ?? slot.team_b_id)!;
        await supabase
          .from("matches")
          .update({
            team_a_id: slot.team_a_id,
            team_b_id: slot.team_b_id,
            winner_id: winnerId,
            status: "COMPLETED",
            score_a: slot.team_a_id ? 1 : 0,
            score_b: slot.team_b_id ? 1 : 0,
          })
          .eq("id", id);
        if (r < k) {
          const nextMatchNumber = Math.floor(mi / 2);
          const isEven = mi % 2 === 0;
          const nextSlot = ubState.get(r + 1)!.get(nextMatchNumber) ?? { team_a_id: null, team_b_id: null };
          if (isEven) nextSlot.team_a_id = winnerId;
          else nextSlot.team_b_id = winnerId;
          ubState.get(r + 1)!.set(nextMatchNumber, nextSlot);
        } else if (k >= 2) {
          // UB final resolved by cascading byes (extremely small brackets) —
          // still no loser to drop, since it was a bye win.
        }
      }
    }
  }

  const { data: finalMatches } = await supabase
    .from("matches")
    .select("id, bracket_type, round_number, match_number, team_a_id, team_b_id, next_match_winner_id, next_match_loser_id")
    .eq("bracket_id", bracket.id);
  const problems = validateBracketIntegrity(finalMatches ?? []);
  if (problems.length > 0) {
    await supabase.from("matches").delete().eq("bracket_id", bracket.id);
    await supabase.from("brackets").delete().eq("id", bracket.id);
    return { ok: false, message: `Bracket generation produced an invalid structure: ${problems[0]}` };
  }

  return { ok: true, bracketId: bracket.id };
}
