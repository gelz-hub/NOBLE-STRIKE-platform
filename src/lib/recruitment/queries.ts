import { createClient } from "@/lib/supabase/server";
import type { RecruitmentPost, RecruitmentPostType, RecruitmentRole, RecruitmentStatus } from "@/lib/types/database";

export interface RecruitmentFilters {
  postType: RecruitmentPostType;
  game?: "MLBB" | "HOK";
  role?: RecruitmentRole;
  country?: string;
  status?: RecruitmentStatus;
  page?: number;
  pageSize?: number;
}

export async function getRecruitmentPosts({
  postType,
  game,
  role,
  country,
  status,
  page = 1,
  pageSize = 12,
}: RecruitmentFilters): Promise<{ rows: RecruitmentPost[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("recruitment_posts")
    .select("*", { count: "exact" })
    .eq("post_type", postType)
    .order("created_at", { ascending: false });

  if (game) query = query.eq("game", game);
  if (role) query = query.eq("role", role);
  if (country && country.trim()) query = query.ilike("country", `%${country.trim()}%`);
  if (status) query = query.eq("status", status);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await query.range(from, to);

  return { rows: (data ?? []) as RecruitmentPost[], total: count ?? 0 };
}
