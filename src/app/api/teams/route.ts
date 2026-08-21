import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthApi } from "@/lib/require-admin-api";

// GET /api/teams — list teams (default: APPROVED), with optional filters
//   ?status=PENDING|APPROVED|REJECTED
//   ?official=true
//   ?tournamentId=xxx  -> filter to teams with an APPROVED or PENDING registration in that tournament
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const official = searchParams.get("official");
    const tournamentId = searchParams.get("tournamentId");

    // Default: APPROVED only (so public teams page hides PENDING/REJECTED).
    // "ALL" is treated as no status filter (returns every team regardless of status).
    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      where.status = status;
    } else if (!status) {
      where.status = "APPROVED";
    }
    if (official === "true") where.isOfficial = true;

    // Multi-tournament filter: teams that have a registration (APPROVED or PENDING)
    // in the requested tournament.
    if (tournamentId) {
      where.registrations = {
        some: {
          tournamentId,
          status: { in: ["APPROVED", "PENDING"] },
        },
      };
    }

    const teams = await db.team.findMany({
      where,
      include: {
        tournament: true,
        registrations: { include: { tournament: true } },
        achievements: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(teams);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/teams — register a new team (status=PENDING)
export async function POST(request: Request) {
  try {
    const authError = await requireAuthApi();
    if (authError) return authError;

    const body = await request.json();
    const {
      name,
      logo,
      captainName,
      discordUsername,
      contactNumber,
      game,
      tournamentId = null,
      player1,
      player2,
      player3,
      player4,
      player5,
      substitute = null,
      region = null,
      tag = null,
      description = null,
    } = body;

    if (
      !name ||
      !captainName ||
      !discordUsername ||
      !contactNumber ||
      !game ||
      !player1 ||
      !player2 ||
      !player3 ||
      !player4 ||
      !player5
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Normalize empty strings to null for optional/nullable fields
    const normTournamentId = tournamentId || null;
    const normLogo = logo || null;
    const normSubstitute = substitute || null;
    const normRegion = region || null;
    const normTag = tag || null;
    const normDescription = description || null;

    const team = await db.team.create({
      data: {
        name,
        logo: normLogo,
        captainName,
        discordUsername,
        contactNumber,
        game,
        tournamentId: normTournamentId,
        player1,
        player2,
        player3,
        player4,
        player5,
        substitute: normSubstitute,
        region: normRegion,
        tag: normTag,
        description: normDescription,
        status: "PENDING",
        isOfficial: false,
      },
      include: {
        tournament: true,
        registrations: { include: { tournament: true } },
        achievements: true,
      },
    });

    // If a tournamentId is provided, also create a registration record
    if (normTournamentId) {
      await db.registration.create({
        data: {
          tournamentId: normTournamentId,
          teamId: team.id,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json(team, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
