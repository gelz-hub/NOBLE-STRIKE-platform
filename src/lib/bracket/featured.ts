import type { BracketRound, MatchWithTeams } from "./queries";
import type { BracketFormat, FeaturedBracketStage } from "@/lib/types/database";

/**
 * How many teams contest the round a given featured stage starts at.
 * `FULL` means "no filtering — show the whole bracket".
 */
export const FEATURED_STAGE_TEAMS: Record<FeaturedBracketStage, number | null> = {
  FULL: null,
  TOP_64: 64,
  TOP_32: 32,
  TOP_16: 16,
  TOP_8: 8,
  TOP_4: 4,
};

/** Short label, e.g. "Top 16" / "Full Bracket". */
export function featuredStageLabel(stage: FeaturedBracketStage): string {
  const n = FEATURED_STAGE_TEAMS[stage];
  return n == null ? "Full Bracket" : `Top ${n}`;
}

/**
 * Headline shown above the public bracket. Returns `null` for `FULL` (no
 * special framing). The prefix escalates as the field narrows, matching the
 * spec's examples ("Main Event", "Playoffs", "Championship Weekend").
 */
export function mainEventTitle(stage: FeaturedBracketStage): string | null {
  const n = FEATURED_STAGE_TEAMS[stage];
  if (n == null) return null;
  const prefix = n <= 4 ? "Championship Weekend" : n <= 8 ? "Playoffs" : "Main Event";
  return `${prefix} - Top ${n} Teams`;
}

/**
 * Lowest `round_number` in the upper/main bracket whose match count implies
 * `<= targetTeams` contestants. Returns 1 (show everything) when the field is
 * already at or below the target.
 */
function firstFeaturedUpperRound(
  matches: Pick<MatchWithTeams, "bracket_type" | "round_number">[],
  targetTeams: number,
  bracketFormat: BracketFormat
): number {
  const mainType = bracketFormat === "DOUBLE_ELIMINATION" ? "upper" : null;
  const roundMatchCounts = new Map<number, number>();
  for (const m of matches) {
    if (mainType && m.bracket_type !== mainType) continue;
    roundMatchCounts.set(m.round_number, (roundMatchCounts.get(m.round_number) ?? 0) + 1);
  }
  const kept = [...roundMatchCounts.entries()]
    .filter(([, count]) => count * 2 <= targetTeams)
    .map(([round]) => round);
  return kept.length > 0 ? Math.min(...kept) : 1;
}

/**
 * Drops qualifier rounds that fall before the featured stage. Used for the
 * PUBLIC bracket only — admin views always pass `FULL`.
 *
 * Single elimination: keep rounds from `firstFeaturedUpperRound` onward.
 * Double elimination: keep upper rounds from that point, the lower-bracket
 * rounds fed by them (LB "drop" round for UB round `u` is `2*(u-1)`), and
 * always the grand final(s).
 */
export function filterMatchesForFeaturedStage(
  matches: MatchWithTeams[],
  stage: FeaturedBracketStage,
  bracketFormat: BracketFormat
): MatchWithTeams[] {
  const target = FEATURED_STAGE_TEAMS[stage];
  if (target == null || matches.length === 0) return matches;

  const firstUpper = firstFeaturedUpperRound(matches, target, bracketFormat);
  if (firstUpper <= 1) return matches;

  if (bracketFormat !== "DOUBLE_ELIMINATION") {
    return matches.filter((m) => m.round_number >= firstUpper);
  }

  const firstLower = Math.max(1, 2 * (firstUpper - 1));
  return matches.filter((m) => {
    if (m.bracket_type === "grand_final" || m.bracket_type === "grand_final_reset") return true;
    if (m.bracket_type === "lower") return m.round_number >= firstLower;
    if (m.bracket_type === "upper") return m.round_number >= firstUpper;
    return m.round_number >= firstUpper;
  });
}

/** Same as {@link filterMatchesForFeaturedStage} but on the grouped shape. */
export function filterRoundsForFeaturedStage(
  rounds: BracketRound[],
  stage: FeaturedBracketStage,
  bracketFormat: BracketFormat
): BracketRound[] {
  if (FEATURED_STAGE_TEAMS[stage] == null) return rounds;
  const kept = filterMatchesForFeaturedStage(
    rounds.flatMap((r) => r.matches),
    stage,
    bracketFormat
  );
  const byRound = new Map<number, MatchWithTeams[]>();
  for (const m of kept) {
    const list = byRound.get(m.round_number) ?? [];
    list.push(m);
    byRound.set(m.round_number, list);
  }
  return [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round_number, matches]) => ({ round_number, matches }));
}

export interface FeaturedBracketStats {
  /** Teams that registered and were approved into the tournament. */
  registeredTeams: number;
  /** Teams that reach the featured stage (the "main event" field size). */
  qualifiedTeams: number;
  /** Teams knocked out so far (live). */
  eliminatedTeams: number;
  /** Teams still alive in the bracket (live). */
  remainingTeams: number;
}

export function featuredBracketStats(params: {
  stage: FeaturedBracketStage;
  registeredTeams: number;
  /** Live "still alive" count from summarizeBracket(), if a bracket exists. */
  liveRemainingTeams: number | null;
}): FeaturedBracketStats {
  const { stage, registeredTeams } = params;
  const stageTeams = FEATURED_STAGE_TEAMS[stage];
  const qualifiedTeams =
    stageTeams == null ? registeredTeams : Math.min(stageTeams, registeredTeams);

  const remainingTeams = Math.max(
    0,
    Math.min(params.liveRemainingTeams ?? qualifiedTeams, registeredTeams)
  );
  return {
    registeredTeams,
    qualifiedTeams,
    eliminatedTeams: Math.max(0, registeredTeams - remainingTeams),
    remainingTeams,
  };
}
