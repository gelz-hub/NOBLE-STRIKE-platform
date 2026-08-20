import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/teams/[id]
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const team = await db.team.findUnique({
      where: { id },
      include: {
        tournament: true,
        achievements: true,
        matchesAsA: { include: { teamA: true, teamB: true } },
        matchesAsB: { include: { teamA: true, teamB: true } },
      },
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    // Merge matchesAsA + matchesAsB into a single list for convenience
    const matches = [...team.matchesAsA, ...team.matchesAsB];
    const { matchesAsA, matchesAsB, ...rest } = team;
    return NextResponse.json({ ...rest, matches });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PUT /api/teams/[id]
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    const allowed = [
      "name", "logo", "captainName", "discordUsername", "contactNumber",
      "game", "tournamentId", "status", "isOfficial",
      "player1", "player2", "player3", "player4", "player5", "substitute",
      "region", "tag",
    ];
    for (const k of allowed) {
      if (k in body) data[k] = body[k];
    }

    const updated = await db.team.update({
      where: { id },
      data,
      include: { tournament: true, achievements: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
