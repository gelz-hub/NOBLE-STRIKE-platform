"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useFetch, apiPost } from "../hooks";
import {
  SectionHeading,
  StatusPill,
  GameBadge,
  PrizeTag,
  NSCardSkeleton,
  TeamMonogram,
} from "../ui";
import { Button } from "@/components/ui/button";
import {
  TournamentCard,
} from "./home-view";
import {
  Trophy,
  Calendar,
  Users,
  ArrowLeft,
  Swords,
  ScrollText,
  MapPin,
  UserPlus,
  CheckCircle2,
  Clock,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tournament, Team } from "@/lib/types";
import { TeamRegistrationForm } from "../forms/team-registration-form";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "REGISTRATION_OPEN", label: "Open" },
  { id: "ONGOING", label: "Live" },
  { id: "COMPLETED", label: "Completed" },
];

export function TournamentsView() {
  const selectedId = useApp((s) => s.selectedTournamentId);
  const openTournament = useApp((s) => s.openTournament);

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

  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          kicker="The Arena"
          title="Tournaments"
          description="Compete in elite 5v5 MOBA tournaments. Register, battle, and claim your legacy."
        />

        {/* Filters */}
        <div className="mt-10 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.id}
              variant="outline"
              size="sm"
              className="border-gold/30 text-white/70 hover:text-gold-light hover:border-gold/60 hover:bg-gold/10"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <NSCardSkeleton />
              <NSCardSkeleton />
              <NSCardSkeleton />
            </>
          ) : (tournaments || []).length === 0 ? (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gold/30" />
              No tournaments yet. Check back soon.
            </div>
          ) : (
            (tournaments || []).map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                onClick={() => openTournament(t.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TournamentDetail({ tournament }: { tournament: Tournament }) {
  const setView = useApp((s) => s.setView);
  const openTournament = useApp((s) => s.openTournament);
  const [showReg, setShowReg] = useState(false);

  const { data: teams } = useFetch<Team[]>(
    `/api/teams?status=APPROVED`,
    [tournament.id]
  );

  const registeredTeams = (teams || []).filter(
    (t) => t.tournamentId === tournament.id
  );

  const startDate = new Date(tournament.startDate);
  const deadline = new Date(tournament.registrationDeadline);
  const regOpen = tournament.status === "REGISTRATION_OPEN";
  const regCount = tournament._count?.teams ?? registeredTeams.length;
  const pct = Math.min(100, (regCount / tournament.teamLimit) * 100);

  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up">
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
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <DetailStat
            icon={Calendar}
            label="Start Date"
            value={startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
          <DetailStat
            icon={Clock}
            label="Reg Deadline"
            value={deadline.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          />
          <DetailStat
            icon={Users}
            label="Team Slots"
            value={`${regCount} / ${tournament.teamLimit}`}
          />
          <DetailStat
            icon={MapPin}
            label="Location"
            value={tournament.location || "Online"}
          />
        </div>

        {/* registration progress */}
        <div className="mt-6 ns-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading font-semibold uppercase text-sm tracking-wider text-white/80">
              Registration Progress
            </span>
            <span className="text-sm font-bold text-gold-light">
              {regCount}/{tournament.teamLimit}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#92783D] via-[#D5BE77] to-[#E6D69A] rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Body grid */}
        <div className="mt-6 grid lg:grid-cols-[1.6fr_1fr] gap-6">
          {/* Rules */}
          <div className="ns-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                <ScrollText className="w-4.5 h-4.5 text-gold" />
              </div>
              <h2 className="font-display font-bold text-xl text-white">
                Tournament Rules
              </h2>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {tournament.rules ||
                  tournament.description ||
                  "Official rulebook will be published prior to the tournament start. All participants must adhere to the NOBLE STRIKE competitive integrity policy."}
              </p>
            </div>
            {tournament.description && tournament.rules && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                {tournament.description}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="ns-pill ns-pill-ongoing">Single Elimination</span>
              <span className="ns-pill ns-pill-pending">{tournament.format}</span>
              <span className="ns-pill ns-pill-approved">5v5</span>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* CTA */}
            <div className="ns-card ns-card-gold-edge rounded-xl p-6 text-center">
              <Trophy className="w-10 h-10 text-gold mx-auto mb-3" />
              <h3 className="font-display font-bold text-lg text-white">
                {regOpen ? "Join The Battle" : "Registration Closed"}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                {regOpen
                  ? `Register your squad of 5 + 1 sub before ${deadline.toLocaleDateString()}`
                  : "Follow along on the brackets page."}
              </p>
              <Button
                onClick={() => setShowReg(true)}
                disabled={!regOpen}
                className={cn(
                  "mt-4 w-full h-11 text-sm uppercase tracking-wider",
                  regOpen ? "ns-btn-gold" : "opacity-50 cursor-not-allowed"
                )}
              >
                <UserPlus className="w-4 h-4" />
                Register Team
              </Button>
            </div>

            {/* Organizer */}
            <div className="ns-card rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5 text-gold" />
                </div>
                <div>
                  <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    Organizer
                  </p>
                  <p className="font-heading font-semibold text-white">
                    {tournament.organizer || "NOBLE STRIKE"}
                  </p>
                </div>
              </div>
            </div>

            {/* Registered teams preview */}
            <div className="ns-card rounded-xl p-5">
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground mb-3">
                Registered Teams
              </p>
              {registeredTeams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No approved teams yet. Be the first to register.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {registeredTeams.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <TeamMonogram name={t.name} logo={t.logo} size={32} />
                      <span className="text-sm font-medium text-white/90 truncate">
                        {t.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bracket CTA */}
        {(tournament.status === "ONGOING" ||
          tournament.status === "COMPLETED") && (
          <div className="mt-6 ns-card rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-gold" />
              <div>
                <h3 className="font-display font-bold text-white">
                  View Live Bracket
                </h3>
                <p className="text-sm text-muted-foreground">
                  Track every matchup in real time.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setView("brackets")}
              className="ns-btn-outline h-11 px-6"
            >
              Open Brackets
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Button>
          </div>
        )}
      </div>

      {/* Registration modal */}
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

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="ns-card rounded-xl p-4">
      <div className="flex items-center gap-2 text-gold mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="font-display font-bold text-sm md:text-base text-white">
        {value}
      </p>
    </div>
  );
}
