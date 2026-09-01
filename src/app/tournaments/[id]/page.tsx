import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { pickLocalized } from "@/lib/i18n/content";
import { TeamMonogram, SlotsBar } from "@/components/ns/ui";
import { RegisterTeamModal } from "@/components/tournaments/register-team-modal";
import { TournamentStatsCards } from "@/components/admin/tournament-stats-cards";
import { getTournamentStats } from "@/lib/tournament-stats";
import { getBracket, getBracketMatches } from "@/lib/bracket/queries";
import { summarizeBracket } from "@/lib/bracket/summary";
import {
  filterRoundsForFeaturedStage,
  featuredBracketStats,
  mainEventTitle,
  featuredStageLabel,
} from "@/lib/bracket/featured";
import { PublicBracket } from "@/components/bracket/public-bracket";
import { getTournamentMatchSummary } from "@/lib/matches/queries";
import { MatchSummaryList } from "@/components/matches/match-summary-list";
import { getTournamentNews } from "@/lib/news/queries";
import { NewsCard } from "@/components/news/news-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TelegramButtons } from "@/components/telegram/telegram-buttons";
import {
  Calendar,
  Crown,
  Trophy,
  Users,
  Clock,
  Network,
} from "lucide-react";
import { PageNav } from "@/components/ns/page-nav";
import type { Locale } from "@/i18n/config";

interface Props {
  params: Promise<{ id: string }>;
}

interface ApprovedTeamRow {
  id: string;
  created_at: string;
  teams: {
    id: string;
    team_name: string;
    logo_url: string | null;
  } | null;
}

