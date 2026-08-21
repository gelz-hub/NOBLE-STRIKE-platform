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

export type BracketGenerationError =
  | "NOT_ENOUGH_TEAMS"
  | "TOURNAMENT_NOT_FOUND"
  | "BRACKET_EXISTS";

export interface GenerateBracketResult {
  ok: boolean;
  error?: BracketGenerationError;
  message?: string;
  bracketId?: string;
}

/**
 * Generates a single-elimination bracket for a tournament from its APPROVED
 * registrations. Runs entirely through the caller's own (RLS-respecting)
 * Supabase client — never a service-role client — so this only ever
 * succeeds when invoked by an authenticated admin, per RLS on brackets/matches.
 */
export async function runBracketGeneration(
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
  const totalRounds = Math.log2(paddedSize);
  const shuffled = shuffle(teamIds);
  const round1Slots = buildRound1Slots(shuffled, paddedSize);

  const { data: bracket, error: bracketError } = await supabase
    .from("brackets")
    .insert({
      tournament_id: tournamentId,
      bracket_format: "SINGLE_ELIMINATION",
      status: "ACTIVE",
      generated_by: adminId,
    })
    .select("id")
    .single();
  if (bracketError || !bracket) {
    return { ok: false, message: bracketError?.message ?? "Failed to create bracket." };
  }

  // 1. Create every match row for every round, empty.
  const matchRows: {
    tournament_id: string;
    bracket_id: string;
    bracket_type: "upper";
    round_number: number;
    match_number: number;
    best_of: string;
    status: "PENDING";
    score_a: number;
    score_b: number;
  }[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    const count = paddedSize / 2 ** r;
    for (let mi = 0; mi < count; mi++) {
      matchRows.push({
        tournament_id: tournamentId,
        bracket_id: bracket.id,
        bracket_type: "upper",
        round_number: r,
        match_number: mi,
        best_of: tournament.format || "BO1",
        status: "PENDING",
        score_a: 0,
        score_b: 0,
      });
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("matches")
    .insert(matchRows)
    .select("id, round_number, match_number");
  if (insertError || !inserted) {
    await supabase.from("brackets").delete().eq("id", bracket.id);
    return { ok: false, message: insertError?.message ?? "Failed to create matches." };
  }

  const idOf = new Map<string, string>();
  for (const m of inserted) idOf.set(`${m.round_number}-${m.match_number}`, m.id);

  // 2. Link every non-final match to its parent in the next round.
  const linkOps: { id: string; next_match_winner_id: string }[] = [];
  for (let r = 1; r < totalRounds; r++) {
    const count = paddedSize / 2 ** r;
    for (let mi = 0; mi < count; mi++) {
      const id = idOf.get(`${r}-${mi}`)!;
      const nextId = idOf.get(`${r + 1}-${Math.floor(mi / 2)}`)!;
      linkOps.push({ id, next_match_winner_id: nextId });
    }
  }
  await runInChunks(linkOps, 20, async (op) => {
    await supabase.from("matches").update({ next_match_winner_id: op.next_match_winner_id }).eq("id", op.id);
  });

  // 3. Populate round 1 with seeded teams, auto-resolving byes.
  type RoundState = Map<number, { team_a_id: string | null; team_b_id: string | null }>;
  const roundState: Map<number, RoundState> = new Map();
  for (let r = 1; r <= totalRounds; r++) roundState.set(r, new Map());

  const round1Count = paddedSize / 2;
  const round1Ops: {
    id: string;
    round: number;
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
    const id = idOf.get(`1-${mi}`)!;

    if (teamA && !teamB) {
      round1Ops.push({ id, round: 1, mi, team_a_id: teamA, team_b_id: null, winner_id: teamA, status: "COMPLETED", score_a: 1, score_b: 0 });
    } else if (!teamA && teamB) {
      round1Ops.push({ id, round: 1, mi, team_a_id: null, team_b_id: teamB, winner_id: teamB, status: "COMPLETED", score_a: 0, score_b: 1 });
    } else {
      round1Ops.push({ id, round: 1, mi, team_a_id: teamA, team_b_id: teamB, winner_id: null, status: "PENDING", score_a: 0, score_b: 0 });
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

  // Seed roundState for round 2 propagation from round 1 results.
  for (const op of round1Ops) {
    if (op.winner_id) {
      const nextMatchNumber = Math.floor(op.mi / 2);
      const isEven = op.mi % 2 === 0;
      const slot = roundState.get(2)!.get(nextMatchNumber) ?? { team_a_id: null, team_b_id: null };
      if (isEven) slot.team_a_id = op.winner_id;
      else slot.team_b_id = op.winner_id;
      roundState.get(2)!.set(nextMatchNumber, slot);
    }
  }

  // 4. Forward sweep: apply propagated teams to round r, auto-resolve any
  // match that's already a bye (exactly one team present), and propagate
  // further — correctly handles cascading byes across multiple rounds.
  for (let r = 2; r <= totalRounds; r++) {
    const count = paddedSize / 2 ** r;
    for (let mi = 0; mi < count; mi++) {
      const slot = roundState.get(r)!.get(mi);
      if (!slot) continue;
      const id = idOf.get(`${r}-${mi}`)!;

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

        if (r < totalRounds) {
          const nextMatchNumber = Math.floor(mi / 2);
          const isEven = mi % 2 === 0;
          const nextSlot = roundState.get(r + 1)!.get(nextMatchNumber) ?? { team_a_id: null, team_b_id: null };
          if (isEven) nextSlot.team_a_id = winnerId;
          else nextSlot.team_b_id = winnerId;
          roundState.get(r + 1)!.set(nextMatchNumber, nextSlot);
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
