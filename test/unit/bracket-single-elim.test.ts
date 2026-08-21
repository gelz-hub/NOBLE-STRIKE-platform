import { describe, it, expect } from "vitest";
import { runBracketGeneration } from "@/lib/bracket/generate";
import { createMockSupabase } from "../helpers/mock-supabase";

function seedTournament(teamCount: number) {
  const teams = Array.from({ length: teamCount }, (_, i) => `team-${i}`);
  const registrations = teams.map((team_id) => ({
    tournament_id: "t1",
    team_id,
    status: "APPROVED",
  }));
  return { teams, registrations };
}

async function generate(teamCount: number) {
  const { registrations } = seedTournament(teamCount);
  const supabase = createMockSupabase({
    tournaments: [{ id: "t1", format: "BO1" }],
    tournament_registrations: registrations,
    brackets: [],
    matches: [],
  });
  const result = await runBracketGeneration(supabase as never, "t1", "admin-1");
  return { result, supabase };
}

describe("runBracketGeneration (single elimination)", () => {
  it("rejects generation with fewer than 2 approved teams", async () => {
    const { result } = await generate(1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("NOT_ENOUGH_TEAMS");
  });

  it("rejects generation for a tournament that doesn't exist", async () => {
    const supabase = createMockSupabase({ tournaments: [], tournament_registrations: [] });
    const result = await runBracketGeneration(supabase as never, "missing", "admin-1");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("TOURNAMENT_NOT_FOUND");
  });

  it("creates the correct number of matches and rounds for 8 teams", async () => {
    const { result, supabase } = await generate(8);
    expect(result.ok).toBe(true);
    const matches = supabase._tables.matches as Record<string, unknown>[];
    // 8 teams -> rounds of 4, 2, 1 matches = 7 total matches.
    expect(matches).toHaveLength(7);
    const round1 = matches.filter((m) => m.round_number === 1);
    expect(round1).toHaveLength(4);
    const final = matches.filter((m) => m.round_number === 3);
    expect(final).toHaveLength(1);
  });

  it("round 1 has no byes for an exact power-of-2 count", async () => {
    const { supabase } = await generate(8);
    const round1 = (supabase._tables.matches as Record<string, unknown>[]).filter((m) => m.round_number === 1);
    for (const m of round1) {
      expect(m.team_a_id).not.toBeNull();
      expect(m.team_b_id).not.toBeNull();
      expect(m.status).toBe("PENDING");
    }
  });

  it("auto-resolves byes for a non-power-of-2 team count (5 -> padded to 8)", async () => {
    const { result, supabase } = await generate(5);
    expect(result.ok).toBe(true);
    const matches = supabase._tables.matches as Record<string, unknown>[];
    const round1 = matches.filter((m) => m.round_number === 1);
    expect(round1).toHaveLength(4);

    const byeMatches = round1.filter((m) => !m.team_a_id || !m.team_b_id);
    // 8 - 5 = 3 byes.
    expect(byeMatches).toHaveLength(3);
    for (const m of byeMatches) {
      expect(m.status).toBe("COMPLETED");
      expect(m.winner_id).not.toBeNull();
    }
  });

  it("cascades a bye win forward into round 2 when a round-1 bye's winner needs to be seeded there", async () => {
    const { supabase } = await generate(3); // padded to 4 -> 2 byes, deep cascade possible
    const matches = supabase._tables.matches as Record<string, unknown>[];
    const round2 = matches.filter((m) => m.round_number === 2);
    expect(round2).toHaveLength(1);
    // With 3 real teams in a 4-slot bracket, round 2 (the final) must have
    // at least one seeded team propagated forward from round 1.
    const final = round2[0];
    expect(final.team_a_id || final.team_b_id).toBeTruthy();
  });

  it("produces exactly one terminal match with no outgoing winner link", async () => {
    const { supabase } = await generate(16);
    const matches = supabase._tables.matches as Record<string, unknown>[];
    const terminal = matches.filter((m) => !m.next_match_winner_id);
    expect(terminal).toHaveLength(1);
    expect(terminal[0].round_number).toBe(4); // log2(16) = 4 rounds
  });

  it("links every non-final match to a real next-round match id", async () => {
    const { supabase } = await generate(8);
    const matches = supabase._tables.matches as Record<string, unknown>[];
    const ids = new Set(matches.map((m) => m.id));
    for (const m of matches) {
      if (m.next_match_winner_id) {
        expect(ids.has(m.next_match_winner_id as string)).toBe(true);
      }
    }
  });

  it("creates the bracket row with SINGLE_ELIMINATION format and ACTIVE status", async () => {
    const { supabase } = await generate(4);
    const brackets = supabase._tables.brackets as Record<string, unknown>[];
    expect(brackets).toHaveLength(1);
    expect(brackets[0].bracket_format).toBe("SINGLE_ELIMINATION");
    expect(brackets[0].status).toBe("ACTIVE");
    expect(brackets[0].generated_by).toBe("admin-1");
  });
});
