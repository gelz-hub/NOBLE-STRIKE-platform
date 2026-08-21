import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

let mockClient: ReturnType<typeof createMockSupabase>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mockClient }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { approveRegistration, rejectRegistration } = await import("@/app/admin/registrations/actions");

function seed(role: "admin" | "user" = "admin") {
  mockClient = createMockSupabase(
    {
      profiles: [{ id: "admin-1", role }],
      tournament_registrations: [
        {
          id: "reg-1",
          tournament_id: "t1",
          team_id: "team-1",
          status: "PENDING",
          teams: { owner_id: "owner-1", team_name: "Team One" },
          tournaments: { title: "Cup" },
        },
      ],
      notifications: [],
    },
    { authUserId: "admin-1" }
  );
}

describe("Approval workflow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("an admin can approve a pending registration", async () => {
    seed("admin");
    const result = await approveRegistration("reg-1");
    expect(result).toEqual({ success: true });
    const regs = mockClient._tables.tournament_registrations as Record<string, unknown>[];
    expect(regs[0].status).toBe("APPROVED");
    expect(regs[0].reviewed_by).toBe("admin-1");
  });

  it("notifies the team owner (not the admin) on approval", async () => {
    seed("admin");
    await approveRegistration("reg-1");
    const notifs = mockClient._tables.notifications as Record<string, unknown>[];
    expect(notifs).toHaveLength(1);
    expect(notifs[0].user_id).toBe("owner-1");
    expect(notifs[0].title).toBe("Registration Approved");
  });

  it("a non-admin cannot approve a registration", async () => {
    seed("user");
    const result = await approveRegistration("reg-1");
    expect(result).toEqual({ error: "Admin access required." });
    const regs = mockClient._tables.tournament_registrations as Record<string, unknown>[];
    expect(regs[0].status).toBe("PENDING"); // unchanged
  });

  it("an admin can reject with a reason, and it's included in the notification", async () => {
    seed("admin");
    const result = await rejectRegistration("reg-1", "Roster incomplete at review time.");
    expect(result).toEqual({ success: true });
    const regs = mockClient._tables.tournament_registrations as Record<string, unknown>[];
    expect(regs[0].status).toBe("REJECTED");
    expect(regs[0].rejection_reason).toBe("Roster incomplete at review time.");

    const notifs = mockClient._tables.notifications as Record<string, unknown>[];
    expect((notifs[0].message as string)).toContain("Roster incomplete at review time.");
  });

  it("rejects a reject-without-reason request", async () => {
    seed("admin");
    const result = await rejectRegistration("reg-1", "   ");
    expect(result).toEqual({ error: "A rejection reason is required." });
  });

  it("a non-admin cannot reject a registration", async () => {
    seed("user");
    const result = await rejectRegistration("reg-1", "some reason");
    expect(result).toEqual({ error: "Admin access required." });
  });
});
