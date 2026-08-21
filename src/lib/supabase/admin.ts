import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses Row Level Security entirely.
 *
 * Restricted to scripts/migrate-sqlite-to-supabase.ts. Never import this
 * from anything under src/app: every user-reachable request must go through
 * src/lib/supabase/server.ts or client.ts so RLS actually applies.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
