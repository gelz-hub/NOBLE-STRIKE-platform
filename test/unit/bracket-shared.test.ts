import { describe, it, expect } from "vitest";
import {
  nextPowerOf2,
  buildRound1Slots,
  determineAdvanceSlot,
  validateBracketIntegrity,
} from "@/lib/bracket/shared";

describe("nextPowerOf2", () => {
  it("returns the same value for exact powers of 2", () => {
    expect(nextPowerOf2(2)).toBe(2);
    expect(nextPowerOf2(8)).toBe(8);
    expect(nextPowerOf2(128)).toBe(128);
  });

  it("rounds up to the next power of 2 for non-powers", () => {
    expect(nextPowerOf2(3)).toBe(4);
    expect(nextPowerOf2(5)).toBe(8);
    expect(nextPowerOf2(9)).toBe(16);
    expect(nextPowerOf2(100)).toBe(128);
  });

  it("returns 1 for 0 or 1 teams", () => {
    expect(nextPowerOf2(0)).toBe(1);
    expect(nextPowerOf2(1)).toBe(1);
  });
});

describe("buildRound1Slots (bye generation)", () => {
  it("places no byes when team count is already a power of 2", () => {
    const teams = ["a", "b", "c", "d"];
    const slots = buildRound1Slots(teams, 4);
    expect(slots.filter((s) => s === null)).toHaveLength(0);
    expect(slots).toHaveLength(4);
  });

  it("pads with exactly the right number of byes for a non-power-of-2 count", () => {
    const teams = ["a", "b", "c"]; // padded to 4 -> 1 bye
    const slots = buildRound1Slots(teams, 4);
    expect(slots.filter((s) => s === null)).toHaveLength(1);
    expect(slots.filter((s) => s !== null)).toHaveLength(3);
  });

  it("never pairs two byes together", () => {
    // 5 teams padded to 8 -> 3 byes. If two byes ever share a pair, that
    // pair would be [null, null].
    const teams = ["a", "b", "c", "d", "e"];
    const slots = buildRound1Slots(teams, 8);
    for (let p = 0; p < slots.length / 2; p++) {
      const pair = [slots[p * 2], slots[p * 2 + 1]];
      expect(pair).not.toEqual([null, null]);
    }
  });

  it("handles the maximum realistic bye ratio (paddedSize just above half-full) without collision", () => {
    // buildRound1Slots's no-double-bye guarantee assumes paddedSize was
    // derived via nextPowerOf2(teamCount) — byeCount < pairCount only holds
    // under that precondition (paddedSize is the *smallest* power of 2 that
    // fits teamCount). 5 teams -> nextPowerOf2 = 8 is the worst realistic
    // case (3 byes against 4 pairs).
    const teams = ["a", "b", "c", "d", "e"];
    const slots = buildRound1Slots(teams, nextPowerOf2(teams.length));
    expect(nextPowerOf2(teams.length)).toBe(8);
    expect(slots.filter((s) => s !== null)).toHaveLength(5);
    expect(slots.filter((s) => s === null)).toHaveLength(3);
    for (let p = 0; p < slots.length / 2; p++) {
      expect([slots[p * 2], slots[p * 2 + 1]]).not.toEqual([null, null]);
    }
  });
});

