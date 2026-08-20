import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/ns — official NOBLE STRIKE team data bundle
export async function GET() {
  try {
    const [team, members, sponsors, socials] = await Promise.all([
      db.team.findFirst({
        where: { isOfficial: true },
        include: {
          achievements: true,
          registrations: { include: { tournament: true } },
        },
      }),
      db.nSMember.findMany({
        orderBy: [{ order: "asc" }, { type: "asc" }],
      }),
      db.sponsor.findMany({ orderBy: { order: "asc" } }),
      db.socialLink.findMany({ orderBy: { order: "asc" } }),
    ]);

    return NextResponse.json({
      team: team ?? null,
      members,
      sponsors,
      socials,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
