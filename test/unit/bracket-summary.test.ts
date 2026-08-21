import { describe, it, expect } from "vitest";
import { summarizeBracket } from "@/lib/bracket/summary";
import type { BracketRound, MatchWithTeams } from "@/lib/bracket/queries";

function m(partial: Partial<MatchWithTeams>): MatchWithTeams {
  return {
    id: "m",
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

describe("summarizeBracket (single elimination)", () => {
  it("counts total teams from round 1 and reports round 1 as current when nothing is decided", () => {
    const rounds: BracketRound[] = [
      { round_number: 1, matches: [m({ round_number: 1, match_number: 0 }), m({ round_number: 1, match_number: 1 })] },
      { round_number: 2, matches: [m({ round_number: 2, match_number: 0, team_a_id: null, team_b_id: null })] },
    ];
    const summary = summarizeBracket(rounds, "SINGLE_ELIMINATION");
    expect(summary.totalTeams).toBe(4);
    expect(summary.totalMatches).toBe(3);
    expect(summary.completedMatches).toBe(0);
    expect(summary.currentRound).toBe(1);
  });

  it("advances currentRound once round 1 is fully completed and round 2 has two real teams in progress", () => {
    const rounds: BracketRound[] = [
      {
        round_number: 1,
        matches: [
          m({ round_number: 1, match_number: 0, status: "COMPLETED", winner_id: "a" }),
          m({ round_number: 1, match_number: 1, status: "COMPLETED", winner_id: "c" }),
        ],
      },
      { round_number: 2, matches: [m({ round_number: 2, match_number: 0, team_a_id: "a", team_b_id: "c", status: "PENDING" })] },
    ];
    const summary = summarizeBracket(rounds, "SINGLE_ELIMINATION");
    expect(summary.currentRound).toBe(2);
  });

  it("does not count a bye auto-win as a real elimination", () => {
    const rounds: BracketRound[] = [
      { round_number: 1, matches: [m({ round_number: 1, match_number: 0, team_a_id: "a", team_b_id: null, status: "COMPLETED", winner_id: "a" })] },
    ];
    const summary = summarizeBracket(rounds, "SINGLE_ELIMINATION");
    expect(summary.completedMatches).toBe(1);
    expect(summary.remainingTeams).toBe(1); // the only real team, not eliminated
  });
});

describe("summarizeBracket (double elimination)", () => {
  it("separates upper/lower/eliminated counts", () => {
    const rounds: BracketRound[] = [
      {
        round_number: 1,
        matches: [
          m({ round_number: 1, match_number: 0, bracket_type: "upper", status: "COMPLETED", winner_id: "a" }),
          m({ round_number: 1, match_number: 1, bracket_type: "upper", team_a_id: "c", team_b_id: "d" }),
        ],
      },
      {
        round_number: 2,
        matches: [
          m({ round_number: 2, match_number: 0, bracket_type: "lower", team_a_id: "b", team_b_id: null, status: "PENDING" }),
        ],
      },
    ];
    const summary = summarizeBracket(rounds, "DOUBLE_ELIMINATION");
    expect(summary.totalTeams).toBe(4);
    expect(summary.upperTeams).toBe(3); // 4 total - 1 decided upper match
    expect(summary.eliminatedTeams).toBe(0); // no completed lower match yet
  });
});
