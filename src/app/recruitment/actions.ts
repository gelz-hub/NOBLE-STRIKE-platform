"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { lftPostSchema, lfpPostSchema } from "@/lib/validation/recruitment";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkForSpamLinks } from "@/lib/spam-filter";
import { flagAccount } from "@/lib/moderation";
import type { RecruitmentPostType, RecruitmentStatus } from "@/lib/types/database";

export type ActionResult = { error: string } | { success: true };

/** Zod messages in the recruitment schemas are dot-path translation keys. */
async function firstIssue(error: { issues: { message: string }[] }): Promise<string> {
  const key = error.issues[0]?.message;
  const t = await getTranslations();
  if (!key) return t("validation.generic");
  return t.has(key) ? t(key) : key;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function readForm(formData: FormData, postType: RecruitmentPostType) {
  const base = {
    title: String(formData.get("title") || ""),
    game: String(formData.get("game") || "MLBB"),
    role: String(formData.get("role") || "ANY"),
    telegram_username: String(formData.get("telegram_username") || ""),
    description: String(formData.get("description") || ""),
    status: String(formData.get("status") || "OPEN"),
  };
  if (postType === "LFT") {
    return {
      ...base,
      rank: String(formData.get("rank") || ""),
      country_code: String(formData.get("country_code") || ""),
      country_name: String(formData.get("country_name") || ""),
    };
  }
  return {
    ...base,
    requirements: String(formData.get("requirements") || ""),
  };
}

/** Concatenates the free-text fields a spammer could stuff a link into. */
function textFieldsOf(data: Record<string, unknown>): string {
  return [data.title, data.description, data.requirements].filter((v) => typeof v === "string").join(" ");
}

export async function createRecruitmentPost(
  postType: RecruitmentPostType,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations();
  const { supabase, user } = await requireUser();
  if (!user) return { error: t("recruitment.errors.signInToPost") };

  // Content Protection: email must be verified before posting.
  if (!user.email_confirmed_at) return { error: t("recruitment.errors.verifyEmailToPost") };

  // Content Protection: 5 posts per minute per user.
  const { allowed, retryAfterSeconds } = await checkRateLimit("post-create", user.id);
  if (!allowed) return { error: t("recruitment.errors.postingTooFast", { seconds: retryAfterSeconds }) };

  const raw = readForm(formData, postType);
  const schema = postType === "LFT" ? lftPostSchema : lfpPostSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: await firstIssue(parsed.error) };

  // Content Protection: block common spam/phishing links; a match also
  // flags the account for admin review rather than just silently rejecting.
  const spamCheck = checkForSpamLinks(textFieldsOf(parsed.data));
  if (spamCheck.isSpam) {
    await flagAccount(supabase, user.id, `Spam link in recruitment post: ${spamCheck.matchedDomain}`);
    return { error: t("recruitment.errors.spamLinkDetected") };
  }

  // Content Protection: reject a near-identical post from the same author
  // posted in the last 24h (title + description match).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPosts } = await supabase
    .from("recruitment_posts")
    .select("title, description")
    .eq("author_id", user.id)
    .gte("created_at", since);
  const isDuplicate = (recentPosts ?? []).some(
    (p) => p.title === parsed.data.title && p.description === parsed.data.description
  );
  if (isDuplicate) return { error: t("recruitment.errors.duplicatePost") };

  const { error } = await supabase.from("recruitment_posts").insert({
    author_id: user.id,
    post_type: postType,
    ...parsed.data,
  });
  if (error) return { error: error.message };

  revalidatePath("/recruitment");
  return { success: true };
}

export async function updateRecruitmentPost(
  postId: string,
  postType: RecruitmentPostType,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations();
  const { supabase, user } = await requireUser();
  if (!user) return { error: t("errors.unauthorized") };

  const { data: existing } = await supabase
    .from("recruitment_posts")
    .select("author_id")
    .eq("id", postId)
    .single();
  if (!existing) return { error: t("recruitment.errors.postNotFound") };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isOwner = existing.author_id === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) return { error: t("recruitment.errors.editOwnPostsOnly") };

  const raw = readForm(formData, postType);
  const schema = postType === "LFT" ? lftPostSchema : lfpPostSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: await firstIssue(parsed.error) };

  const spamCheck = checkForSpamLinks(textFieldsOf(parsed.data));
  if (spamCheck.isSpam) {
    await flagAccount(supabase, user.id, `Spam link in recruitment post: ${spamCheck.matchedDomain}`);
    return { error: t("recruitment.errors.spamLinkDetected") };
  }

  const { error } = await supabase.from("recruitment_posts").update(parsed.data).eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath("/recruitment");
  return { success: true };
}

export async function setRecruitmentPostStatus(
  postId: string,
  status: RecruitmentStatus
): Promise<ActionResult> {
  const t = await getTranslations();
  const { supabase, user } = await requireUser();
  if (!user) return { error: t("errors.unauthorized") };

  const { data: existing } = await supabase
    .from("recruitment_posts")
    .select("author_id")
    .eq("id", postId)
    .single();
  if (!existing) return { error: t("recruitment.errors.postNotFound") };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isOwner = existing.author_id === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) return { error: t("recruitment.errors.manageOwnPostsOnly") };

  const { error } = await supabase.from("recruitment_posts").update({ status }).eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath("/recruitment");
  return { success: true };
}

export async function deleteRecruitmentPost(postId: string): Promise<ActionResult> {
  const t = await getTranslations();
  const { supabase, user } = await requireUser();
  if (!user) return { error: t("errors.unauthorized") };

  const { data: existing } = await supabase
    .from("recruitment_posts")
    .select("author_id")
    .eq("id", postId)
    .single();
  if (!existing) return { error: t("recruitment.errors.postNotFound") };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isOwner = existing.author_id === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) return { error: t("recruitment.errors.deleteOwnPostsOnly") };

  const { error } = await supabase.from("recruitment_posts").delete().eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath("/recruitment");
  return { success: true };
}
