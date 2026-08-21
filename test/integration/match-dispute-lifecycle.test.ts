import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

let mockClient: ReturnType<typeof createMockSupabase>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mockClient }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { openDispute } = await import("@/app/matches/[id]/actions");
const { resolveDispute } = await import("@/app/admin/matches/actions");

function seedForOpen(matchStatus: string, authUserId = "owner-1") {
  mockClient = createMockSupabase(
    {
      teams: [{ id: "team-a", owner_id: "owner-1", team_name: "Team A" }],
      matches: [
        {
          id: "match-1",
          tournament_id: "t1",
          team_a_id: "team-a",
          team_b_id: "team-b",
          status: matchStatus,
          team_a: { owner_id: "owner-1", team_name: "Team A" },
          team_b: { owner_id: "owner-2", team_name: "Team B" },
          tournament: { title: "Cup" },
        },
      ],
      match_disputes: [],
      notifications: [],
    },
    { authUserId }
  );
}

function seedForResolve(role: "admin" | "user") {
  mockClient = createMockSupabase(
    {
      profiles: [{ id: "admin-1", role }],
      match_disputes: [
        {
          id: "dispute-1",
          match_id: "match-1",
          team_id: "team-a",
          opened_by: "owner-1",
          status: "OPEN",
          teams: { team_name: "Team A" },
        },
      ],
      matches: [
        {
          id: "match-1",
          tournament_id: "t1",
          status: "DISPUTED",
          team_a: { owner_id: "owner-1", team_name: "Team A" },
          team_b: { owner_id: "owner-2", team_name: "Team B" },
          tournament: { title: "Cup" },
        },
      ],
      notifications: [],
    },
    { authUserId: "admin-1" }
  );
}

describe("Match dispute lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("the team that played can open a dispute on a completed match", async () => {
    seedForOpen("COMPLETED");
    const result = await openDispute("match-1", "team-a", "The screenshot evidence was manipulated.", []);
    expect(result).toEqual({ success: true });
    expect(mockClient._tables.match_disputes).toHaveLength(1);
  });

  it("notifies the opposing team's owner, not the disputing team", async () => {
    seedForOpen("COMPLETED");
    await openDispute("match-1", "team-a", "The screenshot evidence was manipulated.", []);
    const notifs = mockClient._tables.notifications as Record<string, unknown>[];
    expect(notifs).toHaveLength(1);
    expect(notifs[0].user_id).toBe("owner-2");
  });

  it("a team that didn't play in the match cannot dispute it", async () => {
    seedForOpen("COMPLETED");
    const result = await openDispute("match-1", "team-c", "Explanation text long enough.", []);
    // team-c doesn't own a seeded team, so team lookup fails first.
    expect("error" in result).toBe(true);
  });

  it("cannot dispute a match that isn't completed or already disputed", async () => {
    seedForOpen("PENDING");
    const result = await openDispute("match-1", "team-a", "Explanation text long enough.", []);
    expect(result).toEqual({ error: "Only completed matches can be disputed." });
  });

  it("an admin can resolve a dispute, clearing the match back to COMPLETED", async () => {
    seedForResolve("admin");
    const result = await resolveDispute("dispute-1", "RESOLVED", "Evidence reviewed, result stands.");
    expect(result).toEqual({ success: true });

    const disputes = mockClient._tables.match_disputes as Record<string, unknown>[];
    expect(disputes[0].status).toBe("RESOLVED");
    expect(disputes[0].resolved_by).toBe("admin-1");

    const matches = mockClient._tables.matches as Record<string, unknown>[];
    expect(matches[0].status).toBe("COMPLETED");
  });

  it("notifies both teams when a dispute is resolved", async () => {
    seedForResolve("admin");
    await resolveDispute("dispute-1", "REJECTED", "No irregularity found.");
    const notifs = mockClient._tables.notifications as Record<string, unknown>[];
    expect(notifs).toHaveLength(2);
    expect(notifs.map((n) => n.user_id).sort()).toEqual(["owner-1", "owner-2"]);
  });

  it("a non-admin cannot resolve a dispute", async () => {
    seedForResolve("user");
    const result = await resolveDispute("dispute-1", "RESOLVED", "trying to resolve");
    expect(result).toEqual({ error: "Admin access required." });
    const disputes = mockClient._tables.match_disputes as Record<string, unknown>[];
    expect(disputes[0].status).toBe("OPEN"); // unchanged
  });
});
