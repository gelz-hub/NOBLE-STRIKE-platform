import { describe, it, expect } from "vitest";
import {
  FEATURED_STAGE_TEAMS,
  featuredStageLabel,
  mainEventTitle,
  filterRoundsForFeaturedStage,
  filterMatchesForFeaturedStage,
  featuredBracketStats,
} from "@/lib/bracket/featured";
import type { BracketRound, MatchWithTeams } from "@/lib/bracket/queries";

function match(partial: Partial<MatchWithTeams>): MatchWithTeams {
  return {
    id: `${partial.bracket_type ?? "upper"}-${partial.round_number ?? 1}-${partial.match_number ?? 0}`,
    tournament_id: "t1",
    bracket_id: "b1",
    bracket_type: "upper",
    round_number: 1,
    match_number: 0,
    team_a_id: "a",
    team_b_id: "b",
    score_a: 0,
    score_b: 0,
    winner_id: null,
    status: "PENDING",
    best_of: "BO1",
    next_match_winner_id: null,
    next_match_loser_id: null,
    scheduled_at: null,
    stream_url: null,
    lobby_id: null,
    lobby_password: null,
    referee_id: null,
    admin_notes: null,
    result_notes: null,
    evidence_urls: [],
    created_at: "",
    updated_at: "",
    team_a: null,
    team_b: null,
    winner: null,
    ...partial,
  } as MatchWithTeams;
}

/** Single-elimination rounds for a padded bracket of `paddedSize` teams. */
function singleElimRounds(paddedSize: number): BracketRound[] {
  const rounds: BracketRound[] = [];
  const totalRounds = Math.log2(paddedSize);
  for (let r = 1; r <= totalRounds; r++) {
    const count = paddedSize / 2 ** r;
    rounds.push({
      round_number: r,
      matches: Array.from({ length: count }, (_, mi) =>
        match({ bracket_type: "upper", round_number: r, match_number: mi })
      ),
    });
  }
  return rounds;
}

describe("featured stage metadata", () => {
  it("maps stages to team counts", () => {
    expect(FEATURED_STAGE_TEAMS.FULL).toBeNull();
    expect(FEATURED_STAGE_TEAMS.TOP_16).toBe(16);
    expect(FEATURED_STAGE_TEAMS.TOP_4).toBe(4);
  });

  it("labels stages", () => {
    expect(featuredStageLabel("FULL")).toBe("Full Bracket");
    expect(featuredStageLabel("TOP_32")).toBe("Top 32");
  });

  it("builds an escalating main-event headline", () => {
    expect(mainEventTitle("FULL")).toBeNull();
    expect(mainEventTitle("TOP_16")).toBe("Main Event - Top 16 Teams");
    expect(mainEventTitle("TOP_8")).toBe("Playoffs - Top 8 Teams");
    expect(mainEventTitle("TOP_4")).toBe("Championship Weekend - Top 4 Teams");
  });
});

describe("filterRoundsForFeaturedStage (single elimination)", () => {
  it("FULL returns every round untouched", () => {
    const rounds = singleElimRounds(256);
    expect(filterRoundsForFeaturedStage(rounds, "FULL", "SINGLE_ELIMINATION")).toBe(rounds);
  });

  it("TOP_16 on a 256-team bracket keeps only the round of 16 onward", () => {
    const rounds = singleElimRounds(256);
    const filtered = filterRoundsForFeaturedStage(rounds, "TOP_16", "SINGLE_ELIMINATION");
    // rounds of 16, 8, 4, 2 -> 4 rounds; first is the round with 8 matches.
    expect(filtered.map((r) => r.round_number)).toEqual([5, 6, 7, 8]);
    expect(filtered[0].matches).toHaveLength(8);
  });

  it("TOP_64 on a smaller 32-team bracket is a no-op (field already below target)", () => {
    const rounds = singleElimRounds(32);
    const filtered = filterRoundsForFeaturedStage(rounds, "TOP_64", "SINGLE_ELIMINATION");
    expect(filtered.map((r) => r.round_number)).toEqual([1, 2, 3, 4, 5]);
  });

  it("TOP_4 keeps just the semifinals and final", () => {
    const rounds = singleElimRounds(128);
    const filtered = filterRoundsForFeaturedStage(rounds, "TOP_4", "SINGLE_ELIMINATION");
    expect(filtered).toHaveLength(2);
    expect(filtered.at(-1)?.matches).toHaveLength(1);
  });
});

describe("filterMatchesForFeaturedStage (double elimination)", () => {
  function doubleElimMatches(paddedSize: number): MatchWithTeams[] {
    const k = Math.log2(paddedSize);
    const out: MatchWithTeams[] = [];
    for (let r = 1; r <= k; r++) {
      for (let mi = 0; mi < paddedSize / 2 ** r; mi++) {
        out.push(match({ bracket_type: "upper", round_number: r, match_number: mi }));
      }
    }
    for (let r = 1; r <= 2 * (k - 1); r++) {
      out.push(match({ bracket_type: "lower", round_number: r, match_number: 0 }));
    }
    out.push(match({ bracket_type: "grand_final", round_number: 1, match_number: 0 }));
    return out;
  }

  it("keeps the grand final and drops early qualifier rounds for TOP_16", () => {
    const matches = doubleElimMatches(256);
    const filtered = filterMatchesForFeaturedStage(matches, "TOP_16", "DOUBLE_ELIMINATION");
    expect(filtered.some((m) => m.bracket_type === "grand_final")).toBe(true);
    expect(filtered.some((m) => m.bracket_type === "upper" && m.round_number === 1)).toBe(false);
    expect(filtered.some((m) => m.bracket_type === "upper" && m.round_number === 5)).toBe(true);
    expect(filtered.some((m) => m.bracket_type === "lower" && m.round_number === 1)).toBe(false);
  });

  it("FULL keeps everything", () => {
    const matches = doubleElimMatches(64);
    expect(filterMatchesForFeaturedStage(matches, "FULL", "DOUBLE_ELIMINATION")).toBe(matches);
  });
});

describe("featuredBracketStats", () => {
  it("matches the spec example: 256 registered, Top 16 featured", () => {
    const stats = featuredBracketStats({
      stage: "TOP_16",
      registeredTeams: 256,
      liveRemainingTeams: 16,
    });
    expect(stats).toEqual({
      registeredTeams: 256,
      qualifiedTeams: 16,
      eliminatedTeams: 240,
      remainingTeams: 16,
    });
  });

  it("tracks live eliminations as the bracket progresses", () => {
    const stats = featuredBracketStats({
      stage: "TOP_16",
      registeredTeams: 256,
      liveRemainingTeams: 200,
    });
    expect(stats.remainingTeams).toBe(200);
    expect(stats.eliminatedTeams).toBe(56);
  });

  it("FULL stage qualifies everyone", () => {
    const stats = featuredBracketStats({
      stage: "FULL",
      registeredTeams: 32,
      liveRemainingTeams: null,
    });
    expect(stats.qualifiedTeams).toBe(32);
    expect(stats.remainingTeams).toBe(32);
    expect(stats.eliminatedTeams).toBe(0);
  });
});
