import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

// GET /api/tournaments — list all tournaments ordered by startDate desc
export async function GET() {
  try {
    const tournaments = await db.tournament.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { teams: true, registrations: true },
        },
      },
    });
    return NextResponse.json(tournaments);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/tournaments — create a tournament
export async function POST(request: Request) {
  try {
    const authError = await requireAdminApi();
    if (authError) return authError;

    const body = await request.json();
    const {
      name,
      game,
      startDate,
      registrationDeadline,
      teamLimit,
      prizePool,
      rules,
      bannerImage = null,
      format = "BO1",
      description,
      location,
      organizer,
    } = body;

    if (!name || !game || !startDate || !registrationDeadline || !teamLimit || !prizePool || !rules) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate slug from name + short random suffix
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const suffix = Math.random().toString(36).slice(2, 8);
    const slug = `${baseSlug}-${suffix}`;

    const tournament = await db.tournament.create({
      data: {
        name,
        game,
        slug,
        startDate: new Date(startDate),
        registrationDeadline: new Date(registrationDeadline),
        teamLimit: Number(teamLimit),
        prizePool,
        rules,
        bannerImage: bannerImage ?? null,
        format: format || "BO1",
        description: description ?? null,
        location: location ?? null,
        organizer: organizer ?? null,
        status: "REGISTRATION_OPEN",
        featured: false,
      },
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
