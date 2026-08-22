"use client";

import { useTranslations } from "next-intl";
import { useApp } from "@/lib/store";
import { useFetch } from "../hooks";
import { NSLogo } from "../logo";
import {
  SectionHeading,
  StatusPill,
  GameBadge,
  PrizeTag,
  TeamMonogram,
  NSCardSkeleton,
  Reveal,
  GoldParticles,
  SlotsBar,
} from "../ui";
import { AnimatedCounter } from "../scroll-reveal";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Users,
  Swords,
  Calendar,
  ArrowRight,
  Zap,
  Crown,
  Shield,
  Newspaper,
  ChevronRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TelegramButtons } from "@/components/telegram/telegram-buttons";
import type {
  Tournament,
  Team,
  Announcement,
  Stats,
  Sponsor,
  Registration,
} from "@/lib/types";

export function HomeView() {
  const t = useTranslations("home");
  const setView = useApp((s) => s.setView);
  const openTournament = useApp((s) => s.openTournament);
  const openTeam = useApp((s) => s.openTeam);
  const openNews = useApp((s) => s.openNews);

  const { data: stats } = useFetch<Stats>("/api/stats");
  const { data: tournaments, loading: tLoading } = useFetch<Tournament[]>(
    "/api/tournaments"
  );
  const { data: teams, loading: tmLoading } = useFetch<Team[]>("/api/teams");
  const { data: news } = useFetch<Announcement[]>("/api/news?featured=false");
  const { data: sponsors } = useFetch<{ sponsors?: Sponsor[] } | null>("/api/ns");

  const featuredT = (tournaments || [])
    .slice()
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 3);
  const featuredTeams = (teams || []).slice(0, 6);
  const latestNews = (news || []).slice(0, 3);
  const sponsorList = sponsors?.sponsors || [];

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-20">
        {/* background layers */}
        <div className="absolute inset-0 ns-grid-bg opacity-60" />
        <div className="absolute inset-0 ns-radial-gold" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />

        {/* rotating decorative rings */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="ns-rotate-slow w-[560px] h-[560px] md:w-[760px] md:h-[760px] rounded-full border border-gold/10" />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="ns-rotate-slow w-[380px] h-[380px] md:w-[520px] md:h-[520px] rounded-full border border-gold/15"
            style={{ animationDirection: "reverse", animationDuration: "60s" }}
          />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="ns-rotate-slow w-[260px] h-[260px] md:w-[360px] md:h-[360px] rounded-full border border-gold/20"
            style={{ animationDuration: "30s" }}
          />
        </div>

        {/* floating gold particles */}
        <GoldParticles count={16} />

        {/* corner flourishes */}
        <div className="absolute top-28 left-6 hidden md:flex flex-col gap-2 text-gold/40" lang="en">
          <span className="font-mono text-[0.65rem] tracking-widest">EST. 2023</span>
          <span className="h-px w-16 bg-gold/30" />
        </div>
        <div className="absolute top-28 right-6 hidden md:flex flex-col gap-2 items-end text-gold/40" lang="en">
          <span className="font-mono text-[0.65rem] tracking-widest">5V5 MOBA · ELITE</span>
          <span className="h-px w-16 bg-gold/30" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl lg:max-w-4xl px-4 text-center flex flex-col items-center">
          {/* Logo with pulsing glow */}
          <div className="relative mb-7 md:mb-8 ns-fade-up">
            <div className="absolute inset-0 blur-3xl bg-gold/20 rounded-full animate-pulse" />
            <img
              src="/noble-strike-logo.png"
              alt="NOBLE STRIKE"
              width={112}
              height={112}
              className="relative ns-logo-glow rounded-2xl object-cover md:w-30 md:h-30"
              style={{ width: 112, height: 112 }}
            />
          </div>

          {/* kicker — brand phrase, always English (see locales/*.json comment) */}
          <div className="flex items-center gap-3 mb-5 md:mb-6 ns-fade-up" style={{ animationDelay: "0.1s" }}>
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/60" />
            <span className="ns-kicker" lang="en">
              {t("hero.kicker")}
            </span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/60" />
          </div>

          {/* Headline with light sweep — brand wordmark, always English */}
          <h1
            className="ns-title-sweep font-display font-black text-5xl sm:text-6xl md:text-7xl tracking-[0.06em] md:tracking-[0.07em] ns-fade-up"
            style={{ animationDelay: "0.15s" }}
            lang="en"
          >
            NOBLE STRIKE
          </h1>

          {/* Subheadline — brand tagline, always English */}
          <p
            className="mt-5 md:mt-6 font-heading text-xl md:text-2xl font-light tracking-wide text-white/90 ns-fade-up"
            style={{ animationDelay: "0.25s" }}
            lang="en"
          >
            {t("hero.subheadlinePrefix")}{" "}
            <span className="text-gold-gradient font-semibold">{t("hero.subheadlineHighlight")}</span>
          </p>

          {/* Supporting copy — localized */}
          <p
            className="mt-5 max-w-xl md:max-w-2xl text-base md:text-lg text-white/70 leading-relaxed ns-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            {t("hero.description")}
          </p>

          {/* CTAs */}
          <div
            className="mt-9 md:mt-10 flex flex-col sm:flex-row items-center gap-4 ns-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            <Button
              onClick={() => setView("tournaments")}
              className="ns-btn-gold h-12 px-8 text-sm uppercase tracking-widest group"
            >
              <Trophy className="w-4 h-4" />
              {t("hero.joinTournament")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              onClick={() => setView("teams")}
              className="ns-btn-outline h-12 px-8 text-sm uppercase tracking-widest"
            >
              <Users className="w-4 h-4" />
              {t("hero.viewTeams")}
            </Button>
          </div>

          {/* scroll hint */}
          <div className="mt-16 flex flex-col items-center gap-2 text-gold/50">
            <span className="font-mono text-[0.6rem] tracking-[0.3em] uppercase">
              {t("hero.scroll")}
            </span>
            <div className="w-px h-10 bg-gradient-to-b from-gold/60 to-transparent" />
          </div>
        </div>
      </section>

      {/* ============ STATS BAR (animated counters) ============ */}
      <section className="relative border-y border-gold/15 bg-gradient-to-b from-[#0a0a0a] to-black">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <Reveal>
              <StatCard
                icon={Users}
                value={stats ? stats.teams : 0}
                displayValue={128}
                suffix="+"
                label={t("stats.registeredTeams")}
                delay={0}
              />
            </Reveal>
            <Reveal delay={120}>
              <StatCard
                icon={Zap}
                value={stats ? stats.players : 0}
                displayValue={640}
                suffix="+"
                label={t("stats.players")}
                delay={0.1}
              />
            </Reveal>
            <Reveal delay={240}>
              <StatCard
                icon={Trophy}
                value={stats ? stats.tournaments : 0}
                displayValue={12}
                suffix="+"
                label={t("stats.activeTournaments")}
                delay={0.2}
              />
            </Reveal>
            <Reveal delay={360}>
              <StatCard
                icon={Swords}
                value={stats ? stats.prizePool : 0}
                displayValue={130000}
                prefix="$"
                suffix="+"
                label={t("stats.prizePoolAwarded")}
                delay={0.3}
                format="k"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ UPCOMING TOURNAMENTS ============ */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <SectionHeading
                kicker={t("tournaments.kicker")}
                title={t("tournaments.title")}
                description={t("tournaments.description")}
              />
              <Button
                onClick={() => setView("tournaments")}
                variant="ghost"
                className="text-gold-light hover:text-gold-light hover:bg-gold/10 self-start md:self-auto"
              >
                {t("tournaments.viewAll")}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tLoading ? (
              <>
                <NSCardSkeleton />
                <NSCardSkeleton />
                <NSCardSkeleton />
              </>
            ) : (
              featuredT.map((t, i) => (
                <Reveal key={t.id} delay={i * 100}>
                  <TournamentCard
                    tournament={t}
                    onClick={() => openTournament(t.id)}
                  />
                </Reveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ============ FEATURED TEAMS ============ */}
      <section className="relative py-20 md:py-28 border-t border-gold/10 bg-gradient-to-b from-black to-[#0a0a0a]">
        <div className="absolute inset-0 ns-grid-bg opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <SectionHeading
                kicker={t("teams.kicker")}
                title={t("teams.title")}
                description={t("teams.description")}
              />
              <Button
                onClick={() => setView("teams")}
                variant="ghost"
                className="text-gold-light hover:text-gold-light hover:bg-gold/10 self-start md:self-auto"
              >
                {t("teams.viewAll")}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tmLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <NSCardSkeleton key={i} className="h-32" />
              ))
            ) : (
              featuredTeams.map((team, i) => (
                <Reveal key={team.id} delay={i * 60}>
                  <TeamCard
                    team={team}
                    onClick={() => openTeam(team.id)}
                  />
                </Reveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ============ LATEST NEWS ============ */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <SectionHeading
                kicker={t("news.kicker")}
                title={t("news.title")}
                description={t("news.description")}
              />
              <Button
                onClick={() => setView("news")}
                variant="ghost"
                className="text-gold-light hover:text-gold-light hover:bg-gold/10 self-start md:self-auto"
              >
                {t("news.viewAll")}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {latestNews.map((n, i) => (
              <Reveal key={n.id} delay={i * 100}>
                <NewsCard news={n} onClick={() => openNews(n.id)} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SPONSORS ============ */}
      {sponsorList.length > 0 && (
        <section className="relative py-16 border-y border-gold/10 bg-black overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 md:px-6 mb-8">
            <p className="ns-kicker text-center">{t("sponsors.poweredBy")}</p>
          </div>
          <div className="relative">
            <div className="flex ns-marquee gap-12 w-max">
              {[...sponsorList, ...sponsorList, ...sponsorList].map((s, i) => (
                <div
                  key={`${s.id}-${i}`}
                  className="flex items-center gap-3 px-8 py-4 shrink-0"
                >
                  <div className="w-10 h-10 rounded-md border border-gold/30 bg-gradient-to-br from-[#1a1a1a] to-black flex items-center justify-center">
                    <Crown className="w-5 h-5 text-gold/70" />
                  </div>
                  <span className="font-display font-bold text-lg tracking-wider text-white/70">
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none" />
          </div>
        </section>
      )}

      {/* ============ CTA ============ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 ns-radial-gold" />
        <div className="absolute inset-0 ns-grid-bg opacity-30" />
        <GoldParticles count={10} />
        <div className="relative mx-auto max-w-4xl px-4 text-center flex flex-col items-center">
          <div className="mb-8 ns-logo-glow">
            <NSLogo size={72} className="justify-center" />
          </div>
          <h2 className="font-display font-black text-3xl md:text-5xl lg:text-6xl tracking-tight" lang="en">
            {t("cta.headlinePrefix")}{" "}
            <span className="text-gold-gradient">{t("cta.headlineHighlight")}</span>
          </h2>
          <p className="mt-6 max-w-xl text-muted-foreground text-base md:text-lg">{t("cta.description")}</p>
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Button
              onClick={() => setView("teams")}
              className="ns-btn-gold h-12 px-8 text-sm uppercase tracking-widest"
            >
              <Swords className="w-4 h-4" />
              {t("cta.registerTeam")}
            </Button>
            <Button
              onClick={() => setView("ns-team")}
              className="ns-btn-outline h-12 px-8 text-sm uppercase tracking-widest"
            >
              <Shield className="w-4 h-4" />
              {t("cta.meetSquad")}
            </Button>
          </div>
          <TelegramButtons className="mt-8 justify-center" />
        </div>
      </section>
    </div>
  );
}

/* ---------- sub components ---------- */

function StatCard({
  icon: Icon,
  value,
  displayValue,
  prefix = "",
  suffix = "",
  label,
  delay,
  format,
}: {
  icon: React.ElementType;
  value: number;
  displayValue: number;
  prefix?: string;
  suffix?: string;
  label: string;
  delay: number;
  format?: "k";
}) {
  // Use the larger "display" value for the animated counter to feel impressive,
  // but fall back to the real value if display isn't set.
  const target = Math.max(value, displayValue);
  const fmtPrefix = format === "k" && target >= 1000 ? "$" : prefix;
  const fmtSuffix = format === "k" && target >= 1000 ? "K+" : suffix;
  const counterValue = format === "k" && target >= 1000 ? Math.round(target / 1000) : target;

  return (
    <div className="relative ns-card ns-card-gold-edge rounded-xl p-5 md:p-6 text-center">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-gold/10 border border-gold/30 mb-3">
        <Icon className="w-5 h-5 text-gold" />
      </div>
      <div className="font-display font-black text-3xl md:text-4xl text-gold-gradient">
        <AnimatedCounter value={counterValue} prefix={fmtPrefix} suffix={fmtSuffix} />
      </div>
      <div className="mt-1 text-[0.7rem] md:text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export function TournamentCard({
  tournament,
  onClick,
}: {
  tournament: Tournament;
  onClick?: () => void;
}) {
  const t = useTranslations("home.tournamentCard");
  const regCount = tournament._count?.registrations ?? tournament._count?.teams ?? 0;
  const startDate = new Date(tournament.startDate);
  const deadline = new Date(tournament.registrationDeadline);
  const regOpen = tournament.status === "REGISTRATION_OPEN";
  return (
    <button
      onClick={onClick}
      className="group text-left ns-card ns-card-gold-edge rounded-xl overflow-hidden w-full ns-lift"
    >
      {/* banner */}
      <div className="relative h-40 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black overflow-hidden">
        <div className="absolute inset-0 ns-grid-bg opacity-40" />
        <div className="absolute inset-0 ns-radial-gold opacity-60" />
        {tournament.bannerImage ? (
          <img
            src={tournament.bannerImage}
            alt={tournament.name}
            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="w-20 h-20 text-gold/15 group-hover:text-gold/30 transition-colors" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <GameBadge game={tournament.game} />
        </div>
        <div className="absolute top-3 right-3">
          <StatusPill status={tournament.status} />
        </div>
        <div className="absolute bottom-3 left-3">
          <PrizeTag prize={tournament.prizePool} />
        </div>
      </div>

      {/* body */}
      <div className="p-5">
        <h3 className="font-display font-bold text-lg text-white group-hover:text-gold-light transition-colors line-clamp-1">
          {tournament.name}
        </h3>

        {/* capacity */}
        <div className="mt-4">
          <SlotsBar registered={regCount} limit={tournament.teamLimit} />
        </div>

        {/* deadline + format */}
        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {regOpen
              ? t("ends", { date: deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" }) })
              : t("starts", { date: startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) })}
          </span>
          <span className="text-xs font-heading uppercase tracking-wider text-gold/70">
            {tournament.format}
          </span>
        </div>
      </div>
    </button>
  );
}

export function TeamCard({
  team,
  onClick,
}: {
  team: Team;
  onClick?: () => void;
}) {
  const t = useTranslations("home.teamCard");
  // Tournament-centric: show registrations instead of game label
  const regs: Registration[] = team.registrations || [];
  const approvedRegs = regs.filter((r) => r.status === "APPROVED");
  const playerCount = 5 + (team.substitute ? 1 : 0);
  const primaryTournament = approvedRegs[0]?.tournament;
  const tournamentCount = approvedRegs.length;

  return (
    <button
      onClick={onClick}
      className="group ns-card ns-card-gold-edge rounded-xl p-5 flex items-center gap-4 w-full text-left ns-lift"
    >
      <TeamMonogram name={team.name} logo={team.logo} size={56} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-base text-white group-hover:text-gold-light transition-colors truncate">
            {team.name}
          </h3>
          {team.isOfficial && (
            <span className="text-gold shrink-0" title={t("officialTeam")}>
              <Crown className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        {/* Tournament participation (replaces game label) */}
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {primaryTournament ? (
            <>
              <span className="text-gold/70">{t("tournamentLabel")}</span>{" "}
              <span className="text-white/80">{primaryTournament.name}</span>
            </>
          ) : (
            <span className="italic">{t("noActiveTournament")}</span>
          )}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1 text-[0.7rem] text-white/60">
            <Users className="w-3 h-3 text-gold/60" />
            {t("playersCount", { count: playerCount })}
          </span>
          {tournamentCount > 1 && (
            <span className="text-[0.7rem] text-gold-light font-semibold">
              {t("moreCount", { count: tournamentCount - 1 })}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gold/40 group-hover:text-gold-light group-hover:translate-x-1 transition-all shrink-0" />
    </button>
  );
}

function NewsCard({
  news,
  onClick,
}: {
  news: Announcement;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left ns-card ns-card-gold-edge rounded-xl overflow-hidden w-full ns-lift"
    >
      <div className="relative h-40 bg-gradient-to-br from-[#1a1a1a] to-black overflow-hidden">
        <div className="absolute inset-0 ns-grid-bg opacity-30" />
        <div className="absolute inset-0 ns-radial-gold opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Newspaper className="w-12 h-12 text-gold/20 group-hover:text-gold/40 transition-colors" />
        </div>
        <div className="absolute top-3 left-3">
          <span className="ns-pill ns-pill-ongoing">
            {news.category.replace(/_/g, " ")}
          </span>
        </div>
      </div>
      <div className="p-5">
        <span className="text-[0.7rem] text-muted-foreground">
          {new Date(news.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <h3 className="mt-2 font-display font-bold text-base text-white group-hover:text-gold-light transition-colors line-clamp-2">
          {news.title}
        </h3>
        {news.excerpt && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
            {news.excerpt}
          </p>
        )}
      </div>
    </button>
  );
}
