import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBracket, getBracketMatches } from "@/lib/bracket/queries";
import { summarizeBracket } from "@/lib/bracket/summary";
import { BracketControls } from "@/components/admin/bracket-controls";
import { BracketView } from "@/components/bracket/bracket-view";
import { GAME_LABELS } from "@/lib/types";
import { ListChecks, Trophy, Users, Zap } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminBracketPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", id).single();
  if (!tournament) notFound();

  const bracket = await getBracket(id);
  const rounds = await getBracketMatches(id);
  const summary = summarizeBracket(rounds, tournament.bracket_format);
  const isDoubleElim = tournament.bracket_format === "DOUBLE_ELIMINATION";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            {tournament.title} — Bracket
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tournament.bracket_format === "SINGLE_ELIMINATION"
              ? "Single Elimination"
              : tournament.bracket_format}{" "}
            · {GAME_LABELS[tournament.game_type] || tournament.game_type}
          </p>
        </div>
        <BracketControls
          tournamentId={id}
          hasBracket={!!bracket}
          isLocked={bracket?.status === "LOCKED"}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Zap}
          label="Bracket Status"
          value={bracket ? (bracket.status === "LOCKED" ? "Locked" : "Active") : "Not Generated"}
        />
        <StatCard icon={ListChecks} label="Match Count" value={String(summary.totalMatches)} />
        <StatCard icon={Users} label="Remaining Teams" value={String(summary.remainingTeams)} />
        <StatCard icon={Trophy} label="Format" value={tournament.format} />
      </div>

      {isDoubleElim && bracket && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Users} label="Upper Bracket Teams" value={String(summary.upperTeams ?? 0)} />
          <StatCard icon={Users} label="Lower Bracket Teams" value={String(summary.lowerTeams ?? 0)} />
          <StatCard icon={Users} label="Eliminated Teams" value={String(summary.eliminatedTeams ?? 0)} />
        </div>
      )}

      {bracket ? (
        <div className="ns-card ns-card-gold-edge rounded-xl p-6 overflow-x-auto">
          <BracketView
            rounds={rounds}
            editable={bracket.status !== "LOCKED"}
            bracketFormat={tournament.bracket_format}
          />
        </div>
      ) : (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <Trophy className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">
            No bracket generated yet. Approve teams, then click Generate Bracket above.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="ns-card rounded-lg p-3 text-center">
      <Icon className="w-4 h-4 text-gold mx-auto mb-1.5" />
      <div className="font-display font-bold text-white truncate">{value}</div>
      <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}
