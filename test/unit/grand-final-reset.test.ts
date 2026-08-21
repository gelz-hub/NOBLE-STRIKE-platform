import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

// advanceWinner (and its sibling actions) call createClient() from
// @/lib/supabase/server internally rather than taking a client as a
// parameter — that's correct for a Server Action (it must bind to the
// caller's real cookie-based session), but it means testing it requires
// swapping that import for our mock client, exactly like a real Supabase
// client would resolve inside a request. next/cache's revalidatePath is
// mocked too since it throws outside a real Next.js request context.
let mockClient: ReturnType<typeof createMockSupabase>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mockClient,
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

const { advanceWinner } = await import("@/app/admin/tournaments/[id]/bracket/actions");

function seedGrandFinal(resetEnabled: boolean) {
  mockClient = createMockSupabase(
    {
      profiles: [{ id: "admin-1", role: "admin" }],
      tournaments: [{ id: "t1", grand_final_reset_enabled: resetEnabled, format: "BO1" }],
      matches: [
        {
          id: "gf1",
          tournament_id: "t1",
          bracket_id: "b1",
          bracket_type: "grand_final",
          round_number: 1,
          match_number: 0,
          team_a_id: "upper-champ", // upper bracket champion
          team_b_id: "lower-champ", // lower bracket champion
          next_match_winner_id: null,
          next_match_loser_id: null,
          status: "PENDING",
          score_a: 0,
          score_b: 0,
        },
      ],
    },
    { authUserId: "admin-1" }
  );
}

describe("advanceWinner — grand final reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes the tournament immediately when the upper-bracket champion wins the grand final", async () => {
    seedGrandFinal(true);
    const result = await advanceWinner("gf1", 1, 0);
    expect(result).toEqual({ success: true });

    const matches = mockClient._tables.matches;
    expect(matches).toHaveLength(1); // no reset match created

    const tournaments = mockClient._tables.tournaments as Record<string, unknown>[];
    expect(tournaments[0].status).toBe("COMPLETED");
    expect(tournaments[0].champion_team_id).toBe("upper-champ");
  });

  it("creates a grand_final_reset match when the lower-bracket finalist wins and resets are enabled", async () => {
    seedGrandFinal(true);
    const result = await advanceWinner("gf1", 0, 1); // team_b (lower-champ) wins
    expect(result).toEqual({ success: true });

    const matches = mockClient._tables.matches as Record<string, unknown>[];
    expect(matches).toHaveLength(2);
    const reset = matches.find((m) => m.bracket_type === "grand_final_reset");
    expect(reset).toBeTruthy();
    expect(reset!.team_a_id).toBe("upper-champ");
    expect(reset!.team_b_id).toBe("lower-champ");

    // Tournament isn't over yet — the reset match still has to be played.
    const tournaments = mockClient._tables.tournaments as Record<string, unknown>[];
    expect(tournaments[0].status).not.toBe("COMPLETED");
  });

  it("completes the tournament immediately when the lower-bracket finalist wins and resets are disabled", async () => {
    seedGrandFinal(false);
    const result = await advanceWinner("gf1", 0, 1);
    expect(result).toEqual({ success: true });

    const matches = mockClient._tables.matches as Record<string, unknown>[];
    expect(matches).toHaveLength(1); // no reset match — resets are off

    const tournaments = mockClient._tables.tournaments as Record<string, unknown>[];
    expect(tournaments[0].status).toBe("COMPLETED");
    expect(tournaments[0].champion_team_id).toBe("lower-champ");
  });

  it("rejects a tied score — a match must have a winner", async () => {
    seedGrandFinal(true);
    const result = await advanceWinner("gf1", 1, 1);
    expect("error" in result).toBe(true);
  });
});
