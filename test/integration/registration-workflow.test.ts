import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

let mockClient: ReturnType<typeof createMockSupabase>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mockClient }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { registerTeamForTournament, withdrawRegistration } = await import(
  "@/app/dashboard/registrations/actions"
);

const REQUIRED_ROLES = ["EXP", "JUNGLE", "MID", "GOLD", "ROAM"];

function seed(overrides: {
  tournamentStatus?: string;
  deadline?: string;
  maxTeams?: number;
  approvedCount?: number;
  rosterComplete?: boolean;
} = {}) {
  const {
    tournamentStatus = "REGISTRATION_OPEN",
    deadline = new Date(Date.now() + 86400000).toISOString(),
    maxTeams = 16,
    approvedCount = 0,
    rosterComplete = true,
  } = overrides;

  const approvedRegs = Array.from({ length: approvedCount }, (_, i) => ({
    id: `existing-reg-${i}`,
    tournament_id: "t1",
    team_id: `other-team-${i}`,
    status: "APPROVED",
  }));

  mockClient = createMockSupabase(
    {
      teams: [{ id: "team-1", owner_id: "user-1", team_name: "Team One" }],
      tournaments: [
        { id: "t1", title: "Cup", status: tournamentStatus, registration_deadline: deadline, max_teams: maxTeams },
      ],
      team_members: rosterComplete
        ? REQUIRED_ROLES.map((role) => ({ team_id: "team-1", role }))
        : [{ team_id: "team-1", role: "EXP" }],
      tournament_registrations: approvedRegs,
      notifications: [],
    },
    { authUserId: "user-1" }
  );
}

describe("Registration workflow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers a team with a complete roster before the deadline", async () => {
    seed();
    const result = await registerTeamForTournament("team-1", "t1");
    expect(result).toEqual({ success: true });
    const regs = mockClient._tables.tournament_registrations as Record<string, unknown>[];
    expect(regs.some((r) => r.team_id === "team-1" && r.status === "PENDING")).toBe(true);
  });

  it("sends a tournament-category notification to the registering user", async () => {
    seed();
    await registerTeamForTournament("team-1", "t1");
    const notifs = mockClient._tables.notifications as Record<string, unknown>[];
    expect(notifs).toHaveLength(1);
    expect(notifs[0].title).toBe("Registration Submitted");
  });

  it("rejects registration when the tournament isn't open", async () => {
    seed({ tournamentStatus: "REGISTRATION_CLOSED" });
    const result = await registerTeamForTournament("team-1", "t1");
    expect(result).toEqual({ error: "Registration is not open for this tournament." });
  });

  it("rejects registration after the deadline has passed", async () => {
    seed({ deadline: new Date(Date.now() - 86400000).toISOString() });
    const result = await registerTeamForTournament("team-1", "t1");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toMatch(/deadline/i);
  });

  it("rejects registration once the tournament is at capacity", async () => {
    seed({ maxTeams: 2, approvedCount: 2 });
    const result = await registerTeamForTournament("team-1", "t1");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toMatch(/maximum number of teams/i);
  });

  it("rejects registration with an incomplete roster", async () => {
    seed({ rosterComplete: false });
    const result = await registerTeamForTournament("team-1", "t1");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toMatch(/roster is incomplete/i);
  });

  it("withdraws a pending registration", async () => {
    seed();
    await registerTeamForTournament("team-1", "t1");
    const regs = mockClient._tables.tournament_registrations as Record<string, unknown>[];
    const reg = regs.find((r) => r.team_id === "team-1")!;

    const result = await withdrawRegistration(reg.id as string);
    expect(result).toEqual({ success: true });
    expect(reg.status).toBe("WITHDRAWN");
  });
});
