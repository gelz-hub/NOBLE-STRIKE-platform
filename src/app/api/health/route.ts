import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

/**
 * Public, unauthenticated health check for uptime monitoring (see
 * MONITORING.md). Deliberately reports presence/absence of config, never
 * values — this must never leak a key, URL, or connection string.
 */
export async function GET() {
  const startedAt = Date.now();

  let databaseStatus: "ok" | "error" = "ok";
  let databaseError: string | undefined;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) {
      databaseStatus = "error";
      databaseError = error.message;
    }
  } catch (err) {
    databaseStatus = "error";
    databaseError = err instanceof Error ? err.message : "Unknown error";
  }

  const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  const environmentStatus = missingEnvVars.length === 0 ? "ok" : "error";

  const status = databaseStatus === "ok" && environmentStatus === "ok" ? "ok" : "error";

  const body = {
    status,
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
    version: {
      // VERCEL_GIT_COMMIT_SHA is set automatically by Vercel at build time;
      // falls back to the package.json version for non-Vercel deployments.
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      packageVersion: packageJson.version ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    },
    checks: {
      database: { status: databaseStatus, error: databaseError },
      environment: {
        status: environmentStatus,
        // Names only, never values.
        missing: missingEnvVars.length > 0 ? missingEnvVars : undefined,
      },
    },
  };

  return NextResponse.json(body, { status: status === "ok" ? 200 : 503 });
}
