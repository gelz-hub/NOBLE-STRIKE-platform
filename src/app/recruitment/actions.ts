"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lftPostSchema, lfpPostSchema } from "@/lib/validation/recruitment";
import type { RecruitmentPostType, RecruitmentStatus } from "@/lib/types/database";

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
      country: String(formData.get("country") || ""),
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
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in to post." };

  const raw = readForm(formData, postType);
  const schema = postType === "LFT" ? lftPostSchema : lfpPostSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

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
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const { data: existing } = await supabase
    .from("recruitment_posts")
    .select("author_id")
    .eq("id", postId)
    .single();
  if (!existing) return { error: "Post not found." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isOwner = existing.author_id === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) return { error: "You can only edit your own posts." };

  const raw = readForm(formData, postType);
  const schema = postType === "LFT" ? lftPostSchema : lfpPostSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { error } = await supabase.from("recruitment_posts").update(parsed.data).eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath("/recruitment");
  return { success: true };
}

export async function setRecruitmentPostStatus(
  postId: string,
  status: RecruitmentStatus
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const { data: existing } = await supabase
    .from("recruitment_posts")
    .select("author_id")
    .eq("id", postId)
    .single();
  if (!existing) return { error: "Post not found." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isOwner = existing.author_id === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) return { error: "You can only manage your own posts." };

  const { error } = await supabase.from("recruitment_posts").update({ status }).eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath("/recruitment");
  return { success: true };
}

export async function deleteRecruitmentPost(postId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const { data: existing } = await supabase
    .from("recruitment_posts")
    .select("author_id")
    .eq("id", postId)
    .single();
  if (!existing) return { error: "Post not found." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isOwner = existing.author_id === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) return { error: "You can only delete your own posts." };

  const { error } = await supabase.from("recruitment_posts").delete().eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath("/recruitment");
  return { success: true };
}
