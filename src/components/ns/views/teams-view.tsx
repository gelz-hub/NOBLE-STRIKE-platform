"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useFetch } from "../hooks";
import {
  SectionHeading,
  StatusPill,
  GameBadge,
  TeamMonogram,
  NSCardSkeleton,
} from "../ui";
import { Button } from "@/components/ui/button";
import { TeamCard } from "./home-view";
import { TeamRegistrationForm } from "../forms/team-registration-form";
import {
  Users,
  Crown,
  ArrowLeft,
  UserPlus,
  Trophy,
  Swords,
  Gamepad2,
  Calendar,
  Medal,
  Shield,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team, Tournament, Achievement, Match } from "@/lib/types";

const GAME_FILTERS = [
  { id: "ALL", label: "All Games" },
  { id: "MLBB", label: "MLBB" },
  { id: "HOK", label: "HoK" },
];

export function TeamsView() {
  const selectedId = useApp((s) => s.selectedTeamId);
  const [gameFilter, setGameFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [showReg, setShowReg] = useState(false);

  const { data: teams, loading } = useFetch<Team[]>("/api/teams");

  const filtered = useMemo(() => {
    return (teams || []).filter((t) => {
      if (gameFilter !== "ALL" && t.game !== gameFilter) return false;
      if (query && !t.name.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [teams, gameFilter, query]);

  const selected = useMemo(
    () => (teams || []).find((t) => t.id === selectedId) || null,
    [teams, selectedId]
  );

  if (selected) {
    return <TeamProfile team={selected} />;
  }

  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <SectionHeading
            kicker="The Contenders"
            title="Teams"
            description="Elite rosters competing across MLBB & Honor of Kings."
          />
          <Button
            onClick={() => setShowReg(true)}
            className="ns-btn-gold h-11 px-6 self-start md:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            Register Team
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {GAME_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setGameFilter(f.id)}
                className={cn(
                  "px-4 py-2 rounded-md text-xs font-heading font-semibold uppercase tracking-wider transition-all border",
                  gameFilter === f.id
                    ? "bg-gold/15 border-gold/50 text-gold-light"
                    : "border-gold/15 text-white/60 hover:text-white hover:border-gold/30"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams..."
              className="w-full h-10 pl-10 pr-4 rounded-md bg-black/40 border border-gold/20 focus:border-gold/50 text-sm placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <NSCardSkeleton key={i} className="h-24" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 text-gold/30" />
              No teams found.
            </div>
          ) : (
            filtered.map((t) => (
              <TeamCard
                key={t.id}
                team={t}
                onClick={() => useApp.getState().openTeam(t.id)}
              />
            ))
          )}
        </div>
      </div>

      {showReg && (
        <TeamRegistrationForm
          onClose={() => setShowReg(false)}
          onSuccess={() => {
            setShowReg(false);
          }}
        />
      )}
    </div>
  );
}

/* ============ Team Profile ============ */

function TeamProfile({ team }: { team: Team }) {
  const openTeam = useApp((s) => s.openTeam);
  const setView = useApp((s) => s.setView);
  const { data: tournaments } = useFetch<Tournament[]>("/api/tournaments");
  const { data: fullTeam } = useFetch<Team & { matches?: Match[] }>(
    `/api/teams/${team.id}`
  );

  const tournament = (tournaments || []).find((t) => t.id === team.tournamentId);
  const roster = [
    { ign: team.player1, role: "Player 1" },
    { ign: team.player2, role: "Player 2" },
    { ign: team.player3, role: "Player 3" },
    { ign: team.player4, role: "Player 4" },
    { ign: team.player5, role: "Player 5" },
    { ign: team.substitute, role: "Substitute" },
  ].filter((p) => p.ign);

  const achievements = fullTeam?.achievements || team.achievements || [];
  const matches = fullTeam?.matches || [];

  const wins = matches.filter(
    (m) => m.winnerId === team.id
  ).length;
  const losses = matches.filter(
    (m) => m.status === "COMPLETED" && m.winnerId && m.winnerId !== team.id
  ).length;

  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <button
          onClick={() => openTeam("")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold-light transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to teams
        </button>

        {/* Banner */}
        <div className="relative h-52 md:h-64 rounded-2xl overflow-hidden ns-card ns-card-gold-edge">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black" />
          <div className="absolute inset-0 ns-grid-bg opacity-40" />
          <div className="absolute inset-0 ns-radial-gold" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          {team.isOfficial && (
            <div className="absolute top-4 right-4 ns-pill ns-pill-ongoing">
              <Crown className="w-3.5 h-3.5" />
              Official NS Team
            </div>
          )}

          <div className="absolute bottom-6 left-6 right-6 flex items-end gap-5">
            <TeamMonogram
              name={team.name}
              logo={team.logo}
              size={88}
              className="ring-2 ring-gold/30 shadow-[0_0_30px_rgba(213,190,119,0.3)]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <GameBadge game={team.game} />
                <StatusPill status={team.status} />
              </div>
              <h1 className="font-display font-black text-3xl md:text-5xl text-white text-glow-gold truncate">
                {team.name}
                {team.tag && (
                  <span className="ml-3 text-xl text-gold/60 font-heading">
                    [{team.tag}]
                  </span>
                )}
              </h1>
              {team.region && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Region: {team.region}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={Trophy} label="Wins" value={wins} />
          <StatBox icon={Swords} label="Matches" value={matches.length} />
          <StatBox icon={Medal} label="Trophies" value={achievements.length} />
          <StatBox icon={Users} label="Roster" value={roster.length} />
        </div>

        {/* Body */}
        <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Roster */}
          <div className="ns-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-gold" />
              </div>
              <h2 className="font-display font-bold text-xl text-white">Roster</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {roster.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-gold/10 hover:border-gold/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E6D69A] via-[#D5BE77] to-[#92783D] flex items-center justify-center font-display font-bold text-black">
                    {p.ign?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-white truncate">
                      {p.ign}
                    </p>
                    <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                      {p.role}
                    </p>
                  </div>
                  {i === 0 && (
                    <Shield className="w-3.5 h-3.5 text-gold ml-auto" title="Captain" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Tournament */}
            <div className="ns-card rounded-xl p-5">
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground mb-3">
                Registered Tournament
              </p>
              {tournament ? (
                <button
                  onClick={() => useApp.getState().openTournament(tournament.id)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gold/5 border border-gold/15 transition-colors"
                >
                  <Trophy className="w-5 h-5 text-gold" />
                  <div>
                    <p className="font-heading font-semibold text-white text-sm">
                      {tournament.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tournament.prizePool} · {tournament.format}
                    </p>
                  </div>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not registered to a tournament.
                </p>
              )}
            </div>

            {/* Captain info */}
            <div className="ns-card rounded-xl p-5">
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground mb-3">
                Captain
              </p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#E6D69A] to-[#92783D] flex items-center justify-center font-display font-bold text-black">
                  {team.captainName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-heading font-semibold text-white">
                    {team.captainName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{team.discordUsername}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="mt-6 ns-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                <Medal className="w-4.5 h-4.5 text-gold" />
              </div>
              <h2 className="font-display font-bold text-xl text-white">
                Achievements
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-black border border-gold/15"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="w-4 h-4 text-gold" />
                    {a.placement && (
                      <span className="ns-pill ns-pill-approved">
                        {a.placement}
                      </span>
                    )}
                  </div>
                  <p className="font-heading font-semibold text-white text-sm">
                    {a.title}
                  </p>
                  {a.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.description}
                    </p>
                  )}
                  <p className="text-[0.7rem] text-gold/60 mt-2">{a.date}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match history */}
        {matches.length > 0 && (
          <div className="mt-6 ns-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                <Swords className="w-4.5 h-4.5 text-gold" />
              </div>
              <h2 className="font-display font-bold text-xl text-white">
                Match History
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {matches.slice(0, 8).map((m) => {
                const isA = m.teamAId === team.id;
                const opp = isA ? m.teamB : m.teamA;
                const myScore = isA ? m.scoreA : m.scoreB;
                const oppScore = isA ? m.scoreB : m.scoreA;
                const won = m.winnerId === team.id;
                const done = m.status === "COMPLETED";
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-black/30 border border-gold/10"
                  >
                    <div
                      className={cn(
                        "w-1 h-10 rounded-full",
                        done
                          ? won
                            ? "bg-green-400"
                            : "bg-red-400"
                          : "bg-gold/40"
                      )}
                    />
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">
                          vs
                        </span>
                        <span className="font-heading font-semibold text-white text-sm truncate">
                          {opp?.name || "TBD"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-white">
                          {done ? `${myScore} - ${oppScore}` : "—"}
                        </span>
                        {done ? (
                          <span
                            className={cn(
                              "ns-pill",
                              won ? "ns-pill-approved" : "ns-pill-rejected"
                            )}
                          >
                            {won ? "WIN" : "LOSS"}
                          </span>
                        ) : (
                          <span className="ns-pill ns-pill-pending">
                            Round {m.round}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="ns-card rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gold" />
      </div>
      <div>
        <div className="font-display font-black text-2xl text-gold-gradient">
          {value}
        </div>
        <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
