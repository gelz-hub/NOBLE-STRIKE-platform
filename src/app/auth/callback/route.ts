import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` is only ever set by flows that already have their own destination
  // page (e.g. password reset -> /reset-password). Its absence means this is
  // a plain signup email-confirmation link, which gets the dedicated
  // "Email Verified" success page instead of landing silently on /dashboard.
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) {
        return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/dashboard"}`);
      }
      return NextResponse.redirect(`${origin}/verified`);
    }
  }

  return NextResponse.redirect(`${origin}/verify-error`);
}
