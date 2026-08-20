import { NextResponse } from "next/server";
import { runSeed } from "@/lib/seed";

// POST /api/admin/seed — trigger the seed programmatically
export async function POST() {
  try {
    const counts = await runSeed();
    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
