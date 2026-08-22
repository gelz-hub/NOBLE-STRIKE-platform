import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Team, Match, News } from "@/lib/types/database";
import type { Locale } from "@/i18n/config";
import { pickLocalized } from "@/lib/i18n/content";

type DB = SupabaseClient;

export interface ProfileTeamEntry {
  team: Team;
  isOwner: boolean;
  isCaptain: boolean;
  isCoach: boolean;
  role: string | null;
}

export interface ProfileTeams {
  current: ProfileTeamEntry[];
  captain: ProfileTeamEntry[];
  coach: ProfileTeamEntry[];
  /** Always empty — there's no roster-removal/team-departure history table
   *  in the schema, so "past teams" can't be derived from real data yet.
   *  Kept as a distinct bucket so the UI section is ready the moment that
   *  history exists. */
  past: ProfileTeamEntry[];
}

/**
 * A profile's teams come from two places: teams they own (teams.owner_id)
 * and roster rows they've been linked to (team_members.user_id, set
 * automatically when a roster entry's player_name matches their username —
 * see dashboard/teams/actions.ts). Ownership alone can't express "I play
 * ROAM on someone else's team," so both sources are merged here.
 */
export async function getProfileTeams(supabase: DB, profileId: string): Promise<ProfileTeams> {
  const [{ data: owned }, { data: memberRows }] = await Promise.all([
    supabase.from("teams").select("*").eq("owner_id", profileId),
    supabase
      .from("team_members")
      .select("role, is_captain, is_coach, team:team_id(*)")
      .eq("user_id", profileId),
  ]);

  const byTeamId = new Map<string, ProfileTeamEntry>();

  for (const t of (owned ?? []) as Team[]) {
    byTeamId.set(t.id, { team: t, isOwner: true, isCaptain: false, isCoach: false, role: null });
  }

  for (const row of (memberRows ?? []) as unknown as {
    role: string;
    is_captain: boolean;
    is_coach: boolean;
    team: Team | null;
  }[]) {
    if (!row.team) continue;
    const existing = byTeamId.get(row.team.id);
    if (existing) {
      existing.isCaptain = existing.isCaptain || row.is_captain;
      existing.isCoach = existing.isCoach || row.is_coach;
      existing.role = row.role;
    } else {
      byTeamId.set(row.team.id, {
        team: row.team,
        isOwner: false,
        isCaptain: row.is_captain,
        isCoach: row.is_coach,
        role: row.role,
      });
    }
  }

  const all = [...byTeamId.values()];
  return {
    current: all,
    captain: all.filter((e) => e.isCaptain),
    coach: all.filter((e) => e.isCoach),
    past: [],
  };
}

export interface TournamentStats {
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  championships: number;
  runnerUps: number;
}

export interface AchievementEntry {
  tournamentId: string;
  tournamentTitle: string;
  tournamentSlug: string;
  placement: "champion" | "runner_up";
  date: string | null;
}

/** All tournament + match stats for a profile, derived from the team IDs
 *  they're associated with (see getProfileTeams). */
