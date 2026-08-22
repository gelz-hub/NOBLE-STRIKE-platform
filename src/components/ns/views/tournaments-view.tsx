"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useFetch } from "../hooks";
import {
  SectionHeading,
  StatusPill,
  GameBadge,
  PrizeTag,
  NSCardSkeleton,
  TeamMonogram,
  Reveal,
  SlotsBar,
} from "../ui";
import { Button } from "@/components/ui/button";
import { TournamentCard } from "./home-view";
import { TeamRegistrationForm } from "../forms/team-registration-form";
import {
  Trophy,
  Calendar,
  Users,
  ArrowLeft,
  Swords,
  ScrollText,
  MapPin,
  UserPlus,
  Clock,
  Building2,
  ChevronRight,
  ListChecks,
  BarChart3,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tournament, Team, Registration } from "@/lib/types";

type DetailTab = "overview" | "rules" | "teams" | "bracket" | "schedule" | "results" | "stats";

export function TournamentsView() {
  const selectedId = useApp((s) => s.selectedTournamentId);
  const openTournament = useApp((s) => s.openTournament);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: tournaments, loading } = useFetch<Tournament[]>(
    "/api/tournaments"
  );

  const selected = useMemo(
    () => (tournaments || []).find((t) => t.id === selectedId) || null,
    [tournaments, selectedId]
  );

  if (selected) {
    return <TournamentDetail tournament={selected} />;
  }

  const filtered =
    statusFilter === "ALL"
      ? tournaments || []
      : (tournaments || []).filter((t) => t.status === statusFilter);

  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up" lang="en">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Reveal>
          <SectionHeading
            kicker="The Arena"
            title="Tournaments"
            description="Compete in elite 5v5 MOBA tournaments across multiple seasons. From 8-team invitationals to 256-slot open qualifiers."
          />
        </Reveal>

        {/* Filters */}
        <Reveal delay={100}>
          <div className="mt-10 flex flex-wrap items-center gap-2">
            {[
              { id: "ALL", label: "All" },
              { id: "REGISTRATION_OPEN", label: "Registration Open" },
              { id: "ONGOING", label: "Live Now" },
              { id: "COMPLETED", label: "Completed" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "px-4 py-2 rounded-md text-xs font-heading font-semibold uppercase tracking-wider transition-all border",
                  statusFilter === f.id
                    ? "bg-gold/15 border-gold/50 text-gold-light"
                    : "border-gold/15 text-white/60 hover:text-white hover:border-gold/30"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Grid */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <NSCardSkeleton />
              <NSCardSkeleton />
              <NSCardSkeleton />
            </>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gold/30" />
              No tournaments found.
            </div>
          ) : (
            filtered.map((t, i) => (
              <Reveal key={t.id} delay={i * 80}>
                <TournamentCard
                  tournament={t}
                  onClick={() => openTournament(t.id)}
                />
              </Reveal>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ Tournament Detail with Tabs ============ */

function TournamentDetail({ tournament }: { tournament: Tournament }) {
  const openTournament = useApp((s) => s.openTournament);
  const setView = useApp((s) => s.setView);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [showReg, setShowReg] = useState(false);

  const { data: teams } = useFetch<Team[]>("/api/teams");
  const { data: bracket } = useFetch<{
    rounds: { round: number; matches: unknown[] }[];
  }>(`/api/tournaments/${tournament.id}/bracket`, [tournament.id]);

  const registeredTeams = (teams || []).filter((t) =>
    (t.registrations || []).some(
      (r: Registration) =>
        r.tournamentId === tournament.id && r.status === "APPROVED"
    )
  );
  const regCount = registeredTeams.length;
  const remaining = Math.max(0, tournament.teamLimit - regCount);
  const startDate = new Date(tournament.startDate);
  const deadline = new Date(tournament.registrationDeadline);
  const regOpen = tournament.status === "REGISTRATION_OPEN";
  const totalMatches = bracket?.rounds?.reduce((s, r) => s + r.matches.length, 0) || 0;
  const hasBracket = totalMatches > 0;

  const TABS: { id: DetailTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "rules", label: "Rules", icon: ScrollText },
    { id: "teams", label: "Registered Teams", icon: Users },
    { id: "bracket", label: "Bracket", icon: Swords },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "results", label: "Results", icon: Trophy },
    { id: "stats", label: "Statistics", icon: BarChart3 },
  ];

  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up" lang="en">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Back */}
        <button
          onClick={() => openTournament("")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold-light transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tournaments
        </button>

        {/* Banner */}
        <div className="relative h-56 md:h-72 rounded-2xl overflow-hidden ns-card ns-card-gold-edge">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black" />
          <div className="absolute inset-0 ns-grid-bg opacity-40" />
          <div className="absolute inset-0 ns-radial-gold" />
          {tournament.bannerImage && (
            <img
              src={tournament.bannerImage}
              alt={tournament.name}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <GameBadge game={tournament.game} />
            <StatusPill status={tournament.status} />
          </div>

          <div className="absolute bottom-5 left-5 right-5">
            <h1 className="font-display font-black text-3xl md:text-5xl text-white text-glow-gold">
              {tournament.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <PrizeTag prize={tournament.prizePool} />
              <span className="ns-pill ns-pill-ongoing">{tournament.format}</span>
              <span className="ns-pill ns-pill-approved">
                {tournament.teamLimit} Slots
              </span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <DetailStat icon={Calendar} label="Start Date" value={startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
          <DetailStat icon={Clock} label="Reg Deadline" value={deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
          <DetailStat icon={Users} label="Registered" value={`${regCount} / ${tournament.teamLimit}`} />
          <DetailStat icon={MapPin} label="Location" value={tournament.location || "Online"} />
        </div>

        {/* Capacity + CTA */}
        <div className="mt-6 grid md:grid-cols-[1.4fr_1fr] gap-4">
          <div className="ns-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading font-semibold uppercase text-sm tracking-wider text-white/80">
                Tournament Capacity
              </span>
              <span className="text-sm font-bold text-gold-light">
                {regCount}/{tournament.teamLimit}
              </span>
            </div>
            <SlotsBar registered={regCount} limit={tournament.teamLimit} showRemaining={false} />
            {regOpen && remaining > 0 && (
              <p className="mt-3 text-sm text-gold-light font-semibold">
                {remaining} Slots Remaining — Registration Open
              </p>
            )}
          </div>
          <div className="ns-card ns-card-gold-edge rounded-xl p-5 text-center flex flex-col justify-center">
            <Trophy className="w-8 h-8 text-gold mx-auto mb-2" />
            <h3 className="font-display font-bold text-white">
              {regOpen ? "Join The Battle" : tournament.status === "ONGOING" ? "Watch Live" : "View Results"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {regOpen ? `${remaining} slots open` : tournament.status === "ONGOING" ? "Follow the bracket" : "Tournament completed"}
            </p>
            <Button
              onClick={() => (regOpen ? setShowReg(true) : setView("brackets"))}
              className={cn("mt-3 h-10 text-sm uppercase tracking-wider", regOpen ? "ns-btn-gold" : "ns-btn-outline")}
            >
              {regOpen ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Register Team
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4" />
                  View Bracket
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-1 border-b border-gold/15 pb-px">
            {TABS.map((t) => {
              const disabled =
                (t.id === "bracket" || t.id === "results" || t.id === "stats") &&
                !hasBracket;
              return (
                <button
                  key={t.id}
                  onClick={() => !disabled && setTab(t.id)}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-heading font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px",
                    tab === t.id
                      ? "text-gold-light border-gold"
                      : disabled
                      ? "text-white/20 border-transparent cursor-not-allowed"
                      : "text-white/60 border-transparent hover:text-white"
                  )}
                >
                  <t.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="mt-6">
            {tab === "overview" && <OverviewTab tournament={tournament} />}
            {tab === "rules" && <RulesTab tournament={tournament} />}
            {tab === "teams" && <TeamsTab teams={registeredTeams} />}
            {tab === "bracket" && hasBracket && (
              <div className="ns-card rounded-xl p-6 text-center">
                <Swords className="w-12 h-12 text-gold mx-auto mb-3" />
                <p className="text-white/80 mb-4">View the full interactive bracket</p>
                <Button onClick={() => setView("brackets")} className="ns-btn-outline">
                  Open Bracket Viewer
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            {tab === "schedule" && <ScheduleTab tournament={tournament} />}
            {tab === "results" && hasBracket && (
              <div className="ns-card rounded-xl p-6 text-center">
                <Trophy className="w-12 h-12 text-gold mx-auto mb-3" />
                <p className="text-white/80 mb-4">View match results on the bracket page</p>
                <Button onClick={() => setView("brackets")} className="ns-btn-outline">
                  View Results
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            {tab === "stats" && hasBracket && (
              <StatsTab tournament={tournament} teamCount={regCount} matchCount={totalMatches} />
            )}
          </div>
        </div>
      </div>

      {showReg && (
        <TeamRegistrationForm
          defaultTournamentId={tournament.id}
          onClose={() => setShowReg(false)}
          onSuccess={() => {
            setShowReg(false);
            toast.success("Team registered! Awaiting admin approval.");
          }}
        />
      )}
    </div>
  );
}

function OverviewTab({ tournament }: { tournament: Tournament }) {
  return (
    <div className="ns-card rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-gold" />
        <h3 className="font-display font-bold text-xl text-white">Tournament Overview</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {tournament.description ||
          `${tournament.name} is a premier ${tournament.format} 5v5 MOBA tournament organized by ${tournament.organizer || "NOBLE STRIKE"}. With a prize pool of ${tournament.prizePool} and ${tournament.teamLimit} team slots, this competition brings together the strongest rosters to battle for glory.`}
      </p>
      <div className="grid sm:grid-cols-2 gap-3 pt-2">
        <InfoRow icon={Trophy} label="Prize Pool" value={tournament.prizePool} />
        <InfoRow icon={Swords} label="Format" value={tournament.format} />
        <InfoRow icon={Users} label="Team Limit" value={`${tournament.teamLimit} teams`} />
        <InfoRow icon={Building2} label="Organizer" value={tournament.organizer || "NOBLE STRIKE"} />
        <InfoRow icon={MapPin} label="Location" value={tournament.location || "Online"} />
        <InfoRow icon={Calendar} label="Start Date" value={new Date(tournament.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
      </div>
    </div>
  );
}

function RulesTab({ tournament }: { tournament: Tournament }) {
  return (
    <div className="ns-card rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <ScrollText className="w-5 h-5 text-gold" />
        <h3 className="font-display font-bold text-xl text-white">Tournament Rules</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
        {tournament.rules ||
          "Official rulebook will be published prior to the tournament start. All participants must adhere to the NOBLE STRIKE competitive integrity policy."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="ns-pill ns-pill-ongoing">Single Elimination</span>
        <span className="ns-pill ns-pill-pending">{tournament.format}</span>
        <span className="ns-pill ns-pill-approved">5v5</span>
      </div>
    </div>
  );
}

function TeamsTab({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <div className="ns-card rounded-xl p-12 text-center text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 text-gold/30" />
        No approved teams yet. Be the first to register.
      </div>
    );
  }
  return (
    <div className="ns-card rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <ListChecks className="w-5 h-5 text-gold" />
        <h3 className="font-display font-bold text-xl text-white">
          Registered Teams ({teams.length})
        </h3>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[28rem] overflow-y-auto pr-2">
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => useApp.getState().openTeam(t.id)}
            className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-gold/10 hover:border-gold/40 transition-colors text-left"
          >
            <TeamMonogram name={t.name} logo={t.logo} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-heading font-semibold text-white text-sm truncate">
                  {t.name}
                </p>
                {t.isOfficial && <Crown className="w-3 h-3 text-gold" />}
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                {t.tag ? `[${t.tag}]` : ""} {t.region || ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScheduleTab({ tournament }: { tournament: Tournament }) {
  const startDate = new Date(tournament.startDate);
  const deadline = new Date(tournament.registrationDeadline);
  const events = [
    { label: "Registration Opens", date: new Date(tournament.createdAt), done: true, icon: UserPlus },
    { label: "Registration Closes", date: deadline, done: deadline < new Date(), icon: Clock },
    { label: "Tournament Begins", date: startDate, done: startDate < new Date(), icon: Swords },
    { label: "Grand Final", date: new Date(startDate.getTime() + 3 * 86400000), done: tournament.status === "COMPLETED", icon: Crown },
  ];
  return (
    <div className="ns-card rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <Calendar className="w-5 h-5 text-gold" />
        <h3 className="font-display font-bold text-xl text-white">Match Schedule</h3>
      </div>
      <div className="space-y-4">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center border",
              e.done ? "bg-gold/10 border-gold/40 text-gold" : "bg-black/30 border-gold/15 text-white/40"
            )}>
              <e.icon className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1">
              <p className={cn("font-heading font-semibold", e.done ? "text-white" : "text-white/60")}>
                {e.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            {e.done && (
              <span className="ns-pill ns-pill-approved text-[0.6rem]">Done</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTab({ tournament, teamCount, matchCount }: { tournament: Tournament; teamCount: number; matchCount: number }) {
  const fillRate = Math.round((teamCount / tournament.teamLimit) * 100);
  const stats = [
    { label: "Teams Registered", value: teamCount, icon: Users },
    { label: "Total Slots", value: tournament.teamLimit, icon: ListChecks },
    { label: "Fill Rate", value: `${fillRate}%`, icon: BarChart3 },
    { label: "Bracket Matches", value: matchCount, icon: Swords },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="ns-card ns-card-gold-edge rounded-xl p-5 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 mb-3">
            <s.icon className="w-5 h-5 text-gold" />
          </div>
          <div className="font-display font-black text-3xl text-gold-gradient">{s.value}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function DetailStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="ns-card rounded-xl p-4">
      <div className="flex items-center gap-2 text-gold mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="font-display font-bold text-sm md:text-base text-white">{value}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-gold/10">
      <Icon className="w-4 h-4 text-gold/70 shrink-0" />
      <div className="min-w-0">
        <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-heading font-semibold text-white truncate">{value}</p>
      </div>
    </div>
  );
}
