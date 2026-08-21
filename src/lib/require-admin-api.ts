import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Same admin check used by every Server Action and RLS policy
 * (profiles.role === "admin", via the real Supabase session) — for the
 * handful of legacy Prisma-backed API routes that predate that system and
 * were never given an auth check. Returns a 401/403 NextResponse to return
 * immediately, or null if the caller is a confirmed admin.
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return null;
}

/** Same as above, but only requires a signed-in user (any role). */
export async function requireAuthApi(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