export async function getTournamentStats(
  supabase: DB,
  teamIds: string[],
  locale: Locale = "en"
): Promise<{ stats: TournamentStats; titles: AchievementEntry[] }> {
  const empty = { stats: { played: 0, wins: 0, losses: 0, winRate: 0, championships: 0, runnerUps: 0 }, titles: [] };
  if (teamIds.length === 0) return empty;

  const [{ data: registrations }, { data: matches }, { data: championTournaments }, { data: runnerUpTournaments }] =
    await Promise.all([
      supabase
        .from("tournament_registrations")
        .select("id", { count: "exact", head: false })
        .in("team_id", teamIds)
        .eq("status", "APPROVED"),
      supabase
        .from("matches")
        .select("winner_id, team_a_id, team_b_id")
        .eq("status", "COMPLETED")
        .or(`team_a_id.in.(${teamIds.join(",")}),team_b_id.in.(${teamIds.join(",")})`),
      supabase
        .from("tournaments")
        .select("id, name_en, name_km, slug, champion_date")
        .in("champion_team_id", teamIds),
      supabase
        .from("tournaments")
        .select("id, name_en, name_km, slug, champion_date")
        .in("runner_up_team_id", teamIds),
    ]);

  const played = registrations?.length ?? 0;

  let wins = 0;
  let losses = 0;
  for (const m of matches ?? []) {
    if (!m.winner_id) continue;
    if (teamIds.includes(m.winner_id)) wins++;
    else if (teamIds.includes(m.team_a_id) || teamIds.includes(m.team_b_id)) losses++;
  }
  const totalDecided = wins + losses;
  const winRate = totalDecided > 0 ? Math.round((wins / totalDecided) * 1000) / 10 : 0;

  const titles: AchievementEntry[] = [
    ...(championTournaments ?? []).map((t) => ({
      tournamentId: t.id,
      tournamentTitle: pickLocalized(t, "name", locale),
      tournamentSlug: t.slug,
      placement: "champion" as const,
      date: t.champion_date,
    })),
    ...(runnerUpTournaments ?? []).map((t) => ({
      tournamentId: t.id,
      tournamentTitle: pickLocalized(t, "name", locale),
      tournamentSlug: t.slug,
      placement: "runner_up" as const,
      date: t.champion_date,
    })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return {
    stats: {
      played,
      wins,
      losses,
      winRate,
      championships: championTournaments?.length ?? 0,
      runnerUps: runnerUpTournaments?.length ?? 0,
    },
    titles,
  };
}

export interface RecentMatchEntry {
  id: string;
  tournamentTitle: string;
  tournamentId: string;
  opponentName: string | null;
  teamName: string;
  won: boolean | null;
  scoreFor: number;
  scoreAgainst: number;
  status: Match["status"];
  scheduledAt: string | null;
}

export async function getRecentMatches(
  supabase: DB,
  teamIds: string[],
  limit = 5,
  locale: Locale = "en"
): Promise<RecentMatchEntry[]> {
  if (teamIds.length === 0) return [];

  const { data } = await supabase
    .from("matches")
    .select(
      "id, status, score_a, score_b, winner_id, team_a_id, team_b_id, scheduled_at, updated_at, team_a:team_a_id(team_name), team_b:team_b_id(team_name), tournament:tournament_id(id, name_en, name_km)"
    )
    .or(`team_a_id.in.(${teamIds.join(",")}),team_b_id.in.(${teamIds.join(",")})`)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as unknown as {
    id: string;
    status: Match["status"];
    score_a: number;
    score_b: number;
    winner_id: string | null;
    team_a_id: string | null;
    team_b_id: string | null;
    scheduled_at: string | null;
    team_a: { team_name: string } | null;
    team_b: { team_name: string } | null;
    tournament: { id: string; name_en: string; name_km: string | null } | null;
  }[]).map((m) => {
    const isTeamA = m.team_a_id ? teamIds.includes(m.team_a_id) : false;
    const teamName = (isTeamA ? m.team_a?.team_name : m.team_b?.team_name) ?? "Your team";
    const opponentName = (isTeamA ? m.team_b?.team_name : m.team_a?.team_name) ?? null;
    const scoreFor = isTeamA ? m.score_a : m.score_b;
    const scoreAgainst = isTeamA ? m.score_b : m.score_a;
    const won = m.winner_id ? teamIds.includes(m.winner_id) : null;
    return {
      id: m.id,
      tournamentTitle: m.tournament ? pickLocalized(m.tournament, "name", locale) : "Tournament",
      tournamentId: m.tournament?.id ?? "",
      opponentName,
      teamName,
      won,
      scoreFor,
      scoreAgainst,
      status: m.status,
      scheduledAt: m.scheduled_at,
    };
  });
}

export async function getAuthoredNews(supabase: DB, authorId: string, limit = 6): Promise<News[]> {
  const { data } = await supabase
    .from("news")
    .select("*")
    .eq("author_id", authorId)
    .eq("status", "PUBLISHED")
    .order("publish_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as News[];
}

export async function getProfileByUsername(supabase: DB, username: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .maybeSingle();
  return (data as Profile) ?? null;
}
