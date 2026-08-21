import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

let mockClient: ReturnType<typeof createMockSupabase>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mockClient }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

const { changeTournamentStatus, archiveTournament, deleteTournament } = await import(
  "@/app/admin/tournaments/actions"
);

function seed(role: "admin" | "user", approvedRegs = 0) {
  mockClient = createMockSupabase(
    {
      profiles: [{ id: "admin-1", role }],
      tournaments: [{ id: "t1", status: "REGISTRATION_OPEN" }],
      tournament_registrations: Array.from({ length: approvedRegs }, (_, i) => ({
        id: `reg-${i}`,
        tournament_id: "t1",
        status: "APPROVED",
      })),
    },
    { authUserId: "admin-1" }
  );
}

describe("Tournament lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves through DRAFT -> REGISTRATION_OPEN -> REGISTRATION_CLOSED -> ONGOING -> COMPLETED", async () => {
    seed("admin");
    const transitions: string[] = [
      "REGISTRATION_CLOSED",
      "ONGOING",
      "COMPLETED",
    ];
    for (const status of transitions) {
      const result = await changeTournamentStatus("t1", status as never);
      expect(result).toEqual({ success: true });
      const t = (mockClient._tables.tournaments as Record<string, unknown>[])[0];
      expect(t.status).toBe(status);
    }
  });

  it("archiving sets status to ARCHIVED", async () => {
    seed("admin");
    const result = await archiveTournament("t1");
    expect(result).toEqual({ success: true });
    const t = (mockClient._tables.tournaments as Record<string, unknown>[])[0];
    expect(t.status).toBe("ARCHIVED");
  });

  it("a non-admin cannot change a tournament's status", async () => {
    seed("user");
    const result = await changeTournamentStatus("t1", "ONGOING" as never);
    expect(result).toEqual({ error: "Admin access required." });
    const t = (mockClient._tables.tournaments as Record<string, unknown>[])[0];
    expect(t.status).toBe("REGISTRATION_OPEN"); // unchanged
  });

  it("deleting a tournament with no approved teams succeeds", async () => {
    seed("admin", 0);
    const result = await deleteTournament("t1");
    expect(result).toEqual({ success: true });
    expect(mockClient._tables.tournaments).toHaveLength(0);
  });

  it("deleting a tournament with approved teams is blocked (archive instead)", async () => {
    seed("admin", 3);
    const result = await deleteTournament("t1");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toMatch(/approved teams/i);
    expect(mockClient._tables.tournaments).toHaveLength(1); // not deleted
  });

  it("a non-admin cannot delete a tournament", async () => {
    seed("user", 0);
    const result = await deleteTournament("t1");
    expect(result).toEqual({ error: "Admin access required." });
    expect(mockClient._tables.tournaments).toHaveLength(1);
  });
});
