import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/news — list announcements (with optional filters)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const featured = searchParams.get("featured");

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (featured === "true") where.featured = true;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const announcements = await db.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(announcements);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/news — create announcement
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, excerpt, category, featured, coverImage, author } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        excerpt: excerpt ?? null,
        category,
        featured: Boolean(featured),
        coverImage: coverImage ?? null,
        author: author ?? null,
        published: true,
      },
    });
    return NextResponse.json(announcement, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
