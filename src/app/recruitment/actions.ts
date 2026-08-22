"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { lftPostSchema, lfpPostSchema } from "@/lib/validation/recruitment";
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

export async function createRecruitmentPost(
  postType: RecruitmentPostType,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations();
  const { supabase, user } = await requireUser();
  if (!user) return { error: t("recruitment.errors.signInToPost") };

  const raw = readForm(formData, postType);
  const schema = postType === "LFT" ? lftPostSchema : lfpPostSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: await firstIssue(parsed.error) };

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
