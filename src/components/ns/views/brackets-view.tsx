"use client";

import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/lib/store";
import { useFetch, apiPut } from "../hooks";
import {
  SectionHeading,
  TeamMonogram,
  GameBadge,
} from "../ui";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Swords,
  Crown,
  ChevronDown,
  Loader2,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tournament, Team, Match } from "@/lib/types";

interface BracketResponse {
  rounds: { round: number; matches: Match[] }[];
  teamCount?: number;
  matches?: Match[];
}

const ROUND_NAMES = (total: number) => (r: number) => {
  const remaining = total - r + 1;
  if (remaining === 1) return "Grand Final";
  if (remaining === 2) return "Semi Finals";
  if (remaining === 3) return "Quarter Finals";
  return `Round ${r}`;
};

export function BracketsView() {
  const { data: tournaments } = useFetch<Tournament[]>("/api/tournaments");
  const adminUnlocked = useApp((s) => s.adminUnlocked);

  const bracketTournaments = (tournaments || []).filter(
    (t) => t.status === "ONGOING" || t.status === "COMPLETED"
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const activeId = selectedId || bracketTournaments[0]?.id || "";
  const active = (tournaments || []).find((t) => t.id === activeId);

  const { data: bracket, loading, reload: reloadBracket } = useFetch<BracketResponse>(
    activeId ? `/api/tournaments/${activeId}/bracket` : null,
    [activeId]
  );

  const rounds = bracket?.rounds || [];
  const totalRounds = rounds.length;

  // Refresh bracket when a match score is updated elsewhere
  useEffect(() => {
    const handler = () => reloadBracket();
    window.addEventListener("ns-reload-bracket", handler);
    return () => window.removeEventListener("ns-reload-bracket", handler);
  }, [reloadBracket]);

  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          kicker="Live Tournament Tree"
          title="Brackets"
          description="Single elimination. Winner advances. One champion remains."
        />

        {/* Tournament selector */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {bracketTournaments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No live or completed tournaments with brackets yet.
            </p>
          ) : (
            bracketTournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all border flex items-center gap-2",
                  activeId === t.id
                    ? "bg-gold/15 border-gold/50 text-gold-light"
                    : "border-gold/15 text-white/60 hover:text-white hover:border-gold/30"
                )}
              >
                {t.status === "ONGOING" && <span className="ns-dot-live" />}
                {t.name}
              </button>
            ))
          )}
        </div>

        {active && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <GameBadge game={active.game} />
            <span className="ns-pill ns-pill-ongoing">{active.format}</span>
            <span className="text-sm text-muted-foreground">
              Prize Pool:{" "}
              <span className="text-gold-light font-semibold">
                {active.prizePool}
              </span>
            </span>
            {adminUnlocked && (
              <span className="ns-pill ns-pill-approved ml-auto">
                <Shield className="w-3 h-3" />
                Admin: click scores to update
              </span>
            )}
          </div>
        )}

        {/* Bracket */}
        {loading ? (
          <div className="mt-12 flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : !activeId ? (
          <div className="mt-12 text-center py-20 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-gold/30" />
            Select a tournament to view its bracket.
          </div>
        ) : rounds.length === 0 ? (
          <div className="mt-12 text-center py-20 text-muted-foreground">
            <Swords className="w-12 h-12 mx-auto mb-4 text-gold/30" />
            No bracket generated for this tournament yet.
            {adminUnlocked && (
              <p className="mt-2 text-sm">
                Generate it from the Admin dashboard.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-10 overflow-x-auto pb-6">
            <div className="flex gap-6 md:gap-10 min-w-max px-1">
              {rounds.map((col) => (
                <div
                  key={col.round}
                  className="flex flex-col gap-4 min-w-[240px]"
                >
                  {/* Round header */}
                  <div className="text-center mb-2">
                    <div className="inline-flex flex-col items-center gap-1">
                      <span className="ns-kicker">
                        {ROUND_NAMES(totalRounds)(col.round)}
                      </span>
                      <span className="h-px w-16 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
                    </div>
                  </div>

                  {/* Matches — vertically distributed */}
                  <div
                    className="flex flex-col justify-around flex-1 gap-4"
                    style={{
                      minHeight: `calc(${Math.pow(2, col.round - 1)} * 110px)`,
                    }}
                  >
                    {col.matches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        adminUnlocked={adminUnlocked}
                        tournamentId={activeId}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Champion column */}
              <div className="flex flex-col items-center min-w-[240px]">
                <div className="text-center mb-2">
                  <div className="inline-flex flex-col items-center gap-1">
                    <span className="ns-kicker">Champion</span>
                    <span className="h-px w-16 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
                  </div>
                </div>
                <ChampionCard rounds={rounds} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  adminUnlocked,
  tournamentId,
}: {
  match: Match;
  adminUnlocked: boolean;
  tournamentId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState(match.scoreA);
  const [scoreB, setScoreB] = useState(match.scoreB);
  const [saving, setSaving] = useState(false);
  const { reload: reloadAll } = useApp.getState();

  const teamA = match.teamA;
  const teamB = match.teamB;
  const done = match.status === "COMPLETED";
  const winnerA = done && match.winnerId === match.teamAId;
  const winnerB = done && match.winnerId === match.teamBId;
  const isBYE = !teamA || !teamB;
  const live = !done && teamA && teamB;

  const save = async () => {
    setSaving(true);
    try {
      const winnerId =
        scoreA > scoreB ? match.teamAId : scoreB > scoreA ? match.teamBId : null;
      if (!winnerId) {
        toast.error("Scores must differ to complete a match.");
        setSaving(false);
        return;
      }
      await apiPut(`/api/matches/${match.id}`, {
        scoreA: Number(scoreA),
        scoreB: Number(scoreB),
        winnerId,
        status: "COMPLETED",
      });
      toast.success("Match updated. Winner advancing...");
      setEditing(false);
      // reload bracket by refetching
      window.dispatchEvent(new Event("ns-reload-bracket"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-gradient-to-br from-[#111] to-[#080808] overflow-hidden transition-all",
        done
          ? "border-gold/25"
          : live
          ? "border-green-400/30 shadow-[0_0_18px_rgba(74,222,128,0.08)]"
          : "border-gold/12"
      )}
    >
      {/* status strip */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gold/10 bg-black/40">
        <span className="text-[0.6rem] font-mono uppercase tracking-wider text-muted-foreground">
          M{match.matchIndex + 1}
        </span>
        {live && (
          <span className="flex items-center gap-1 text-[0.6rem] font-bold uppercase text-green-400">
            <span className="ns-dot-live" />
            Live
          </span>
        )}
        {done && (
          <span className="text-[0.6rem] font-bold uppercase text-gold/70">
            Final
          </span>
        )}
        {isBYE && !done && (
          <span className="text-[0.6rem] font-bold uppercase text-muted-foreground">
            TBD
          </span>
        )}
      </div>

      {/* Team A */}
      <MatchRow
        team={teamA}
        score={scoreA}
        won={winnerA}
        done={done}
        editing={editing && adminUnlocked}
        onScore={setScoreA}
      />
      {/* divider */}
      <div className="h-px bg-gold/10" />
      {/* Team B */}
      <MatchRow
        team={teamB}
        score={scoreB}
        won={winnerB}
        done={done}
        editing={editing && adminUnlocked}
        onScore={setScoreB}
      />

      {/* Admin edit */}
      {adminUnlocked && !done && teamA && teamB && (
        <div className="border-t border-gold/10 px-3 py-2 bg-black/30">
          {editing ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={save}
                disabled={saving}
                className="ns-btn-gold h-7 text-xs flex-1"
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
                Save &amp; Advance
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setScoreA(match.scoreA);
                  setScoreB(match.scoreB);
                }}
                className="h-7 text-xs text-white/60"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full text-[0.65rem] uppercase tracking-wider text-gold/70 hover:text-gold-light font-semibold flex items-center justify-center gap-1"
            >
              <Swords className="w-3 h-3" />
              Enter Score
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MatchRow({
  team,
  score,
  won,
  done,
  editing,
  onScore,
}: {
  team?: Team | null;
  score: number;
  won: boolean;
  done: boolean;
  editing: boolean;
  onScore: (n: number) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 transition-colors",
        won && "bg-gold/8",
        !team && "opacity-40"
      )}
    >
      <TeamMonogram name={team?.name || "?"} logo={team?.logo} size={28} />
      <span
        className={cn(
          "flex-1 text-sm font-heading font-semibold truncate",
          won ? "text-gold-light" : "text-white/80",
          !team && "italic text-muted-foreground"
        )}
      >
        {team?.name || "TBD / BYE"}
      </span>
      {won && <Crown className="w-3.5 h-3.5 text-gold" />}
      {editing ? (
        <input
          type="number"
          min={0}
          max={9}
          value={score}
          onChange={(e) => onScore(Number(e.target.value))}
          className="w-9 h-7 text-center bg-black/60 border border-gold/30 rounded text-white text-sm font-bold outline-none focus:border-gold/60"
        />
      ) : (
        <span
          className={cn(
            "w-7 text-center font-display font-bold",
            done ? (won ? "text-gold-light" : "text-white/50") : "text-white/40"
          )}
        >
          {done ? score : "—"}
        </span>
      )}
    </div>
  );
}

function ChampionCard({ rounds }: { rounds: { round: number; matches: Match[] }[] }) {
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.matches?.[0];
  const championId = finalMatch?.winnerId;
  const champion =
    championId === finalMatch?.teamAId
      ? finalMatch?.teamA
      : championId === finalMatch?.teamBId
      ? finalMatch?.teamB
      : null;

  return (
    <div className="mt-10 relative">
      {champion ? (
        <div className="ns-card ns-card-gold-edge rounded-xl p-6 text-center glow-gold-strong">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-gold/30 rounded-full" />
              <Crown className="w-10 h-10 text-gold relative" />
            </div>
          </div>
          <p className="ns-kicker mb-2">Champion</p>
          <TeamMonogram
            name={champion.name}
            logo={champion.logo}
            size={56}
            className="mx-auto ring-2 ring-gold/40"
          />
          <p className="mt-3 font-display font-black text-lg text-gold-gradient">
            {champion.name}
          </p>
        </div>
      ) : (
        <div className="ns-card rounded-xl p-6 text-center border-dashed">
          <Trophy className="w-10 h-10 text-gold/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            {finalMatch && finalMatch.teamA && finalMatch.teamB
              ? "Awaiting final result"
              : "TBD"}
          </p>
        </div>
      )}
    </div>
  );
}
