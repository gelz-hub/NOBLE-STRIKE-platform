import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

let mockClient: ReturnType<typeof createMockSupabase>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mockClient }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
}));

const { createTournament } = await import("@/app/admin/tournaments/actions");
const { updateTeam } = await import("@/app/dashboard/teams/actions");

function tournamentForm() {
  const fd = new FormData();
  fd.set("name_en", "Winter Cup");
  fd.set("game_type", "MLBB");
  fd.set("max_teams", "16");
  fd.set("registration_deadline", new Date(Date.now() + 86400000).toISOString());
  fd.set("start_date", new Date(Date.now() + 2 * 86400000).toISOString());
  fd.set("format", "BO1");
  return fd;
}

describe("Security — non-admin cannot mutate tournaments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("a non-admin's createTournament call is rejected before any row is written", async () => {
    mockClient = createMockSupabase({ profiles: [{ id: "user-1", role: "user" }], tournaments: [] }, { authUserId: "user-1" });
    const result = await createTournament(null, tournamentForm());
    expect(result).toEqual({ error: "Admin access required." });
    expect(mockClient._tables.tournaments).toHaveLength(0);
  });

  it("an unauthenticated createTournament call is rejected", async () => {
    mockClient = createMockSupabase({ profiles: [], tournaments: [] }, { authUserId: null });
    const result = await createTournament(null, tournamentForm());
    expect(result).toEqual({ error: "You must be signed in." });
  });

  it("an admin's createTournament call succeeds", async () => {
    mockClient = createMockSupabase({ profiles: [{ id: "admin-1", role: "admin" }], tournaments: [] }, { authUserId: "admin-1" });
    await expect(createTournament(null, tournamentForm())).rejects.toThrow("NEXT_REDIRECT");
    expect(mockClient._tables.tournaments).toHaveLength(1);
  });
});

describe("Security — team ownership protection is an RLS concern, not an app-code one", () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * updateTeam/deleteTeam (src/app/dashboard/teams/actions.ts) issue
   * `.eq("id", teamId)` with NO owner_id filter and no explicit ownership
   * check in application code — this is a deliberate, documented design
   * (see SECURITY.md's RLS policy table: "teams — owner or admin write").
   * The real protection is Postgres RLS refusing the UPDATE/DELETE when
   * auth.uid() != owner_id, which our in-memory mock client does NOT
   * simulate (it has no concept of RLS policies).
   *
   * This test documents that reality rather than hiding it: it proves the
   * app layer alone would happily "succeed" against someone else's team,
   * which is exactly why RLS must be the enforcement layer here — and why
   * this specific guarantee can only be certified against a real Postgres
   * instance (see scripts/verify-*.mjs in git history and TESTING.md's
   * "What this suite does not verify" section), not by a mocked unit test.
   */
  it("app code issues no owner-scoped filter — RLS is the only thing that would stop this", async () => {
    mockClient = createMockSupabase(
      {
        teams: [{ id: "team-1", owner_id: "real-owner", team_name: "Original Name" }],
      },
      { authUserId: "attacker" }
    );
    const fd = new FormData();
    fd.set("team_name", "Renamed By Attacker");
    fd.set("game", "MLBB");
    fd.set("contact_number", "+85512345678");
    fd.set("captain_telegram", "@ns_captain");
    fd.set("province", "Phnom Penh");
    const result = await updateTeam("team-1", null, fd);

    // Against the mock (no RLS), this "succeeds" — which is the point: it
    // demonstrates the app layer performs no ownership check of its own.
    expect(result).toEqual({ success: true });
    const team = (mockClient._tables.teams as Record<string, unknown>[])[0];
    expect(team.team_name).toBe("Renamed By Attacker");
    // A real Supabase project must be the one asserting this never actually
    // persists — verified via RLS integration testing, not here.
  });
});
