import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/tournaments/[id]
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const tournament = await db.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { teams: true, registrations: true } },
      },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    return NextResponse.json(tournament);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PUT /api/tournaments/[id]
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    const allowed = [
      "name", "game", "startDate", "registrationDeadline", "teamLimit",
      "prizePool", "rules", "bannerImage", "status", "format",
      "description", "location", "organizer", "featured",
    ];
    for (const k of allowed) {
      if (k in body) {
        if (k === "startDate" || k === "registrationDeadline") {
          data[k] = body[k] ? new Date(body[k]) : null;
        } else if (k === "teamLimit") {
          data[k] = body[k] !== null ? Number(body[k]) : null;
        } else if (k === "featured") {
          data[k] = Boolean(body[k]);
        } else {
          data[k] = body[k];
        }
      }
    }

    const updated = await db.tournament.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/tournaments/[id] — cascade manually (SQLite)
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    // 1. Delete all matches for this tournament
    await db.match.deleteMany({ where: { tournamentId: id } });
    // 2. Delete all registrations for this tournament
    await db.registration.deleteMany({ where: { tournamentId: id } });
    // 3. Unset team.tournamentId for teams pointing to this tournament
    await db.team.updateMany({
      where: { tournamentId: id },
      data: { tournamentId: null },
    });
    // 4. Finally delete the tournament
    await db.tournament.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
