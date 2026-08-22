"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
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

/** Resolves a dot-path translation key (e.g. "errors.unauthorized") from the root of the message tree. */
async function t(key: string): Promise<string> {
  const translator = await getTranslations();
  return translator(key);
}

/** Zod messages in newsSchema are dot-path translation keys (e.g. "validation.news.titleTooShort"). */
async function firstIssue(error: { issues: { message: string }[] }): Promise<string> {
  const key = error.issues[0]?.message;
  if (!key) return await t("validation.generic");
  const translator = await getTranslations();
  return translator.has(key) ? translator(key) : key;
}

function readNewsForm(formData: FormData) {
  return {
    title_en: String(formData.get("title_en") || ""),
    title_km: String(formData.get("title_km") || ""),
    slug: String(formData.get("slug") || ""),
    excerpt_en: String(formData.get("excerpt_en") || ""),
    excerpt_km: String(formData.get("excerpt_km") || ""),
    content_en: String(formData.get("content_en") || ""),
    content_km: String(formData.get("content_km") || ""),
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
    title_en: data.title_en,
    title_km: data.title_km || null,
    slug: data.slug,
    excerpt_en: data.excerpt_en || null,
    excerpt_km: data.excerpt_km || null,
    content_en: data.content_en,
    content_km: data.content_km || null,
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
  news: { title_en: string; category: string; slug: string },
  wasPublished: boolean,
  isPublished: boolean
) {
  if (isPublished && !wasPublished) {
    const t = await getTranslations("admin.news");
    if (news.category === "ANNOUNCEMENT") {
      await broadcastNotification(supabase, t("notifyAnnouncementTitle"), news.title_en);
    } else if (news.category === "TOURNAMENT") {
      await broadcastNotification(supabase, t("notifyTournamentTitle"), news.title_en);
    }
    logEvent({
      event: "news.published",
      slug: news.slug,
      title: news.title_en,
      category: news.category,
    });
  }
}

export async function createNews(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: await t("errors.unauthorized") };
  if (!isAdmin) return { error: await t("errors.adminRequired") };

  const raw = readNewsForm(formData);
  const parsed = newsSchema.safeParse({ ...raw, slug: raw.slug || slugifyTitle(raw.title_en) });
  if (!parsed.success) return { error: await firstIssue(parsed.error) };

  const row = toRow(parsed.data);
  const { data, error } = await supabase
    .from("news")
    .insert({ ...row, author_id: user.id })
    .select("id, title_en, category, slug")
    .single();

  if (error) {
    return { error: error.code === "23505" ? await t("validation.news.slugTaken") : error.message };
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
  if (!user) return { error: await t("errors.unauthorized") };
  if (!isAdmin) return { error: await t("errors.adminRequired") };

  const raw = readNewsForm(formData);
  const parsed = newsSchema.safeParse(raw);
  if (!parsed.success) return { error: await firstIssue(parsed.error) };

  const { data: existing } = await supabase.from("news").select("status, slug").eq("id", newsId).single();
  const wasPublished = existing?.status === "PUBLISHED";

  const row = toRow(parsed.data);
  const { data, error } = await supabase
    .from("news")
    .update(row)
    .eq("id", newsId)
    .select("id, title_en, category, slug")
    .single();

  if (error) {
    return { error: error.code === "23505" ? await t("validation.news.slugTaken") : error.message };
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
  if (!user) return { error: await t("errors.unauthorized") };
  if (!isAdmin) return { error: await t("errors.adminRequired") };

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
  if (!user) return { error: await t("errors.unauthorized") };
  if (!isAdmin) return { error: await t("errors.adminRequired") };

  const { error } = await supabase.from("news").delete().eq("id", newsId);
  if (error) return { error: error.message };

  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { success: true };
}

export async function broadcastNewsToTelegram(newsId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: await t("errors.unauthorized") };
  if (!isAdmin) return { error: await t("errors.adminRequired") };

  const tNews = await getTranslations("admin.news.telegram");
  if (!isTelegramConfigured()) return { error: tNews("botNotConfigured") };

  const { data: settings } = await supabase.from("telegram_settings").select("channel_id, notifications_enabled").eq("id", true).single();
  if (!settings?.channel_id) return { error: tNews("channelNotConfigured") };
  if (settings.notifications_enabled === false) return { error: tNews("notificationsDisabled") };

  const { data: news } = await supabase
    .from("news")
    .select("title_en, title_km, slug, excerpt_en, status")
    .eq("id", newsId)
    .single();
  if (!news) return { error: tNews("articleNotFound") };
  if (news.status !== "PUBLISHED") return { error: tNews("onlyPublished") };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // Channel broadcasts reach both English- and Khmer-reading subscribers, so
  // send both language versions of the title in one message (falling back to
  // English-only when no Khmer title was written).
  const titleLine = news.title_km
    ? `🇬🇧 <b>${news.title_en}</b>\n\n🇰🇭 <b>${news.title_km}</b>`
    : `<b>${news.title_en}</b>`;
  const text = [titleLine, news.excerpt_en || null, `${siteUrl}/news/${news.slug}`].filter(Boolean).join("\n");

  const result = await sendTelegramChannelMessage(settings.channel_id, text);
  if (!result.ok) return { error: result.error ?? tNews("sendFailed") };

  logEvent({ event: "telegram.news_broadcast", newsId, slug: news.slug, sentBy: user.id });
  return { success: true };
}
