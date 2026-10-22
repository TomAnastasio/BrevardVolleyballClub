import { describe, expect, it } from "vitest";
import { tournamentStageLabel, tournamentTagFor } from "./tournamentGameTag.js";

const tournament = { id: "t1", name: "Queen of Paradise" };

describe("tournamentStageLabel", () => {
  it("says just 'Pool play' when the division had one round", () => {
    expect(tournamentStageLabel("pool", 1, false)).toBe("Pool play");
  });

  it("numbers the round once the division had a second round", () => {
    expect(tournamentStageLabel("pool", 1, true)).toBe("Pool play · Round 1");
    expect(tournamentStageLabel("pool", 2, true)).toBe("Pool play · Round 2");
  });

  it("labels finals", () => {
    expect(tournamentStageLabel("final", 1, true)).toBe("Final");
  });
});

describe("tournamentTagFor", () => {
  it("returns null for a regular game", () => {
    expect(tournamentTagFor({ tournament_matches: null })).toBeNull();
    expect(tournamentTagFor({ tournament_matches: [] })).toBeNull();
    expect(tournamentTagFor({})).toBeNull();
  });

  it("returns null when the tournament itself isn't visible", () => {
    expect(tournamentTagFor({ tournament_matches: { stage: "pool", round: 1, tournament: null } })).toBeNull();
  });

  it("tags a single-round pool game", () => {
    const row = {
      tournament_matches: { stage: "pool", round: 1, tournament, division: { pools: [{ round: 1 }, { round: 1 }] } },
    };
    expect(tournamentTagFor(row)).toEqual({ tournamentId: "t1", name: "Queen of Paradise", label: "Pool play" });
  });

  it("numbers rounds when the division has round 2 pools, and accepts a list", () => {
    const row = {
      tournament_matches: [{ stage: "pool", round: 1, tournament, division: { pools: [{ round: 1 }, { round: 2 }] } }],
    };
    expect(tournamentTagFor(row).label).toBe("Pool play · Round 1");
  });

  it("tags a final", () => {
    const row = { tournament_matches: { stage: "final", round: 1, tournament, division: { pools: [{ round: 2 }] } } };
    expect(tournamentTagFor(row).label).toBe("Final");
  });
});
