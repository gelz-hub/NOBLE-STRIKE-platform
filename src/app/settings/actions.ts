"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  profileSettingsSchema,
  notificationPreferencesSchema,
  privacySettingsSchema,
  appearanceSettingsSchema,
} from "@/lib/validation/profile";

export type ActionResult = { error: string } | { success: true };

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updateProfileSettings(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  let socialLinks: unknown = [];
  try {
    socialLinks = JSON.parse(String(formData.get("social_links") || "[]"));
  } catch {
    return { error: "Invalid social links." };
  }

  const parsed = profileSettingsSchema.safeParse({
    username: String(formData.get("username") || ""),
    display_name: String(formData.get("display_name") || ""),
    country: String(formData.get("country") || ""),
    bio: String(formData.get("bio") || ""),
    discord_username: String(formData.get("discord_username") || ""),
    avatar_url: String(formData.get("avatar_url") || ""),
    banner_url: String(formData.get("banner_url") || ""),
    social_links: socialLinks,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  // Username uniqueness — the DB has a unique constraint too, but check
  // here first so we can return a friendly message instead of a raw
  // Postgres constraint-violation string.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", parsed.data.username)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) return { error: "That username is already taken." };

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.display_name || null,
      country: parsed.data.country || null,
      bio: parsed.data.bio || null,
      discord_username: parsed.data.discord_username || null,
      avatar_url: parsed.data.avatar_url || null,
      banner_url: parsed.data.banner_url || null,
      social_links: parsed.data.social_links,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/profile");
  revalidatePath(`/users/${parsed.data.username}`);
  return { success: true };
}

export async function updateEmail(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Please enter an email address." };

  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };

  return { success: true };
}

export async function updatePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}

export async function updateNotificationPreferences(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = notificationPreferencesSchema.safeParse({
    notify_tournament: formData.get("notify_tournament") === "true",
    notify_match: formData.get("notify_match") === "true",
    notify_news: formData.get("notify_news") === "true",
    notify_system: formData.get("notify_system") === "true",
    notify_email: formData.get("notify_email") === "true",
    notify_telegram: formData.get("notify_telegram") === "true",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/notifications");
  return { success: true };
}

export async function updatePrivacySettings(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = privacySettingsSchema.safeParse({
    privacy_public_profile: formData.get("privacy_public_profile") === "true",
    privacy_show_teams: formData.get("privacy_show_teams") === "true",
    privacy_show_match_history: formData.get("privacy_show_match_history") === "true",
    privacy_show_discord: formData.get("privacy_show_discord") === "true",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/privacy");
  return { success: true };
}

export async function updateThemePreference(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = appearanceSettingsSchema.safeParse({
    theme_preference: String(formData.get("theme_preference") || "dark"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { error } = await supabase
    .from("profiles")
    .update({ theme_preference: parsed.data.theme_preference })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Telegram account linking
// ---------------------------------------------------------------------------

export type TelegramLinkResult = { error: string } | { success: true; deepLink: string };

const LINK_TOKEN_TTL_MINUTES = 15;

/**
 * Creates a short-lived, single-use token and returns the deep link the
 * user opens in Telegram (t.me/<bot>?start=<token>). The bot's webhook
 * handler consumes the token via the consume_telegram_link_token()
 * SECURITY DEFINER function (see 0014_telegram_integration.sql) — it has
 * no user session to work with otherwise.
 */
export async function generateTelegramLinkToken(): Promise<TelegramLinkResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return { error: "Telegram isn't configured on this deployment yet." };
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("telegram_link_tokens").insert({
    user_id: user.id,
    token,
    expires_at: new Date(Date.now() + LINK_TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
  });
  if (error) return { error: error.message };

  return { success: true, deepLink: `https://t.me/${botUsername}?start=${token}` };
}

export async function unlinkTelegram(): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ telegram_id: null, telegram_username: null, telegram_linked_at: null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/notifications");
  return { success: true };
}
