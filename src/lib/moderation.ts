import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logger";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Marks a profile as flagged for suspicious activity — surfaced to admins
 * on /admin/moderation. Idempotent-ish: overwrites the reason/timestamp
 * rather than stacking multiple flags, since this is a "needs review" flag
 * for an admin to clear, not an incident log (moderation_actions is the
 * audit trail for admin decisions; this is just the trigger for one).
 */
export async function flagAccount(supabase: SupabaseClient, userId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ flagged_at: new Date().toISOString(), flag_reason: reason })
    .eq("id", userId);
  if (error) {
    logEvent({ event: "moderation.flag_account_failed", level: "error", userId, message: error.message });
    return;
  }
  logEvent({ event: "moderation.account_flagged", userId, reason });
}
