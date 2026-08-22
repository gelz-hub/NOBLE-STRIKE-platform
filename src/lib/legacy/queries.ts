import { createClient } from "@/lib/supabase/server";
import type { LegacyEvent } from "@/lib/types/database";

export interface LegacyYearGroup {
  year: number;
  events: LegacyEvent[];
}

/** Published events grouped by year, newest year first, honoring each row's display_order within a year. */
export async function getPublishedLegacyEvents(): Promise<LegacyYearGroup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("legacy_events")
    .select("*")
    .eq("is_published", true)
    .order("year", { ascending: false })
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as LegacyEvent[];
  const byYear = new Map<number, LegacyEvent[]>();
  for (const row of rows) {
    if (!byYear.has(row.year)) byYear.set(row.year, []);
    byYear.get(row.year)!.push(row);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, events]) => ({ year, events }));
}

export interface LegacyStats {
  foundedYear: number;
  largestTournamentTeams: number | null;
  highestPrizePool: number | null;
  eventsOrganized: number;
  communityEventsHosted: number;
}

const FOUNDED_YEAR = 2023;

/** Overview stat cards — all counts/maxes are computed live so new events need no code changes. */
export async function getLegacyStats(): Promise<LegacyStats> {
  const supabase = await createClient();
  const [{ data: rows }, { count: eventsOrganized }, { count: communityEventsHosted }] = await Promise.all([
    supabase.from("legacy_events").select("teams_max, prize_pool_max").eq("is_published", true),
    supabase
      .from("legacy_events")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("category", "TOURNAMENT"),
    supabase
      .from("legacy_events")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("category", "COMMUNITY"),
  ]);

  const teamsValues = (rows ?? []).map((r) => r.teams_max).filter((v): v is number => v != null);
  const prizeValues = (rows ?? []).map((r) => r.prize_pool_max).filter((v): v is number => v != null);

  return {
    foundedYear: FOUNDED_YEAR,
    largestTournamentTeams: teamsValues.length ? Math.max(...teamsValues) : null,
    highestPrizePool: prizeValues.length ? Math.max(...prizeValues) : null,
    eventsOrganized: eventsOrganized ?? 0,
    communityEventsHosted: communityEventsHosted ?? 0,
  };
}

export async function getLegacyEventById(id: string): Promise<LegacyEvent | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("legacy_events").select("*").eq("id", id).maybeSingle();
  return (data as LegacyEvent) ?? null;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminLegacyFilters {
  year?: number;
  category?: string;
  search?: string;
}

export async function getAdminLegacyEvents({ year, category, search }: AdminLegacyFilters = {}): Promise<
  LegacyEvent[]
> {
  const supabase = await createClient();
  let query = supabase
    .from("legacy_events")
    .select("*")
    .order("year", { ascending: false })
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });

  if (year) query = query.eq("year", year);
  if (category) query = query.eq("category", category);
  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`title_en.ilike.%${term}%,title_km.ilike.%${term}%`);
  }

  const { data } = await query;
  return (data ?? []) as LegacyEvent[];
}
