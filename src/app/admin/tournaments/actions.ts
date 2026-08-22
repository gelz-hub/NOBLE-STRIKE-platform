"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { tournamentSchema, slugify, type TournamentInput } from "@/lib/validation/tournament";
import type { TournamentStatus } from "@/lib/types/database";
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

/** Validation issue messages are stable translation keys (see validation/tournament.ts) — resolve
 *  them to the current locale's text before surfacing to the client. */
async function firstIssue(error: { issues: { message: string }[] }): Promise<string> {
  const key = error.issues[0]?.message;
  if (!key) return "Invalid input.";
  const t = await getTranslations();
  return t.has(key) ? t(key) : key;
}

function readTournamentForm(formData: FormData) {
  return {
    name_en: String(formData.get("name_en") || ""),
    name_km: String(formData.get("name_km") || ""),
    slug: String(formData.get("slug") || ""),
    description_en: String(formData.get("description_en") || ""),
    description_km: String(formData.get("description_km") || ""),
    rules: String(formData.get("rules") || ""),
    banner_url: String(formData.get("banner_url") || ""),
    game_type: String(formData.get("game_type") || "MLBB"),
    format: String(formData.get("format") || "BO1"),
    bracket_format: String(formData.get("bracket_format") || "SINGLE_ELIMINATION"),
    grand_final_reset_enabled: String(formData.get("grand_final_reset_enabled") || "true"),
    max_teams: String(formData.get("max_teams") || ""),
    prize_pool: String(formData.get("prize_pool") || "0"),
    registration_deadline: String(formData.get("registration_deadline") || ""),
    start_date: String(formData.get("start_date") || ""),
    status: String(formData.get("status") || "DRAFT"),
    location: String(formData.get("location") || ""),
    organizer: String(formData.get("organizer") || ""),
  };
}

/** Inserts with the given slug, retrying with a random suffix on collision. */
async function insertWithUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: TournamentInput
) {
  let slug = data.slug;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error } = await supabase
      .from("tournaments")
      .insert({
        name_en: data.name_en,
        name_km: data.name_km || null,
        slug,
        description_en: data.description_en || null,
        description_km: data.description_km || null,
        rules: data.rules || null,
        banner_url: data.banner_url || null,
        game_type: data.game_type,
        format: data.format,
        bracket_format: data.bracket_format,
        grand_final_reset_enabled: data.grand_final_reset_enabled,
        max_teams: data.max_teams,
        prize_pool: data.prize_pool,
        registration_deadline: new Date(data.registration_deadline).toISOString(),
        start_date: new Date(data.start_date).toISOString(),
        status: data.status,
        location: data.location || null,
        organizer: data.organizer || null,
      })
      .select("id")
      .single();

    if (!error) return { id: row.id, error: null };
    if (error.code === "23505") {
      slug = `${data.slug}-${Math.random().toString(36).slice(2, 6)}`;
      continue;
    }
    return { id: null, error: error.message };
  }
  return { id: null, error: "Could not generate a unique slug. Please choose one manually." };
}

export async function createTournament(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const raw = readTournamentForm(formData);
  const parsed = tournamentSchema.safeParse({
    ...raw,
    slug: raw.slug || slugify(raw.name_en),
  });
  if (!parsed.success) return { error: await firstIssue(parsed.error) };

  const supabase = await createClient();
  const { id, error } = await insertWithUniqueSlug(supabase, parsed.data);
  if (error) return { error };

  logEvent({
    event: "tournament.created",
    tournamentId: id,
    title: parsed.data.name_en,
    gameType: parsed.data.game_type,
    createdBy: user.id,
  });

  revalidatePath("/admin/tournaments");
  redirect(`/admin/tournaments/${id}/edit`);
}

