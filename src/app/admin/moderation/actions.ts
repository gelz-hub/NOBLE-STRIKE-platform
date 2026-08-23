"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { flagAccount } from "@/lib/moderation";
import type { ModerationActionType, ModerationTargetType, Report } from "@/lib/types/database";

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

async function logModerationAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminId: string,
  actionType: ModerationActionType,
  targetType: ModerationTargetType,
  targetId: string,
  reason?: string
) {
  await supabase.from("moderation_actions").insert({
    admin_id: adminId,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    reason: reason ?? null,
  });
}

export interface AdminReportRow extends Report {
  reporter: { id: string; username: string | null } | null;
}

export async function getPendingReports(): Promise<AdminReportRow[]> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return [];
  const { data } = await supabase
    .from("reports")
    .select("*, reporter:reporter_id(id, username)")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as AdminReportRow[];
}

/** Resolves a report — optionally taking action against the reported user/post in the same step. */
export async function resolveReport(
  reportId: string,
  targetType: "USER" | "RECRUITMENT_POST",
  targetId: string,
  takeAction: "NONE" | "FLAG_ACCOUNT" | "REMOVE_POST",
  reason: string
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: t("unauthorized") };
  if (!isAdmin) return { error: t("adminRequired") };

  if (takeAction === "FLAG_ACCOUNT" && targetType === "USER") {
    await flagAccount(supabase, targetId, reason || "Flagged from report review");
    await logModerationAction(supabase, user.id, "ACCOUNT_FLAGGED", "USER", targetId, reason);
  }
  if (takeAction === "REMOVE_POST" && targetType === "RECRUITMENT_POST") {
    await supabase.from("recruitment_posts").delete().eq("id", targetId);
    await logModerationAction(supabase, user.id, "POST_REMOVED", "RECRUITMENT_POST", targetId, reason);
  }

  const { error } = await supabase
    .from("reports")
    .update({ status: "RESOLVED", resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) return { error: error.message };

  await logModerationAction(supabase, user.id, "REPORT_RESOLVED", "REPORT", reportId, reason);

  revalidatePath("/admin/moderation");
  revalidatePath("/recruitment");
  return { success: true };
}

export async function dismissReport(reportId: string): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: t("unauthorized") };
  if (!isAdmin) return { error: t("adminRequired") };

  const { error } = await supabase
    .from("reports")
    .update({ status: "DISMISSED", resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) return { error: error.message };

  await logModerationAction(supabase, user.id, "REPORT_DISMISSED", "REPORT", reportId);

  revalidatePath("/admin/moderation");
  return { success: true };
}

export async function unflagAccount(userId: string): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user) return { error: t("unauthorized") };
  if (!isAdmin) return { error: t("adminRequired") };

  const { error } = await supabase
    .from("profiles")
    .update({ flagged_at: null, flag_reason: null })
    .eq("id", userId);
  if (error) return { error: error.message };

  await logModerationAction(supabase, user.id, "ACCOUNT_UNFLAGGED", "USER", userId);

  revalidatePath("/admin/moderation");
  return { success: true };
}

export interface FlaggedProfileRow {
  id: string;
  username: string | null;
  flagged_at: string | null;
  flag_reason: string | null;
}

export async function getFlaggedAccounts(): Promise<FlaggedProfileRow[]> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, flagged_at, flag_reason")
    .not("flagged_at", "is", null)
    .order("flagged_at", { ascending: false });
  return (data ?? []) as FlaggedProfileRow[];
}
