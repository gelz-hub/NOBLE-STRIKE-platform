import { MatchCard } from "./match-card";
import type { BracketRound, MatchWithTeams } from "@/lib/bracket/queries";
import type { BracketFormat } from "@/lib/types/database";

function roundLabel(roundNumber: number, totalRounds: number, prefix?: string): string {
  const fromEnd = totalRounds - roundNumber;
  const base =
    fromEnd === 0 ? "Final" : fromEnd === 1 ? "Semifinals" : fromEnd === 2 ? "Quarterfinals" : `Round ${roundNumber}`;
  return prefix ? `${prefix} ${base}` : base;
}

function lowerRoundLabel(roundNumber: number): string {
  return `LB Round ${roundNumber}`;
}

function RoundsRow({
  rounds,
  editable,
  labelFor,
}: {
  rounds: BracketRound[];
  editable: boolean;
  labelFor: (roundNumber: number) => string;
}) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((round) => (
        <div key={round.round_number} className="flex flex-col gap-4 min-w-[220px] shrink-0">
          <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light text-center">
            {labelFor(round.round_number)}
          </p>
          <div
            className="flex flex-col justify-around flex-1 gap-4"
            style={{ minHeight: `${round.matches.length * 76}px` }}
          >
            {round.matches.map((match) => (
              <MatchCard key={match.id} match={match} editable={editable} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function toRounds(matches: MatchWithTeams[]): BracketRound[] {
  const byRound = new Map<number, MatchWithTeams[]>();
  for (const m of matches) {
    const list = byRound.get(m.round_number) ?? [];
    list.push(m);
    byRound.set(m.round_number, list);
  }
  return Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round_number, roundMatches]) => ({ round_number, matches: roundMatches }));
}

interface BracketViewProps {
  rounds: BracketRound[];
  editable?: boolean;
  bracketFormat?: BracketFormat;
}

export function BracketView({ rounds, editable = false, bracketFormat = "SINGLE_ELIMINATION" }: BracketViewProps) {
  if (rounds.length === 0) return null;

  if (bracketFormat === "SINGLE_ELIMINATION") {
    return (
      <RoundsRow
        rounds={rounds}
        editable={editable}
        labelFor={(r) => roundLabel(r, rounds.length)}
      />
    );
  }

  const allMatches = rounds.flatMap((r) => r.matches);
  const upper = toRounds(allMatches.filter((m) => m.bracket_type === "upper"));
  const lower = toRounds(allMatches.filter((m) => m.bracket_type === "lower"));
  const grandFinal = toRounds(
    allMatches.filter((m) => m.bracket_type === "grand_final" || m.bracket_type === "grand_final_reset")
  );

  return (
    <div className="space-y-10">
      <div>
        <p className="ns-kicker mb-3">Upper Bracket</p>
        <RoundsRow rounds={upper} editable={editable} labelFor={(r) => roundLabel(r, upper.length, "UB")} />
      </div>
      {lower.length > 0 && (
        <div>
          <p className="ns-kicker mb-3">Lower Bracket</p>
          <RoundsRow rounds={lower} editable={editable} labelFor={lowerRoundLabel} />
        </div>
      )}
      {grandFinal.length > 0 && (
        <div>
          <p className="ns-kicker mb-3">Grand Final</p>
          <RoundsRow
            rounds={grandFinal}
            editable={editable}
            labelFor={(r) => (r === 1 ? "Grand Final" : "Grand Final Reset")}
          />
        </div>
      )}
    </div>
  );
}
