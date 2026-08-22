"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { legacyEventSchema, parseTop34, type LegacyEventInput } from "@/lib/validation/legacy";

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

/** Zod messages in legacyEventSchema are dot-path translation keys (e.g. "validation.legacy.invalidYear"). */
async function firstIssue(error: { issues: { message: string }[] }): Promise<string> {
  const key = error.issues[0]?.message;
  if (!key) return await tGeneric();
  const t = await getTranslations();
  return t.has(key) ? t(key) : key;
}

async function tGeneric() {
  const t = await getTranslations("validation");
  return t("generic");
}

async function tErr(key: "unauthorized" | "adminRequired") {
  const t = await getTranslations("admin.legacy.errors");
  return t(key);
}

function readLegacyForm(formData: FormData) {
  return {
    year: String(formData.get("year") || ""),
    title_en: String(formData.get("title_en") || ""),
    title_km: String(formData.get("title_km") || ""),
    category: String(formData.get("category") || "TOURNAMENT"),
    status: String(formData.get("status") || "COMPLETED"),
    event_date_label: String(formData.get("event_date_label") || ""),
    game: String(formData.get("game") || ""),
    teams_label: String(formData.get("teams_label") || ""),
    teams_max: String(formData.get("teams_max") || ""),
    format: String(formData.get("format") || ""),
    organized_by: String(formData.get("organized_by") || ""),
    live_broadcast: String(formData.get("live_broadcast") || "false"),
    entry_fee: String(formData.get("entry_fee") || ""),
    tournament_mode: String(formData.get("tournament_mode") || ""),
    prize_pool_label: String(formData.get("prize_pool_label") || ""),
    prize_pool_max: String(formData.get("prize_pool_max") || ""),
    champion: String(formData.get("champion") || ""),
    runner_up: String(formData.get("runner_up") || ""),
    top_3_4: String(formData.get("top_3_4") || ""),
    support_team: String(formData.get("support_team") || ""),
    description_en: String(formData.get("description_en") || ""),
    description_km: String(formData.get("description_km") || ""),
    cover_image_url: String(formData.get("cover_image_url") || ""),
    gallery_urls: JSON.parse(String(formData.get("gallery_urls") || "[]")),
    display_order: String(formData.get("display_order") || ""),
    is_published: String(formData.get("is_published") || "true"),
  };
}

function toRow(data: LegacyEventInput) {
  return {
    year: data.year,
    title_en: data.title_en,
    title_km: data.title_km || null,
    category: data.category,
    status: data.status,
    event_date_label: data.event_date_label || null,
    game: data.game || null,
    teams_label: data.teams_label || null,
    teams_max: data.teams_max ?? null,
    format: data.format || null,
    organized_by: data.organized_by || null,
    live_broadcast: data.live_broadcast,
    entry_fee: data.entry_fee || null,
    tournament_mode: data.tournament_mode || null,
    prize_pool_label: data.prize_pool_label || null,
    prize_pool_max: data.prize_pool_max ?? null,
    champion: data.champion || null,
    runner_up: data.runner_up || null,
    top_3_4: parseTop34(data.top_3_4),
    support_team: data.support_team || null,
    description_en: data.description_en || null,
    description_km: data.description_km || null,
    cover_image_url: data.cover_image_url || null,
    gallery_urls: data.gallery_urls ?? [],
    display_order: data.display_order ?? 0,
    is_published: data.is_published,
  };
}

export async function createLegacyEvent(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { user, isAdmin, supabase } = await requireAdmin();
  if (!user) return { error: await tErr("unauthorized") };
  if (!isAdmin) return { error: await tErr("adminRequired") };

  const parsed = legacyEventSchema.safeParse(readLegacyForm(formData));
  if (!parsed.success) return { error: await firstIssue(parsed.error) };

  const { data, error } = await supabase
    .from("legacy_events")
    .insert({ ...toRow(parsed.data), created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/legacy");
  revalidatePath("/legacy");
  redirect(`/admin/legacy/${data.id}/edit`);
}

export async function updateLegacyEvent(
  eventId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { user, isAdmin, supabase } = await requireAdmin();
  if (!user) return { error: await tErr("unauthorized") };
  if (!isAdmin) return { error: await tErr("adminRequired") };

  const parsed = legacyEventSchema.safeParse(readLegacyForm(formData));
  if (!parsed.success) return { error: await firstIssue(parsed.error) };

  const { error } = await supabase.from("legacy_events").update(toRow(parsed.data)).eq("id", eventId);
  if (error) return { error: error.message };

  revalidatePath("/admin/legacy");
  revalidatePath(`/admin/legacy/${eventId}/edit`);
  revalidatePath("/legacy");
  return { success: true };
}

export async function deleteLegacyEvent(eventId: string): Promise<ActionResult> {
  const { user, isAdmin, supabase } = await requireAdmin();
  if (!user) return { error: await tErr("unauthorized") };
  if (!isAdmin) return { error: await tErr("adminRequired") };

  const { error } = await supabase.from("legacy_events").delete().eq("id", eventId);
  if (error) return { error: error.message };

  revalidatePath("/admin/legacy");
  revalidatePath("/legacy");
  return { success: true };
}

export async function togglePublishLegacyEvent(eventId: string, publish: boolean): Promise<ActionResult> {
  const { user, isAdmin, supabase } = await requireAdmin();
  if (!user) return { error: await tErr("unauthorized") };
  if (!isAdmin) return { error: await tErr("adminRequired") };

  const { error } = await supabase.from("legacy_events").update({ is_published: publish }).eq("id", eventId);
  if (error) return { error: error.message };

  revalidatePath("/admin/legacy");
  revalidatePath("/legacy");
  return { success: true };
}
