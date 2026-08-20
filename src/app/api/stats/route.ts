import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [tournaments, approvedTeams, matches, allTournaments] = await Promise.all([
      db.tournament.count(),
      db.team.count({ where: { status: "APPROVED" } }),
      db.match.count({ where: { status: "COMPLETED" } }),
      db.tournament.findMany({ select: { prizePool: true } }),
    ]);

    // Sum all numeric prize pool values parsed from strings like "$50,000"
    const prizePool = allTournaments.reduce((sum, t) => {
      const numeric = parseInt((t.prizePool || "").replace(/[^0-9]/g, ""), 10);
      return sum + (Number.isNaN(numeric) ? 0 : numeric);
    }, 0);

    return NextResponse.json({
      tournaments,
      teams: approvedTeams,
      prizePool,
      matches,
      players: approvedTeams * 5,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
