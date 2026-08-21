import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationCategory } from "@/lib/types/database";
import { sendTelegramMessage } from "@/lib/telegram/client";

const PREFERENCE_COLUMN: Record<NotificationCategory, string> = {
  tournament: "notify_tournament",
  match: "notify_match",
  news: "notify_news",
  system: "notify_system",
};

/**
 * Inserts a notification using the caller's own Supabase client (never a
 * service-role client), so RLS decides who's allowed to write it: a user
 * can create their own (e.g. "registration submitted"), an admin can create
 * one for any user (e.g. "registration approved/rejected").
 *
 * Before inserting, checks the recipient's notification preference for this
 * category (profiles.notify_tournament/notify_match/notify_news/notify_system)
 * and silently skips the insert if they've opted out — this is what makes
 * the Notification Preferences settings tab actually do something, not just
 * store an unused value.
 *
 * Also fans out to Telegram when the recipient has linked an account, has
 * notify_telegram on, AND still has this specific category's preference on
 * (Telegram isn't a separate opt-in from "do I want match notifications at
 * all" — it's an additional delivery channel for the same preference, gated
 * by one more global admin kill-switch: telegram_settings.notifications_enabled).
 * Telegram delivery failures are logged and swallowed — never let a
 * Telegram API hiccup fail the action that triggered the notification.
 */
export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  message: string,
  category: NotificationCategory = "system"
): Promise<void> {
  const column = PREFERENCE_COLUMN[category];
  const { data: profile } = await supabase
    .from("profiles")
    .select(`${column}, notify_telegram, telegram_id`)
    .eq("id", userId)
    .single<Record<string, boolean | number | null>>();

  // Default to allowed if the preference can't be read (e.g. RLS edge case)
  // — never let a lookup failure silently swallow a notification.
  const categoryAllowed = !profile || profile[column] !== false;
  if (!categoryAllowed) return;

  const { error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, title, message });
  if (error) {
    console.error("createNotification failed:", error.message);
  }

  const telegramId = profile?.telegram_id as number | null | undefined;
  const telegramOptedIn = profile?.notify_telegram !== false;
  if (telegramId && telegramOptedIn) {
    const { data: settings } = await supabase
      .from("telegram_settings")
      .select("notifications_enabled")
      .eq("id", true)
      .maybeSingle<{ notifications_enabled: boolean }>();
    if (settings?.notifications_enabled !== false) {
      await sendTelegramMessage(telegramId, `<b>${escapeHtml(title)}</b>\n${escapeHtml(message)}`);
    }
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
