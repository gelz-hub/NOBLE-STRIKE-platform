import { createClient } from "@/lib/supabase/server";
import type { News, NewsCategory, NewsStatus } from "@/lib/types/database";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export interface NewsWithAuthor extends News {
  author: { id: string; username: string | null } | null;
  tournament: { id: string; title: string } | null;
}

const NEWS_SELECT = "*, author:author_id(id, username), tournament:tournament_id(id, title)";

export interface PublicNewsFilters {
  category?: NewsCategory;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getPublishedNews({
  category,
  search,
  page = 1,
  pageSize = 12,
}: PublicNewsFilters): Promise<{ rows: NewsWithAuthor[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("news")
    .select(NEWS_SELECT, { count: "exact" })
    .eq("status", "PUBLISHED")
    .lte("publish_at", new Date().toISOString())
    .order("pinned", { ascending: false })
    .order("publish_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (search && search.trim()) query = query.ilike("title", `%${search.trim()}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await query.range(from, to);

  return { rows: (data ?? []) as unknown as NewsWithAuthor[], total: count ?? 0 };
}

export async function getNewsBySlug(slug: string): Promise<NewsWithAuthor | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("news").select(NEWS_SELECT).eq("slug", slug).single();
  return (data as unknown as NewsWithAuthor) ?? null;
}

export async function incrementNewsView(articleId: string): Promise<void> {
  // Anonymous-callable by design (see 0012_news_cms.sql) — the most exposed
  // single write in the app, so it's rate-limited per IP.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit("news-view", ip);
  if (!allowed) return;

  const supabase = await createClient();
  await supabase.rpc("increment_news_view", { article_id: articleId });
}

export async function getRelatedArticles(articleId: string, category: NewsCategory, limit = 3): Promise<NewsWithAuthor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(NEWS_SELECT)
    .eq("status", "PUBLISHED")
    .eq("category", category)
    .neq("id", articleId)
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as NewsWithAuthor[];
}

export async function getFeaturedArticle(): Promise<NewsWithAuthor | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(NEWS_SELECT)
    .eq("status", "PUBLISHED")
    .eq("featured", true)
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as NewsWithAuthor) ?? null;
}

export async function getPinnedAnnouncements(limit = 5): Promise<NewsWithAuthor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(NEWS_SELECT)
    .eq("status", "PUBLISHED")
    .eq("pinned", true)
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as NewsWithAuthor[];
}

export async function getLatestArticles(limit = 6, excludeId?: string): Promise<NewsWithAuthor[]> {
  const supabase = await createClient();
  let query = supabase
    .from("news")
    .select(NEWS_SELECT)
    .eq("status", "PUBLISHED")
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false })
    .limit(limit);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return (data ?? []) as unknown as NewsWithAuthor[];
}

export async function getTournamentNews(tournamentId: string, limit = 5): Promise<NewsWithAuthor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(NEWS_SELECT)
    .eq("status", "PUBLISHED")
    .eq("tournament_id", tournamentId)
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as NewsWithAuthor[];
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminNewsFilters {
  status?: NewsStatus;
  category?: NewsCategory;
  pinned?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminNews({
  status,
  category,
  pinned,
  search,
  page = 1,
  pageSize = 20,
}: AdminNewsFilters): Promise<{ rows: NewsWithAuthor[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("news")
    .select(NEWS_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (pinned !== undefined) query = query.eq("pinned", pinned);
  if (search && search.trim()) query = query.ilike("title", `%${search.trim()}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await query.range(from, to);

  return { rows: (data ?? []) as unknown as NewsWithAuthor[], total: count ?? 0 };
}

export interface NewsStats {
  draftCount: number;
  publishedCount: number;
  archivedCount: number;
  mostViewed: { id: string; title: string; slug: string; view_count: number }[];
}

export async function getNewsStats(): Promise<NewsStats> {
  const supabase = await createClient();
  const [{ count: draftCount }, { count: publishedCount }, { count: archivedCount }, { data: mostViewed }] =
    await Promise.all([
      supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "DRAFT"),
      supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
      supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "ARCHIVED"),
      supabase.from("news").select("id, title, slug, view_count").order("view_count", { ascending: false }).limit(5),
    ]);

  return {
    draftCount: draftCount ?? 0,
    publishedCount: publishedCount ?? 0,
    archivedCount: archivedCount ?? 0,
    mostViewed: mostViewed ?? [],
  };
}
