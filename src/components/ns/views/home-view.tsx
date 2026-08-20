"use client";

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
} from "../ui";
import {
  Button,
} from "@/components/ui/button";
import {
  Trophy,
  Users,
  Swords,
  Calendar,
  ArrowRight,
  Zap,
  Crown,
  Shield,
  Flame,
  TrendingUp,
  Newspaper,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tournament, Team, Announcement, Stats, Sponsor } from "@/lib/types";

export function HomeView() {
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
  const { data: sponsors } = useFetch<Sponsor[]>("/api/ns");

  const featuredT = (tournaments || [])
    .slice()
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 3);
  const featuredTeams = (teams || []).slice(0, 6);
  const latestNews = (news || []).slice(0, 3);
  const sponsorList = (sponsors as { sponsors?: Sponsor[] } | null)?.sponsors || [];

  return (
    <div className="ns-fade-up">
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

        {/* corner flourishes */}
        <div className="absolute top-28 left-6 hidden md:flex flex-col gap-2 text-gold/40">
          <span className="font-mono text-[0.65rem] tracking-widest">EST. 2024</span>
          <span className="h-px w-16 bg-gold/30" />
        </div>
        <div className="absolute top-28 right-6 hidden md:flex flex-col gap-2 items-end text-gold/40">
          <span className="font-mono text-[0.65rem] tracking-widest">5V5 MOBA · ELITE</span>
          <span className="h-px w-16 bg-gold/30" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center flex flex-col items-center">
          {/* Logo */}
          <div className="relative mb-8 ns-fade-up">
            <div className="absolute inset-0 blur-3xl bg-gold/20 rounded-full" />
            <NSLogo size={120} className="relative" />
          </div>

          {/* kicker */}
          <div className="flex items-center gap-3 mb-6 ns-fade-up" style={{ animationDelay: "0.1s" }}>
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/60" />
            <span className="ns-kicker">Elite Esports Organization</span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/60" />
          </div>

          {/* Headline */}
          <h1
            className="font-display font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[0.08em] text-gold-shine text-glow-gold ns-fade-up"
            style={{ animationDelay: "0.15s" }}
          >
            NOBLE STRIKE
          </h1>

          {/* Subheadline */}
          <p
            className="mt-6 font-heading text-xl md:text-2xl lg:text-3xl font-light tracking-wide text-white/90 ns-fade-up"
            style={{ animationDelay: "0.25s" }}
          >
            Compete. Conquer.{" "}
            <span className="text-gold-gradient font-semibold">Become Legendary.</span>
          </p>

          <p
            className="mt-5 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed ns-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            The premier 5v5 MOBA tournament platform. Mobile Legends: Bang Bang &amp;
            Honor of Kings. Where champions are forged and legends rise.
          </p>

          {/* CTAs */}
          <div
            className="mt-10 flex flex-col sm:flex-row items-center gap-4 ns-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            <Button
              onClick={() => setView("tournaments")}
              className="ns-btn-gold h-12 px-8 text-sm uppercase tracking-widest group"
            >
              <Trophy className="w-4 h-4" />
              Join Tournament
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              onClick={() => setView("teams")}
              className="ns-btn-outline h-12 px-8 text-sm uppercase tracking-widest"
            >
              <Users className="w-4 h-4" />
              View Teams
            </Button>
          </div>

          {/* scroll hint */}
          <div className="mt-16 flex flex-col items-center gap-2 text-gold/50">
            <span className="font-mono text-[0.6rem] tracking-[0.3em] uppercase">
              Scroll
            </span>
            <div className="w-px h-10 bg-gradient-to-b from-gold/60 to-transparent" />
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="relative border-y border-gold/15 bg-gradient-to-b from-[#0a0a0a] to-black">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <StatCard
              icon={Trophy}
              value={stats?.tournaments ?? "—"}
              label="Tournaments Hosted"
              delay={0}
            />
            <StatCard
              icon={Users}
              value={stats?.teams ?? "—"}
              label="Pro Teams"
              delay={0.1}
            />
            <StatCard
              icon={Zap}
              value={stats?.prizePool ? `$${(stats.prizePool / 1000).toFixed(0)}K` : "—"}
              label="Prize Pool Awarded"
              delay={0.2}
            />
            <StatCard
              icon={Swords}
              value={stats?.matches ?? "—"}
              label="Matches Played"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ============ UPCOMING TOURNAMENTS ============ */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <SectionHeading
              kicker="Now Battling"
              title="Upcoming Tournaments"
              description="Register your squad for the most prestigious 5v5 MOBA competitions."
            />
            <Button
              onClick={() => setView("tournaments")}
              variant="ghost"
              className="text-gold-light hover:text-gold-light hover:bg-gold/10 self-start md:self-auto"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tLoading ? (
              <>
                <NSCardSkeleton />
                <NSCardSkeleton />
                <NSCardSkeleton />
              </>
            ) : (
              featuredT.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  onClick={() => openTournament(t.id)}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ============ FEATURED TEAMS ============ */}
      <section className="relative py-20 md:py-28 border-t border-gold/10 bg-gradient-to-b from-black to-[#0a0a0a]">
        <div className="absolute inset-0 ns-grid-bg opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <SectionHeading
              kicker="The Contenders"
              title="Featured Teams"
              description="Elite rosters battling for glory across MLBB &amp; Honor of Kings."
            />
            <Button
              onClick={() => setView("teams")}
              variant="ghost"
              className="text-gold-light hover:text-gold-light hover:bg-gold/10 self-start md:self-auto"
            >
              All Teams
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tmLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <NSCardSkeleton key={i} className="h-32" />
              ))
            ) : (
              featuredTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onClick={() => openTeam(team.id)}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ============ LATEST NEWS ============ */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <SectionHeading
              kicker="From The Newsroom"
              title="Latest Announcements"
              description="Tournament news, player signings, results and official updates."
            />
            <Button
              onClick={() => setView("news")}
              variant="ghost"
              className="text-gold-light hover:text-gold-light hover:bg-gold/10 self-start md:self-auto"
            >
              All News
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {latestNews.map((n) => (
              <NewsCard key={n.id} news={n} onClick={() => openNews(n.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ SPONSORS ============ */}
      {sponsorList.length > 0 && (
        <section className="relative py-16 border-y border-gold/10 bg-black overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 md:px-6 mb-8">
            <p className="ns-kicker text-center">Powered By Elite Partners</p>
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
            {/* edge fades */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none" />
          </div>
        </section>
      )}

      {/* ============ CTA ============ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 ns-radial-gold" />
        <div className="absolute inset-0 ns-grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-4 text-center flex flex-col items-center">
          <div className="mb-8">
            <NSLogo size={72} className="justify-center" />
          </div>
          <h2 className="font-display font-black text-3xl md:text-5xl lg:text-6xl tracking-tight">
            Ready To Become{" "}
            <span className="text-gold-gradient">Legendary?</span>
          </h2>
          <p className="mt-6 max-w-xl text-muted-foreground text-base md:text-lg">
            Assemble your squad, enter the arena, and write your name into esports
            history. The next champion could be you.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Button
              onClick={() => setView("teams")}
              className="ns-btn-gold h-12 px-8 text-sm uppercase tracking-widest"
            >
              <Swords className="w-4 h-4" />
              Register Your Team
            </Button>
            <Button
              onClick={() => setView("ns-team")}
              className="ns-btn-outline h-12 px-8 text-sm uppercase tracking-widest"
            >
              <Shield className="w-4 h-4" />
              Meet NS Squad
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- sub components ---------- */

function StatCard({
  icon: Icon,
  value,
  label,
  delay,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  delay: number;
}) {
  return (
    <div
      className="relative ns-card ns-card-gold-edge rounded-xl p-5 md:p-6 text-center ns-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-gold/10 border border-gold/30 mb-3">
        <Icon className="w-5 h-5 text-gold" />
      </div>
      <div className="font-display font-black text-3xl md:text-4xl text-gold-gradient">
        {value}
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
  const regCount = tournament._count?.teams ?? 0;
  const pct = Math.min(100, (regCount / tournament.teamLimit) * 100);
  const startDate = new Date(tournament.startDate);
  return (
    <button
      onClick={onClick}
      className="group text-left ns-card ns-card-gold-edge rounded-xl overflow-hidden w-full"
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
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {regCount}/{tournament.teamLimit} teams
          </span>
        </div>

        {/* progress */}
        <div className="mt-4">
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#92783D] to-[#E6D69A] rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-heading uppercase tracking-wider text-gold/70">
            {tournament.format}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-gold-light group-hover:gap-2 transition-all">
            Details
            <ArrowRight className="w-3.5 h-3.5" />
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
  return (
    <button
      onClick={onClick}
      className="group ns-card ns-card-gold-edge rounded-xl p-5 flex items-center gap-4 w-full text-left"
    >
      <TeamMonogram name={team.name} logo={team.logo} size={56} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-base text-white group-hover:text-gold-light transition-colors truncate">
            {team.name}
          </h3>
          {team.isOfficial && (
            <span className="text-gold" title="Official NS Team">
              <Crown className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <GameBadge game={team.game} />
          {team.region && (
            <span className="text-[0.7rem] text-muted-foreground">
              · {team.region}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gold/40 group-hover:text-gold-light group-hover:translate-x-1 transition-all" />
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
      className="group text-left ns-card ns-card-gold-edge rounded-xl overflow-hidden w-full"
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
