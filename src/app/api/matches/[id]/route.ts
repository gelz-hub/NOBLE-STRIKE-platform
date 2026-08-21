import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

type Params = { params: Promise<{ id: string }> };

// PUT /api/matches/[id] — update match + advance winner to next match
export async function PUT(request: Request, { params }: Params) {
  try {
    const authError = await requireAdminApi();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { scoreA, scoreB, winnerId, status, format, scheduledAt, advance } = body;

    const existing = await db.match.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (scoreA !== undefined) data.scoreA = Number(scoreA);
    if (scoreB !== undefined) data.scoreB = Number(scoreB);
    if (winnerId !== undefined) data.winnerId = winnerId;
    if (status !== undefined) data.status = status;
    if (format !== undefined) data.format = format;
    if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    // If marking COMPLETED with a winnerId, ensure winnerId is set
    if (status === "COMPLETED" && winnerId) {
      data.winnerId = winnerId;
    }

    const updated = await db.match.update({
      where: { id },
      data,
      include: { teamA: true, teamB: true },
    });

    // Advance winner into next match if requested or if match just completed with a winner
    const shouldAdvance = advance === true || (status === "COMPLETED" && winnerId);
    if (shouldAdvance && updated.winnerId && updated.nextMatchId) {
      const isEven = updated.matchIndex % 2 === 0;
      await db.match.update({
        where: { id: updated.nextMatchId },
        data: isEven
          ? { teamAId: updated.winnerId }
          : { teamBId: updated.winnerId },
      });
    }

    // Re-fetch with relations to return fresh state
    const refreshed = await db.match.findUnique({
      where: { id },
      include: { teamA: true, teamB: true },
    });
    return NextResponse.json(refreshed);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
