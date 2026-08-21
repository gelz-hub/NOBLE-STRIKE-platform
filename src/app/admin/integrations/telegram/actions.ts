"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramChannelMessage, sendTelegramMessage, isTelegramConfigured } from "@/lib/telegram/client";

export type ActionResult = { error: string } | { success: true };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, isAdmin: profile?.role === "admin" };
}

export async function updateTelegramSettings(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const channelId = String(formData.get("channel_id") || "").trim();
  const notificationsEnabled = formData.get("notifications_enabled") === "true";

  const { error } = await supabase
    .from("telegram_settings")
    .update({
      channel_id: channelId || null,
      notifications_enabled: notificationsEnabled,
      updated_by: user.id,
    })
    .eq("id", true);
  if (error) return { error: error.message };

  revalidatePath("/admin/integrations/telegram");
  return { success: true };
}

export async function sendTestMessage(target: "channel" | "self"): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  if (!isTelegramConfigured()) {
    return { error: "TELEGRAM_BOT_TOKEN isn't set on this deployment." };
  }

  const testMessage = "This is a test message from NOBLE STRIKE's admin panel. If you can read this, the bot is working.";

  if (target === "channel") {
    const { data: settings } = await supabase
      .from("telegram_settings")
      .select("channel_id")
      .eq("id", true)
      .single();
    if (!settings?.channel_id) return { error: "No channel ID is configured yet." };

    const result = await sendTelegramChannelMessage(settings.channel_id, testMessage);
    if (!result.ok) return { error: result.error ?? "Failed to send." };
    return { success: true };
  }

  const { data: profile } = await supabase.from("profiles").select("telegram_id").eq("id", user.id).single();
  if (!profile?.telegram_id) return { error: "Link your own Telegram account first (Settings → Notifications)." };

  const result = await sendTelegramMessage(profile.telegram_id, testMessage);
  if (!result.ok) return { error: result.error ?? "Failed to send." };
  return { success: true };
}
