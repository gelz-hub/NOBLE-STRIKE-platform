"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { REPORT_REASONS } from "@/lib/validation/report";
import type { ReportReason, ReportTargetType } from "@/lib/types/database";

export type ActionResult = { error: string } | { success: true };

async function createReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  details: string
): Promise<ActionResult> {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("errors.unauthorized") };

  if (!REPORT_REASONS.includes(reason as ReportReason)) {
    return { error: t("validation.generic") };
  }

  // Reporting your own profile makes no sense and is a common way to probe
  // for how the report flow behaves — block it outright.
  if (targetType === "USER" && targetId === user.id) {
    return { error: t("moderation.errors.cannotReportSelf") };
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit("report-create", user.id);
  if (!allowed) return { error: t("moderation.errors.reportingTooFast", { seconds: retryAfterSeconds }) };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details.trim() || null,
  });
  if (error) return { error: error.message };

  return { success: true };
}

export async function reportUser(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return createReport(
    "USER",
    String(formData.get("target_id") || ""),
    String(formData.get("reason") || ""),
    String(formData.get("details") || "")
  );
}

export async function reportRecruitmentPost(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return createReport(
    "RECRUITMENT_POST",
    String(formData.get("target_id") || ""),
    String(formData.get("reason") || ""),
    String(formData.get("details") || "")
  );
}
