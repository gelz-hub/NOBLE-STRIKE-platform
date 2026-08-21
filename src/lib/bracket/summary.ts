import type { BracketRound } from "./queries";
import type { BracketFormat } from "@/lib/types/database";

export interface BracketSummary {
  totalMatches: number;
  completedMatches: number;
  totalTeams: number;
  remainingTeams: number;
  currentRound: number;
  totalRounds: number;
  // Double elimination only:
  upperTeams?: number;
  lowerTeams?: number;
  eliminatedTeams?: number;
}

export function summarizeBracket(
  rounds: BracketRound[],
  bracketFormat: BracketFormat = "SINGLE_ELIMINATION"
): BracketSummary {
  const allMatches = rounds.flatMap((r) => r.matches);
  const totalMatches = allMatches.length;
  const completedMatches = allMatches.filter((m) => m.status === "COMPLETED").length;

  if (bracketFormat === "DOUBLE_ELIMINATION") {
    const upperMatches = allMatches.filter((m) => m.bracket_type === "upper");
    const lowerMatches = allMatches.filter((m) => m.bracket_type === "lower");
    const grandFinalMatches = allMatches.filter(
      (m) => m.bracket_type === "grand_final" || m.bracket_type === "grand_final_reset"
    );

    const round1 = rounds.find((r) => r.round_number === 1 && r.matches.some((m) => m.bracket_type === "upper"));
    const totalTeams = round1
      ? round1.matches
          .filter((m) => m.bracket_type === "upper")
          .reduce((n, m) => n + (m.team_a_id ? 1 : 0) + (m.team_b_id ? 1 : 0), 0)
      : 0;

    const upperDecided = upperMatches.filter((m) => m.status === "COMPLETED" && m.team_a_id && m.team_b_id).length;
    const lowerEliminated = lowerMatches.filter((m) => m.status === "COMPLETED" && m.team_a_id && m.team_b_id).length;

    const upperTeams = Math.max(0, totalTeams - upperDecided);
    const eliminatedTeams = lowerEliminated;
    const lowerTeams = Math.max(0, upperDecided - lowerEliminated);
    const remainingTeams = Math.max(0, totalTeams - eliminatedTeams);

    const upperRounds = rounds.filter((r) => r.matches.some((m) => m.bracket_type === "upper"));
    const totalUpperRounds = upperRounds.length;
    const inProgressUpper = upperRounds.find((r) =>
      r.matches.some((m) => m.team_a_id && m.team_b_id && m.status !== "COMPLETED")
    );
    const grandFinalDecided = grandFinalMatches.some((m) => m.status === "COMPLETED");
    const currentRound = grandFinalDecided
      ? totalUpperRounds
      : inProgressUpper?.round_number ?? totalUpperRounds;

    return {
      totalMatches,
      completedMatches,
      totalTeams,
      remainingTeams,
      currentRound,
      totalRounds: totalUpperRounds,
      upperTeams,
      lowerTeams,
      eliminatedTeams,
    };
  }

  const totalRounds = rounds.length;
  const round1 = rounds.find((r) => r.round_number === 1);
  const totalTeams = round1
    ? round1.matches.reduce((n, m) => n + (m.team_a_id ? 1 : 0) + (m.team_b_id ? 1 : 0), 0)
    : 0;

  // Only matches with two real teams eliminate someone — bye auto-wins don't.
  const realEliminations = allMatches.filter(
    (m) => m.status === "COMPLETED" && m.team_a_id && m.team_b_id
  ).length;
  const remainingTeams = Math.max(0, totalTeams - realEliminations);

  const inProgressRound = rounds.find((r) =>
    r.matches.some((m) => m.team_a_id && m.team_b_id && m.status !== "COMPLETED")
  );
  const currentRound = inProgressRound?.round_number ?? totalRounds;

  return { totalMatches, completedMatches, totalTeams, remainingTeams, currentRound, totalRounds };
}
