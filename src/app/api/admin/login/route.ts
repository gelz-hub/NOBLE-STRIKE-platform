import { NextResponse } from "next/server";

// POST /api/admin/login
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = body?.password;
    const expected = process.env.ADMIN_PASSWORD || "noblestrike";

    if (password !== expected) {
      return NextResponse.json(
        { ok: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, token: "ns-admin" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