const REGISTRATION_STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "ns-pill-pending" },
  REGISTRATION_OPEN: { label: "Registration Open", className: "ns-pill-open" },
  REGISTRATION_CLOSED: { label: "Registration Closed", className: "ns-pill-closed" },
  ONGOING: { label: "Live Now", className: "ns-pill-ongoing" },
  COMPLETED: { label: "Completed", className: "ns-pill-completed" },
  ARCHIVED: { label: "Archived", className: "ns-pill-closed" },
};

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("tournaments.detail");

  const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", id).single();
  if (!tournament) notFound();
  const tournamentName = pickLocalized(tournament, "name", locale);
  const tournamentDescription = pickLocalized(tournament, "description", locale);

  const { data: approvedData } = await supabase
    .from("tournament_registrations")
    .select("id, created_at, teams(id, team_name, logo_url)")
    .eq("tournament_id", id)
    .eq("status", "APPROVED")
    .order("created_at", { ascending: true });
  const approvedTeams = (approvedData ?? []) as unknown as ApprovedTeamRow[];

  // Enrich with captain + player count for each approved team.
  const teamIds = approvedTeams.map((r) => r.teams?.id).filter(Boolean) as string[];
  const membersByTeam = new Map<string, { player_name: string; is_captain: boolean }[]>();
  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select("team_id, player_name, is_captain")
      .in("team_id", teamIds);
    for (const m of members ?? []) {
      const list = membersByTeam.get(m.team_id) ?? [];
      list.push({ player_name: m.player_name, is_captain: m.is_captain });
      membersByTeam.set(m.team_id, list);
    }
  }

  const stats = await getTournamentStats(id, tournament.max_teams);
  const matchSummary = await getTournamentMatchSummary(id);
  const relatedNews = await getTournamentNews(id);
  const bracket = await getBracket(id);
  const bracketRounds = bracket ? await getBracketMatches(id) : [];
  const bracketSummary = bracket ? summarizeBracket(bracketRounds, tournament.bracket_format) : null;

  // Public bracket view: hide qualifier rounds before the featured stage.
  // Admin pages (see /admin/tournaments/[id]/bracket) always show everything.
  const featuredStage = tournament.featured_bracket_stage ?? "FULL";
  const publicRounds = filterRoundsForFeaturedStage(
    bracketRounds,
    featuredStage,
    tournament.bracket_format
  );
  const eventTitle = mainEventTitle(featuredStage);
  const featuredStats = featuredBracketStats({
    stage: featuredStage,
    registeredTeams: stats.approved,
    // Before any real elimination (or before the bracket exists) everyone is
    // still "remaining"; summarizeBracket only counts non-bye eliminations.
    liveRemainingTeams: bracketSummary?.remainingTeams ?? stats.approved,
  });
  const qualifierNote =
    featuredStage !== "FULL" && publicRounds.length < bracketRounds.length
      ? t("qualifierRoundsHidden", { stage: featuredStageLabel(featuredStage) })
      : null;

  const deadlinePassed = new Date(tournament.registration_deadline).getTime() < Date.now();
  const slotsFull = stats.availableSlots <= 0;
  const isOpen = tournament.status === "REGISTRATION_OPEN" && !deadlinePassed && !slotsFull;
  const statusMeta =
    REGISTRATION_STATUS_META[tournament.status] ?? REGISTRATION_STATUS_META.REGISTRATION_CLOSED;

  return (
    <div className="min-h-screen bg-background">
      <PageNav />
      <div className="relative h-56 md:h-80 w-full overflow-hidden">
        {tournament.banner_url ? (
          <Image
            src={tournament.banner_url}
            alt={`${tournamentName} banner`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black ns-grid-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        <div className="absolute bottom-6 left-4 md:left-6 right-4 md:right-6">
          <span className={`ns-pill ${statusMeta.className} mb-3 inline-flex`}>
            {statusMeta.label}
          </span>
          <h1 className="font-display font-extrabold text-2xl md:text-4xl text-white" lang={locale}>
            {tournamentName}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 space-y-10">
        {tournamentDescription && (
          <p className="text-white/70 max-w-2xl leading-relaxed" lang={locale}>
            {tournamentDescription}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoCard icon={Trophy} label={t("prizePool")} value={`$${tournament.prize_pool}`} />
          <InfoCard icon={Users} label={t("maxTeams")} value={String(tournament.max_teams)} />
          <InfoCard
            icon={Clock}
            label={t("regDeadline")}
            value={new Date(tournament.registration_deadline).toLocaleDateString()}
          />
          <InfoCard
            icon={Calendar}
            label={t("startDate")}
            value={new Date(tournament.start_date).toLocaleDateString()}
          />
        </div>

        <div className="ns-card ns-card-gold-edge rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/90 font-medium">
                {isOpen ? t("registrationOpen") : t("registrationClosed")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isOpen
                  ? t("registerBeforeDeadline")
                  : slotsFull
                  ? t("slotsFull")
                  : deadlinePassed
                  ? t("deadlinePassed")
                  : t("noLongerAccepting")}
              </p>
            </div>
            {isOpen ? (
              <RegisterTeamModal
                tournamentId={tournament.id}
                trigger={
                  <Button className="ns-btn-gold h-11 px-6 text-xs uppercase tracking-wider">
                    <Trophy className="w-4 h-4" />
                    {t("registerTeam")}
                  </Button>
                }
              />
            ) : (
              <Button disabled className="h-11 px-6 text-xs uppercase tracking-wider opacity-50">
                {t("registrationClosedButton")}
              </Button>
            )}
          </div>
          <SlotsBar registered={stats.approved} limit={tournament.max_teams} />
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="bg-black/40 border border-gold/15">
            <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
            <TabsTrigger value="bracket">{t("tabBracket")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-10 pt-6">
            <section className="space-y-4">
              <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-white">
                {t("tournamentStatistics")}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoCard
                  icon={Users}
                  label={t("registeredTeams")}
                  value={String(featuredStats.registeredTeams)}
                />
                <InfoCard
                  icon={Trophy}
                  label={t("qualifiedTeams")}
                  value={String(featuredStats.qualifiedTeams)}
                />
                <InfoCard
                  icon={Clock}
                  label={t("eliminatedTeams")}
                  value={String(featuredStats.eliminatedTeams)}
                />
                <InfoCard
                  icon={Crown}
                  label={t("remainingTeams")}
                  value={String(featuredStats.remainingTeams)}
                />
              </div>
              <TournamentStatsCards stats={stats} />
            </section>

            {(matchSummary.live.length > 0 ||
              matchSummary.upcoming.length > 0 ||
              matchSummary.recentResults.length > 0) && (
              <section className="space-y-6">
                <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-white">
                  {t("matches")}
                </h2>
                <MatchSummaryList title={t("liveNow")} matches={matchSummary.live} live />
                <MatchSummaryList title={t("upcomingMatches")} matches={matchSummary.upcoming} />
                <MatchSummaryList title={t("recentResults")} matches={matchSummary.recentResults} />
              </section>
            )}

            {relatedNews.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-white">
                  {t("relatedNews")}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedNews.map((a) => (
                    <NewsCard key={a.id} article={a} />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-white">
                {t("approvedTeams", { count: approvedTeams.length })}
              </h2>
              {approvedTeams.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noTeamsApproved")}</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {approvedTeams.map((r) => {
                    if (!r.teams) return null;
                    const members = membersByTeam.get(r.teams.id) ?? [];
                    const captain = members.find((m) => m.is_captain);
                    return (
                      <Link
                        key={r.id}
                        href={`/teams/${r.teams.id}`}
                        className="ns-card rounded-xl p-4 flex items-center gap-3 hover:border-gold/40 transition-colors"
                      >
                        <TeamMonogram name={r.teams.team_name} logo={r.teams.logo_url} size={44} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {r.teams.team_name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {members.length}
                            </span>
                            {captain && (
                              <span className="flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                {captain.player_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="bracket" className="space-y-6 pt-6">
            {tournament.champion_team_name && (
              <div className="ns-card ns-card-gold-edge rounded-xl p-6 flex items-center gap-4">
                <Crown className="w-10 h-10 text-gold shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-gold-light">{t("champion")}</p>
                  <p className="font-display font-extrabold text-2xl text-white">
                    {tournament.champion_team_name}
                  </p>
                  {tournament.champion_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("crowned", { date: new Date(tournament.champion_date).toLocaleDateString() })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {!bracket || !bracketSummary ? (
              <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
                <Network className="w-8 h-8 text-gold/50" />
                <p className="text-white/70">{t("bracketNotGenerated")}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <InfoCard
                    icon={Network}
                    label={t("currentRound")}
                    value={`${bracketSummary.currentRound} / ${bracketSummary.totalRounds}`}
                  />
                  <InfoCard icon={Users} label={t("remainingTeams")} value={String(bracketSummary.remainingTeams)} />
                  <InfoCard
                    icon={Trophy}
                    label={t("champion")}
                    value={tournament.champion_team_name ?? t("tbd")}
                  />
                </div>
                {tournament.bracket_format === "DOUBLE_ELIMINATION" && (
                  <div className="grid grid-cols-3 gap-3">
                    <InfoCard icon={Users} label={t("upperBracket")} value={String(bracketSummary.upperTeams ?? 0)} />
                    <InfoCard icon={Users} label={t("lowerBracket")} value={String(bracketSummary.lowerTeams ?? 0)} />
                    <InfoCard icon={Users} label={t("eliminated")} value={String(bracketSummary.eliminatedTeams ?? 0)} />
                  </div>
                )}
                {publicRounds.length === 0 ? (
                  <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
                    <Network className="w-8 h-8 text-gold/50" />
                    <p className="text-white/70">{t("bracketNotGenerated")}</p>
                  </div>
                ) : (
                  <PublicBracket
                    rounds={publicRounds}
                    bracketFormat={tournament.bracket_format}
                    mainEventTitle={eventTitle}
                    hiddenNote={qualifierNote}
                  />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-10 pt-8 border-t border-gold/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{t("telegramCta")}</p>
          <TelegramButtons />
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="ns-card rounded-xl p-4 text-center">
      <Icon className="w-4 h-4 text-gold mx-auto mb-2" />
      <div className="font-display font-bold text-white">{value}</div>
      <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}