describe("determineAdvanceSlot (match advancement)", () => {
  it("routes winners to team_a_id on even source match numbers targeting upper bracket", () => {
    const slot = determineAdvanceSlot(
      { bracket_type: "upper", match_number: 0 },
      { bracket_type: "upper", round_number: 2 },
      "winner"
    );
    expect(slot).toBe("team_a_id");
  });

  it("routes winners to team_b_id on odd source match numbers targeting upper bracket", () => {
    const slot = determineAdvanceSlot(
      { bracket_type: "upper", match_number: 1 },
      { bracket_type: "upper", round_number: 2 },
      "winner"
    );
    expect(slot).toBe("team_b_id");
  });

  it("upper bracket champion lands in team_a_id of the grand final", () => {
    const slot = determineAdvanceSlot(
      { bracket_type: "upper", match_number: 0 },
      { bracket_type: "grand_final", round_number: 1 },
      "winner"
    );
    expect(slot).toBe("team_a_id");
  });

  it("lower bracket champion lands in team_b_id of the grand final", () => {
    const slot = determineAdvanceSlot(
      { bracket_type: "lower", match_number: 0 },
      { bracket_type: "grand_final", round_number: 1 },
      "winner"
    );
    expect(slot).toBe("team_b_id");
  });

  it("grand final reset winner slot follows the same upper/lower origin rule", () => {
    const slot = determineAdvanceSlot(
      { bracket_type: "lower", match_number: 0 },
      { bracket_type: "grand_final_reset", round_number: 2 },
      "winner"
    );
    expect(slot).toBe("team_b_id");
  });

  it("lower bracket seed round (round 1) pairs by even/odd match number", () => {
    const evenSlot = determineAdvanceSlot(
      { bracket_type: "upper", match_number: 0 },
      { bracket_type: "lower", round_number: 1 },
      "loser"
    );
    const oddSlot = determineAdvanceSlot(
      { bracket_type: "upper", match_number: 1 },
      { bracket_type: "lower", round_number: 1 },
      "loser"
    );
    expect(evenSlot).toBe("team_a_id");
    expect(oddSlot).toBe("team_b_id");
  });

  it("drop rounds always put the incoming loser in team_b_id", () => {
    const slot = determineAdvanceSlot(
      { bracket_type: "upper", match_number: 0 },
      { bracket_type: "lower", round_number: 2 }, // even round = drop round
      "loser"
    );
    expect(slot).toBe("team_b_id");
  });

  it("drop rounds always put the incoming lower-bracket winner in team_a_id", () => {
    const slot = determineAdvanceSlot(
      { bracket_type: "lower", match_number: 0 },
      { bracket_type: "lower", round_number: 2 },
      "winner"
    );
    expect(slot).toBe("team_a_id");
  });
});

describe("validateBracketIntegrity", () => {
  const base = {
    team_a_id: "a",
    team_b_id: "b",
    next_match_winner_id: null,
    next_match_loser_id: null,
  };

  it("passes for a minimal valid 2-team bracket (single terminal match)", () => {
    const matches = [{ id: "m1", bracket_type: "upper", round_number: 1, match_number: 0, ...base }];
    expect(validateBracketIntegrity(matches)).toEqual([]);
  });

  it("flags a broken winner link", () => {
    const matches = [
      { id: "m1", bracket_type: "upper", round_number: 1, match_number: 0, ...base, next_match_winner_id: "missing" },
    ];
    const problems = validateBracketIntegrity(matches);
    expect(problems.some((p) => p.includes("broken winner link"))).toBe(true);
  });

  it("flags a team appearing twice in round 1", () => {
    const matches = [
      { id: "m1", bracket_type: "upper", round_number: 1, match_number: 0, team_a_id: "a", team_b_id: "b", next_match_winner_id: "m3", next_match_loser_id: null },
      { id: "m2", bracket_type: "upper", round_number: 1, match_number: 1, team_a_id: "a", team_b_id: "c", next_match_winner_id: "m3", next_match_loser_id: null },
      { id: "m3", bracket_type: "upper", round_number: 2, match_number: 0, team_a_id: null, team_b_id: null, next_match_winner_id: null, next_match_loser_id: null },
    ];
    const problems = validateBracketIntegrity(matches);
    expect(problems.some((p) => p.includes("appears in round 1 twice"))).toBe(true);
  });

  it("flags more than one terminal match", () => {
    const matches = [
      { id: "m1", bracket_type: "upper", round_number: 1, match_number: 0, ...base },
      { id: "m2", bracket_type: "upper", round_number: 1, match_number: 1, ...base },
    ];
    const problems = validateBracketIntegrity(matches);
    expect(problems.some((p) => p.includes("Expected exactly 1 terminal match"))).toBe(true);
  });
});