export async function updateTournament(
  tournamentId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const raw = readTournamentForm(formData);
  const parsed = tournamentSchema.safeParse(raw);
  if (!parsed.success) return { error: await firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update({
      name_en: parsed.data.name_en,
      name_km: parsed.data.name_km || null,
      slug: parsed.data.slug,
      description_en: parsed.data.description_en || null,
      description_km: parsed.data.description_km || null,
      rules: parsed.data.rules || null,
      banner_url: parsed.data.banner_url || null,
      game_type: parsed.data.game_type,
      format: parsed.data.format,
      bracket_format: parsed.data.bracket_format,
      grand_final_reset_enabled: parsed.data.grand_final_reset_enabled,
      max_teams: parsed.data.max_teams,
      prize_pool: parsed.data.prize_pool,
      registration_deadline: new Date(parsed.data.registration_deadline).toISOString(),
      start_date: new Date(parsed.data.start_date).toISOString(),
      status: parsed.data.status,
      location: parsed.data.location || null,
      organizer: parsed.data.organizer || null,
    })
    .eq("id", tournamentId);

  if (error) {
    return {
      error: error.code === "23505" ? "That slug is already in use." : error.message,
    };
  }

  revalidatePath("/admin/tournaments");
  revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function changeTournamentStatus(
  tournamentId: string,
  status: TournamentStatus
): Promise<ActionResult> {
  const { user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ status })
    .eq("id", tournamentId);
  if (error) return { error: error.message };

  revalidatePath("/admin/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function archiveTournament(tournamentId: string): Promise<ActionResult> {
  return changeTournamentStatus(tournamentId, "ARCHIVED");
}

export async function deleteTournament(tournamentId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const { count } = await supabase
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "APPROVED");

  if ((count ?? 0) > 0) {
    return {
      error: "This tournament has approved teams and cannot be deleted. Archive it instead.",
    };
  }

  const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);
  if (error) return { error: error.message };

  revalidatePath("/admin/tournaments");
  return { success: true };
}

export async function duplicateTournament(tournamentId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  const { data: original } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();
  if (!original) return { error: "Tournament not found." };

  const newTitle = `${original.name_en} (Copy)`;
  const baseSlug = slugify(newTitle);

  const { error } = await insertWithUniqueSlug(supabase, {
    name_en: newTitle,
    name_km: original.name_km ? `${original.name_km} (Copy)` : "",
    slug: baseSlug,
    description_en: original.description_en ?? "",
    description_km: original.description_km ?? "",
    rules: original.rules ?? "",
    banner_url: original.banner_url ?? "",
    game_type: original.game_type,
    format: original.format,
    bracket_format: original.bracket_format,
    grand_final_reset_enabled: original.grand_final_reset_enabled,
    max_teams: original.max_teams,
    prize_pool: original.prize_pool,
    registration_deadline: original.registration_deadline,
    start_date: original.start_date,
    status: "DRAFT",
    location: original.location ?? "",
    organizer: original.organizer ?? "",
  });
  if (error) return { error };

  revalidatePath("/admin/tournaments");
  return { success: true };
}


export async function broadcastTournamentToTelegram(tournamentId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: "You must be signed in." };
  if (!isAdmin) return { error: "Admin access required." };

  if (!isTelegramConfigured()) return { error: "TELEGRAM_BOT_TOKEN isn't set on this deployment." };

  const { data: settings } = await supabase.from("telegram_settings").select("channel_id, notifications_enabled").eq("id", true).single();
  if (!settings?.channel_id) return { error: "No Telegram channel is configured (Admin → Telegram)." };
  if (settings.notifications_enabled === false) return { error: "Telegram notifications are currently disabled (Admin → Telegram)." };

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("name_en, name_km, slug, game_type, status, prize_pool, registration_deadline, start_date")
    .eq("id", tournamentId)
    .single();
  if (!tournament) return { error: "Tournament not found." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const heading = tournament.status === "REGISTRATION_OPEN" ? "Registration Now Open" : "Tournament Announcement";
  const text = [
    `<b>${heading}: ${tournament.name_en}</b>`,
    `Game: ${tournament.game_type}`,
    tournament.prize_pool ? `Prize Pool: ${tournament.prize_pool}` : null,
    tournament.status === "REGISTRATION_OPEN"
      ? `Registration closes: ${new Date(tournament.registration_deadline).toLocaleDateString()}`
      : `Starts: ${new Date(tournament.start_date).toLocaleDateString()}`,
    `${siteUrl}/tournaments/${tournamentId}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendTelegramChannelMessage(settings.channel_id, text);
  if (!result.ok) return { error: result.error ?? "Failed to send." };

  logEvent({ event: "telegram.tournament_broadcast", tournamentId, sentBy: user.id });
  return { success: true };
}
