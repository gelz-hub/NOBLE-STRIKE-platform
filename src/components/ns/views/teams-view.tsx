"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useFetch } from "../hooks";
import {
  SectionHeading,
  StatusPill,
  TeamMonogram,
  NSCardSkeleton,
  Reveal,
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
  Medal,
  Shield,
  Search,
  ChevronDown,
  Target,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team, Tournament, Achievement, Match, Registration } from "@/lib/types";

type SortKey = "newest" | "alphabetical" | "tournaments";

export function TeamsView() {
  const selectedId = useApp((s) => s.selectedTeamId);
  const [tournamentFilter, setTournamentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("APPROVED");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  const [showReg, setShowReg] = useState(false);

  // Fetch all teams (no status filter so we can filter client-side for the admin view too)
  const { data: teams, loading } = useFetch<Team[]>("/api/teams?status=ALL");
  const { data: tournaments } = useFetch<Tournament[]>("/api/tournaments");

  const filtered = useMemo(() => {
    let list = (teams || []).slice();
    // status filter
    if (statusFilter !== "ALL") {
      list = list.filter((t) => t.status === statusFilter);
    }
    // tournament filter
    if (tournamentFilter !== "ALL") {
      list = list.filter((t) =>
        (t.registrations || []).some(
          (r) => r.tournamentId === tournamentFilter && r.status === "APPROVED"
        )
      );
    }
    // search
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.tag || "").toLowerCase().includes(q) ||
          (t.captainName || "").toLowerCase().includes(q)
      );
    }
    // sort
    list.sort((a, b) => {
      if (sortKey === "alphabetical") return a.name.localeCompare(b.name);
      if (sortKey === "tournaments")
        return (
          (b.registrations || []).length - (a.registrations || []).length
        );
      // newest
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    return list;
  }, [teams, statusFilter, tournamentFilter, query, sortKey]);

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
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <SectionHeading
              kicker="The Contenders"
              title="Teams"
              description="Elite rosters competing across multiple tournaments. Filter, search, and discover your next rival."
            />
            <Button
              onClick={() => setShowReg(true)}
              className="ns-btn-gold h-11 px-6 self-start md:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              Register Team
            </Button>
          </div>
        </Reveal>

        {/* Filters */}
        <Reveal delay={100}>
          <div className="mt-10 ns-card rounded-xl p-4 space-y-4">
            {/* Search + sort */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by team name, tag, or captain..."
                  className="w-full h-10 pl-10 pr-4 rounded-md bg-black/40 border border-gold/20 focus:border-gold/50 text-sm placeholder:text-muted-foreground outline-none"
                />
              </div>
              <SortDropdown value={sortKey} onChange={setSortKey} />
            </div>
            {/* Tournament + status filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground mr-1">
                Tournament:
              </span>
              <FilterChip
                active={tournamentFilter === "ALL"}
                onClick={() => setTournamentFilter("ALL")}
              >
                All Tournaments
              </FilterChip>
              {(tournaments || []).map((t) => (
                <FilterChip
                  key={t.id}
                  active={tournamentFilter === t.id}
                  onClick={() => setTournamentFilter(t.id)}
                >
                  {t.name}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground mr-1">
                Status:
              </span>
              {(["ALL", "APPROVED", "PENDING", "REJECTED"] as const).map((s) => (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </FilterChip>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Results count */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="text-gold-light font-semibold">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "team" : "teams"} found
          </p>
        </div>

        {/* Grid */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <NSCardSkeleton key={i} className="h-28" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 text-gold/30" />
              No teams match your filters.
            </div>
          ) : (
            filtered.map((t, i) => (
              <Reveal key={t.id} delay={Math.min(i * 50, 300)}>
                <TeamCard team={t} onClick={() => useApp.getState().openTeam(t.id)} />
              </Reveal>
            ))
          )}
        </div>
      </div>

      {showReg && (
        <TeamRegistrationForm
          onClose={() => setShowReg(false)}
          onSuccess={() => setShowReg(false)}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-xs font-heading font-semibold uppercase tracking-wider transition-all border",
        active
          ? "bg-gold/15 border-gold/50 text-gold-light"
          : "border-gold/15 text-white/60 hover:text-white hover:border-gold/30"
      )}
    >
      {children}
    </button>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const labels: Record<SortKey, string> = {
    newest: "Newest Registration",
    alphabetical: "Alphabetical (A-Z)",
    tournaments: "Most Tournaments",
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-10 px-4 rounded-md bg-black/40 border border-gold/20 hover:border-gold/50 text-sm text-white/80 min-w-[200px] justify-between"
      >
        <span className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold/60" />
          {labels[value]}
        </span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-full z-50 glass-dark rounded-md border border-gold/20 overflow-hidden">
            {(Object.keys(labels) as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm hover:bg-gold/10 transition-colors",
                  value === k ? "text-gold-light bg-gold/5" : "text-white/70"
                )}
              >
                {labels[k]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ============ Team Profile ============ */

function TeamProfile({ team }: { team: Team }) {
  const openTeam = useApp((s) => s.openTeam);
  const setView = useApp((s) => s.setView);
  const { data: tournaments } = useFetch<Tournament[]>("/api/tournaments");
  const { data: fullTeam } = useFetch<
    Team & { matches?: Match[]; registrations?: Registration[] }
  >(`/api/teams/${team.id}`);

  const roster = [
    { ign: team.player1, role: "Player 1", captain: true },
    { ign: team.player2, role: "Player 2", captain: false },
    { ign: team.player3, role: "Player 3", captain: false },
    { ign: team.player4, role: "Player 4", captain: false },
    { ign: team.player5, role: "Player 5", captain: false },
    { ign: team.substitute, role: "Substitute", captain: false },
  ].filter((p) => p.ign);

  const achievements = fullTeam?.achievements || team.achievements || [];
  const matches = fullTeam?.matches || [];
  const regs = fullTeam?.registrations || team.registrations || [];
  const approvedRegs = regs.filter((r) => r.status === "APPROVED");

  const wins = matches.filter((m) => m.winnerId === team.id).length;
  const completedMatches = matches.filter((m) => m.status === "COMPLETED");
  const losses = completedMatches.filter(
    (m) => m.winnerId && m.winnerId !== team.id
  ).length;
  const winRate =
    completedMatches.length > 0
      ? Math.round((wins / completedMatches.length) * 100)
      : 0;

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
                <StatusPill status={team.status} />
                {team.region && (
                  <span className="text-xs text-muted-foreground">
                    {team.region}
                  </span>
                )}
              </div>
              <h1 className="font-display font-black text-3xl md:text-5xl text-white text-glow-gold truncate">
                {team.name}
                {team.tag && (
                  <span className="ml-3 text-xl text-gold/60 font-heading">
                    [{team.tag}]
                  </span>
                )}
              </h1>
            </div>
          </div>
        </div>

        {/* Description */}
        {team.description && (
          <div className="mt-6 ns-card rounded-xl p-5">
            <p className="text-sm md:text-base text-white/80 leading-relaxed">
              {team.description}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatBox icon={Trophy} label="Wins" value={wins} />
          <StatBox icon={Swords} label="Matches" value={completedMatches.length} />
          <StatBox
            icon={TrendingUp}
            label="Win Rate"
            value={`${winRate}%`}
          />
          <StatBox icon={Medal} label="Trophies" value={achievements.length} />
          <StatBox icon={Target} label="Tournaments" value={approvedRegs.length} />
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
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-semibold text-white truncate">
                      {p.ign}
                    </p>
                    <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                      {p.role}
                    </p>
                  </div>
                  {p.captain && (
                    <span className="ns-pill ns-pill-ongoing text-[0.6rem]">
                      <Shield className="w-3 h-3" />
                      Captain
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
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

            {/* Win rate visualization */}
            <div className="ns-card rounded-xl p-5">
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground mb-3">
                Performance
              </p>
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-3xl text-gold-gradient">
                  {winRate}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {wins}W - {losses}L
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#92783D] via-[#D5BE77] to-[#E6D69A] rounded-full"
                  style={{ width: `${winRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Participation */}
        {approvedRegs.length > 0 && (
          <div className="mt-6 ns-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                <Target className="w-4.5 h-4.5 text-gold" />
              </div>
              <h2 className="font-display font-bold text-xl text-white">
                Tournament Participation
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {approvedRegs.map((r) => {
                const t = r.tournament || (tournaments || []).find((x) => x.id === r.tournamentId);
                if (!t) return null;
                return (
                  <button
                    key={r.id}
                    onClick={() => useApp.getState().openTournament(t.id)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-gold/10 hover:border-gold/40 transition-colors text-left"
                  >
                    <Trophy className="w-5 h-5 text-gold shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-white text-sm truncate">
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.prizePool} · {t.format}
                      </p>
                    </div>
                    <StatusPill status={t.status} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="mt-6 ns-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                <Medal className="w-4.5 h-4.5 text-gold" />
              </div>
              <h2 className="font-display font-bold text-xl text-white">
                Achievements &amp; Placements
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
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {matches.slice(0, 10).map((m) => {
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
                        done ? (won ? "bg-green-400" : "bg-red-400") : "bg-gold/40"
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
  value: number | string;
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
