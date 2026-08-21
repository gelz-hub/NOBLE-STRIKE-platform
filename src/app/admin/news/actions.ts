"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { newsSchema, slugifyTitle, type NewsInput } from "@/lib/validation/news";
import { logEvent } from "@/lib/logger";
import { sendTelegramChannelMessage, isTelegramConfigured } from "@/lib/telegram/client";

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

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

function readNewsForm(formData: FormData) {
  return {
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    content: String(formData.get("content") || ""),
    category: String(formData.get("category") || "ANNOUNCEMENT"),
    status: String(formData.get("status") || "DRAFT"),
    featured: String(formData.get("featured") || "false"),
    pinned: String(formData.get("pinned") || "false"),
    image_url: String(formData.get("image_url") || ""),
    publish_at: String(formData.get("publish_at") || ""),
    seo_description: String(formData.get("seo_description") || ""),
    seo_keywords: String(formData.get("seo_keywords") || ""),
    tournament_id: String(formData.get("tournament_id") || ""),
  };
}

function toRow(data: NewsInput) {
  return {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt || null,
    content: data.content,
    category: data.category,
    status: data.status,
    featured: data.featured,
    pinned: data.pinned,
    image_url: data.image_url || null,
    publish_at: data.publish_at ? new Date(data.publish_at).toISOString() : null,
    seo_description: data.seo_description || null,
    seo_keywords: data.seo_keywords
      ? data.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : null,
    tournament_id: data.tournament_id || null,
  };
}

/**
 * Broadcasts a notification to every user. Runs as the publishing admin's
 * own session — RLS's `notifications_insert_own_or_admin` policy allows an
 * admin to insert a notification row for any user_id, so this needs no
 * service-role client. Fine at this platform's current scale; a genuinely
 * large user base would want a queue instead of a per-user insert loop.
 */
async function broadcastNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  message: string
) {
  const { data: profiles } = await supabase.from("profiles").select("id");
  for (const p of profiles ?? []) {
    await createNotification(supabase, p.id, title, message, "news");
  }
}

async function maybeNotifyOnPublish(
  supabase: Awaited<ReturnType<typeof createClient>>,
  news: { title: string; category: string; slug: string },
  wasPublished: boolean,
  isPublished: boolean
) {
  if (isPublished && !wasPublished) {
    if (news.category === "ANNOUNCEMENT") {
      await broadcastNotification(supabase, "Major Announcement Published", news.title);
    } else if (news.category === "TOURNAMENT") {
      await broadcastNotification(supabase, "Tournament Announcement Published", news.title);
    }
    logEvent({
      event: "news.published",
      slug: news.slug,
      title: news.title,
      category: news.category,
    });
  }
}

export async function createNews(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const raw = readNewsForm(formData);
  const parsed = newsSchema.safeParse({ ...raw, slug: raw.slug || slugifyTitle(raw.title) });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const row = toRow(parsed.data);
  const { data, error } = await supabase
    .from("news")
    .insert({ ...row, author_id: user.id })
    .select("id, title, category, slug")
    .single();

  if (error) {
    return { error: error.code === "23505" ? "That slug is already in use." : error.message };
  }

  if (row.status === "PUBLISHED") {
    await maybeNotifyOnPublish(supabase, data, false, true);
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  redirect(`/admin/news/${data.id}/edit`);
}

export async function updateNews(
  newsId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const raw = readNewsForm(formData);
  const parsed = newsSchema.safeParse(raw);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { data: existing } = await supabase.from("news").select("status, slug").eq("id", newsId).single();
  const wasPublished = existing?.status === "PUBLISHED";

  const row = toRow(parsed.data);
  const { data, error } = await supabase
    .from("news")
    .update(row)
    .eq("id", newsId)
    .select("id, title, category, slug")
    .single();

  if (error) {
    return { error: error.code === "23505" ? "That slug is already in use." : error.message };
  }

  await maybeNotifyOnPublish(supabase, data, wasPublished, row.status === "PUBLISHED");

  revalidatePath("/admin/news");
  revalidatePath(`/admin/news/${newsId}/edit`);
  revalidatePath("/news");
  revalidatePath(`/news/${existing?.slug ?? data.slug}`);
  revalidatePath(`/news/${data.slug}`);
  return { success: true };
}

async function setStatus(newsId: string, status: "DRAFT" | "ARCHIVED"): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const { data, error } = await supabase
    .from("news")
    .update({ status })
    .eq("id", newsId)
    .select("slug")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath(`/news/${data.slug}`);
  return { success: true };
}

export async function unpublishNews(newsId: string): Promise<ActionResult> {
  return setStatus(newsId, "DRAFT");
}

export async function archiveNews(newsId: string): Promise<ActionResult> {
  return setStatus(newsId, "ARCHIVED");
}

export async function deleteNews(newsId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const { error } = await supabase.from("news").delete().eq("id", newsId);
  if (error) return { error: error.message };

  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { success: true };
}

export async function broadcastNewsToTelegram(newsId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  if (!isTelegramConfigured()) return { error: "TELEGRAM_BOT_TOKEN isn't set on this deployment." };

  const { data: settings } = await supabase.from("telegram_settings").select("channel_id, notifications_enabled").eq("id", true).single();
  if (!settings?.channel_id) return { error: "No Telegram channel is configured (Admin → Telegram)." };
  if (settings.notifications_enabled === false) return { error: "Telegram notifications are currently disabled (Admin → Telegram)." };

  const { data: news } = await supabase.from("news").select("title, slug, excerpt, status").eq("id", newsId).single();
  if (!news) return { error: "Article not found." };
  if (news.status !== "PUBLISHED") return { error: "Only published articles can be broadcast." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const text = [`<b>${news.title}</b>`, news.excerpt || null, `${siteUrl}/news/${news.slug}`]
    .filter(Boolean)
    .join("\n");

  const result = await sendTelegramChannelMessage(settings.channel_id, text);
  if (!result.ok) return { error: result.error ?? "Failed to send." };

  logEvent({ event: "telegram.news_broadcast", newsId, slug: news.slug, sentBy: user.id });
  return { success: true };
}
