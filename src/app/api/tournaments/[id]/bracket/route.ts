import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

type Params = { params: Promise<{ id: string }> };

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// GET /api/tournaments/[id]/bracket — return bracket grouped by round
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const matches = await db.match.findMany({
      where: { tournamentId: id },
      orderBy: [{ round: "asc" }, { matchIndex: "asc" }],
      include: {
        teamA: true,
        teamB: true,
      },
    });

    // Group by round
    const roundMap = new Map<number, typeof matches>();
    for (const m of matches) {
      if (!roundMap.has(m.round)) roundMap.set(m.round, []);
      roundMap.get(m.round)!.push(m);
    }
    const rounds = Array.from(roundMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, ms]) => ({ round, matches: ms }));

    return NextResponse.json({ rounds });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/tournaments/[id]/bracket — generate single-elimination bracket
export async function POST(_request: Request, { params }: Params) {
  try {
    const authError = await requireAdminApi();
    if (authError) return authError;

    const { id } = await params;

    const tournament = await db.tournament.findUnique({ where: { id } });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Tournament-centric: source of truth for participation is the
    // Registration table (status APPROVED), not Team.tournamentId.
    const teams = await db.team.findMany({
      where: {
        registrations: {
          some: { tournamentId: id, status: "APPROVED" },
        },
        status: "APPROVED",
      },
    });

    if (teams.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 approved teams" },
        { status: 400 }
      );
    }

    // Delete existing matches for this tournament
    await db.match.deleteMany({ where: { tournamentId: id } });

    // Shuffle & pad to next power of 2 with BYEs (null)
    const shuffled = shuffle(teams);
    const paddedSize = nextPow2(shuffled.length);
    const slots: (typeof teams[number] | null)[] = [...shuffled];
    while (slots.length < paddedSize) slots.push(null);

    const totalRounds = Math.log2(paddedSize);

    // 1. Create all matches for all rounds (empty), preserving order
    const roundMatches: { id: string; round: number; matchIndex: number }[][] = [];
    for (let r = 1; r <= totalRounds; r++) {
      const count = paddedSize / Math.pow(2, r);
      const arr: { id: string; round: number; matchIndex: number }[] = [];
      for (let mi = 0; mi < count; mi++) {
        const created = await db.match.create({
          data: {
            tournamentId: id,
            round: r,
            matchIndex: mi,
            format: tournament.format || "BO1",
            status: "PENDING",
          },
        });
        arr.push({ id: created.id, round: r, matchIndex: mi });
      }
      roundMatches.push(arr);
    }

    // 2. Populate round 1 with seeded teams (and handle BYEs)
    for (let mi = 0; mi < roundMatches[0].length; mi++) {
      const teamA = slots[mi * 2];
      const teamB = slots[mi * 2 + 1];
      const matchRef = roundMatches[0][mi];

      if (teamA && !teamB) {
        // BYE for teamB → auto-advance teamA
        await db.match.update({
          where: { id: matchRef.id },
          data: {
            teamAId: teamA.id,
            teamBId: null,
            winnerId: teamA.id,
            status: "COMPLETED",
            scoreA: 1,
            scoreB: 0,
          },
        });
      } else if (!teamA && teamB) {
        // BYE for teamA → auto-advance teamB
        await db.match.update({
          where: { id: matchRef.id },
          data: {
            teamAId: null,
            teamBId: teamB.id,
            winnerId: teamB.id,
            status: "COMPLETED",
            scoreA: 0,
            scoreB: 1,
          },
        });
      } else if (teamA && teamB) {
        await db.match.update({
          where: { id: matchRef.id },
          data: { teamAId: teamA.id, teamBId: teamB.id },
        });
      }
      // If both null (shouldn't happen with proper padding), leave empty
    }

    // 3. Set nextMatchId on every match pointing to its child in the next round
    for (let r = 0; r < totalRounds - 1; r++) {
      for (const m of roundMatches[r]) {
        const nextMatchIndex = Math.floor(m.matchIndex / 2);
        const nextMatch = roundMatches[r + 1][nextMatchIndex];
        if (nextMatch) {
          await db.match.update({
            where: { id: m.id },
            data: { nextMatchId: nextMatch.id },
          });
        }
      }
    }

    // 4. Propagate BYE winners into round 2 so subsequent matches have both teams set
    if (totalRounds >= 2) {
      for (const m of roundMatches[0]) {
        const full = await db.match.findUnique({
          where: { id: m.id },
          select: { winnerId: true, status: true, matchIndex: true, nextMatchId: true },
        });
        if (full?.status === "COMPLETED" && full.winnerId && full.nextMatchId) {
          const isEven = full.matchIndex % 2 === 0;
          await db.match.update({
            where: { id: full.nextMatchId },
            data: isEven
              ? { teamAId: full.winnerId }
              : { teamBId: full.winnerId },
          });
        }
      }

      // Auto-advance round 2 matches that end up with exactly one real team (BYE-vs-BYE propagation)
      // This handles cascading BYEs.
      for (let r = 1; r < totalRounds - 1; r++) {
        for (const m of roundMatches[r]) {
          const full = await db.match.findUnique({
            where: { id: m.id },
            select: {
              teamAId: true,
              teamBId: true,
              status: true,
              matchIndex: true,
              nextMatchId: true,
            },
          });
          if (!full || full.status === "COMPLETED") continue;
          if (full.teamAId && !full.teamBId) {
            const winnerId = full.teamAId;
            await db.match.update({
              where: { id: m.id },
              data: {
                winnerId,
                status: "COMPLETED",
                scoreA: 1,
                scoreB: 0,
              },
            });
            if (full.nextMatchId) {
              const isEven = full.matchIndex % 2 === 0;
              await db.match.update({
                where: { id: full.nextMatchId },
                data: isEven
                  ? { teamAId: winnerId }
                  : { teamBId: winnerId },
              });
            }
          } else if (!full.teamAId && full.teamBId) {
            const winnerId = full.teamBId;
            await db.match.update({
              where: { id: m.id },
              data: {
                winnerId,
                status: "COMPLETED",
                scoreA: 0,
                scoreB: 1,
              },
            });
            if (full.nextMatchId) {
              const isEven = full.matchIndex % 2 === 0;
              await db.match.update({
                where: { id: full.nextMatchId },
                data: isEven
                  ? { teamAId: winnerId }
                  : { teamBId: winnerId },
              });
            }
          }
        }
      }
    }

    // 5. Return the full bracket
    const allMatches = await db.match.findMany({
      where: { tournamentId: id },
      orderBy: [{ round: "asc" }, { matchIndex: "asc" }],
      include: { teamA: true, teamB: true },
    });

    return NextResponse.json({
      matches: allMatches,
      rounds: totalRounds,
      teamCount: teams.length,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
