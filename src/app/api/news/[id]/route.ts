import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/require-admin-api";

type Params = { params: Promise<{ id: string }> };

// GET /api/news/[id]
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const announcement = await db.announcement.findUnique({ where: { id } });
    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }
    return NextResponse.json(announcement);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PUT /api/news/[id]
export async function PUT(request: Request, { params }: Params) {
  try {
    const authError = await requireAdminApi();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    const allowed = [
      "title", "content", "excerpt", "category",
      "featured", "coverImage", "author", "published",
    ];
    for (const k of allowed) {
      if (k in body) {
        if (k === "featured" || k === "published") {
          data[k] = Boolean(body[k]);
        } else {
          data[k] = body[k];
        }
      }
    }

    const updated = await db.announcement.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/news/[id]
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const authError = await requireAdminApi();
    if (authError) return authError;

    const { id } = await params;
    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
