import { describe, it, expect } from "vitest";
import { runDoubleEliminationGeneration } from "@/lib/bracket/generate-double-elim";
import { createMockSupabase } from "../helpers/mock-supabase";

async function generate(teamCount: number) {
  const teams = Array.from({ length: teamCount }, (_, i) => `team-${i}`);
  const registrations = teams.map((team_id) => ({ tournament_id: "t1", team_id, status: "APPROVED" }));
  const supabase = createMockSupabase({
    tournaments: [{ id: "t1", format: "BO1" }],
    tournament_registrations: registrations,
    brackets: [],
    matches: [],
  });
  const result = await runDoubleEliminationGeneration(supabase as never, "t1", "admin-1");
  return { result, supabase };
}

describe("runDoubleEliminationGeneration", () => {
  it("rejects generation with fewer than 2 approved teams", async () => {
    const { result } = await generate(1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("NOT_ENOUGH_TEAMS");
  });

  it("builds upper, lower, and exactly one grand_final match for 8 teams", async () => {
    const { result, supabase } = await generate(8);
    expect(result.ok).toBe(true);
    const matches = supabase._tables.matches as Record<string, unknown>[];

    const upper = matches.filter((m) => m.bracket_type === "upper");
    const lower = matches.filter((m) => m.bracket_type === "lower");
    const grandFinal = matches.filter((m) => m.bracket_type === "grand_final");

    // 8 teams -> k=3 upper rounds: 4+2+1 = 7 upper matches.
    expect(upper).toHaveLength(7);
    // Lower bracket: 2*(k-1) = 4 rounds. Sizes: seed=2, drop=2, consolidation=1, drop=1 -> 6 matches.
    expect(lower).toHaveLength(6);
    expect(grandFinal).toHaveLength(1);
  });

  it("the 2-team case has no lower bracket — loser goes straight to the grand final", async () => {
    const { result, supabase } = await generate(2);
    expect(result.ok).toBe(true);
    const matches = supabase._tables.matches as Record<string, unknown>[];
    const lower = matches.filter((m) => m.bracket_type === "lower");
    const upper = matches.filter((m) => m.bracket_type === "upper");
    expect(lower).toHaveLength(0);
    expect(upper).toHaveLength(1);
    expect(upper[0].next_match_loser_id).toBeTruthy();
  });

  it("every upper-bracket match has a loser link into the lower bracket (except the degenerate 2-team case)", async () => {
    const { supabase } = await generate(8);
    const matches = supabase._tables.matches as Record<string, unknown>[];
    const upper = matches.filter((m) => m.bracket_type === "upper");
    for (const m of upper) {
      expect(m.next_match_loser_id).toBeTruthy();
    }
  });

  it("the grand final receives both an upper-bracket champion link and a lower-bracket champion link", async () => {
    const { supabase } = await generate(8);
    const matches = supabase._tables.matches as Record<string, unknown>[];
    const grandFinal = matches.find((m) => m.bracket_type === "grand_final")!;
    const feedingIntoGF = matches.filter((m) => m.next_match_winner_id === grandFinal.id);
    // One from the upper bracket final, one from the lower bracket final.
    expect(feedingIntoGF).toHaveLength(2);
    expect(feedingIntoGF.some((m) => m.bracket_type === "upper")).toBe(true);
    expect(feedingIntoGF.some((m) => m.bracket_type === "lower")).toBe(true);
  });

  it("auto-resolves round-1 upper byes for a non-power-of-2 team count", async () => {
    const { result, supabase } = await generate(5); // padded to 8, 3 byes
    expect(result.ok).toBe(true);
    const matches = supabase._tables.matches as Record<string, unknown>[];
    const upperRound1 = matches.filter((m) => m.bracket_type === "upper" && m.round_number === 1);
    const byeMatches = upperRound1.filter((m) => !m.team_a_id || !m.team_b_id);
    expect(byeMatches).toHaveLength(3);
    for (const m of byeMatches) {
      expect(m.status).toBe("COMPLETED");
    }
  });

  it("produces a structurally valid bracket (passes the same integrity check generation itself runs)", async () => {
    const { result } = await generate(16);
    // runDoubleEliminationGeneration internally calls validateBracketIntegrity
    // and would return ok:false with a message if it failed — asserting ok:true
    // here IS the integrity assertion, straight from production code.
    expect(result.ok).toBe(true);
    expect(result.bracketId).toBeTruthy();
  });
});
