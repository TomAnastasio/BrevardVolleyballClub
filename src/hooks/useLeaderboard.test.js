import { describe, expect, it } from "vitest";
import { assignTiers, divisionForIndex } from "./useLeaderboard.js";

describe("divisionForIndex", () => {
  it("never puts two indices of a 3-person group in the same division", () => {
    // Regression test for the production bug (commit 1dd0543): independent
    // ceil() cutoffs collapsed #2 and #3 into the same division.
    const divisions = [0, 1, 2].map((i) => divisionForIndex(i, 3));
    expect(new Set(divisions).size).toBe(3);
  });

  it("never produces a duplicate or empty division for any small group size", () => {
    for (let groupSize = 1; groupSize <= 10; groupSize++) {
      const divisions = Array.from({ length: groupSize }, (_, i) => divisionForIndex(i, groupSize));
      expect(new Set(divisions).size).toBe(Math.min(groupSize, 3));
    }
  });

  it("ranks the best players (lowest index) into the highest division", () => {
    expect(divisionForIndex(0, 10)).toBe(3);
    expect(divisionForIndex(9, 10)).toBe(1);
  });
});

describe("assignTiers", () => {
  it("assigns the literal top 3 players the top3 tier regardless of percentile", () => {
    const players = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const tiers = assignTiers(players);
    expect(tiers.get(players[0]).tier).toBe("top3");
    expect(tiers.get(players[1]).tier).toBe("top3");
    expect(tiers.get(players[2]).tier).toBe("top3");
    expect(tiers.get(players[3]).tier).not.toBe("top3");
  });

  it("splits the remaining players into diamond/gold/bronze with no overlap", () => {
    const players = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const tiers = assignTiers(players);
    const counts = { diamond: 0, gold: 0, bronze: 0, top3: 0, lastplace: 0 };
    for (const p of players) counts[tiers.get(p).tier]++;
    expect(counts.top3).toBe(3);
    expect(counts.lastplace).toBe(1);
    expect(counts.diamond + counts.gold + counts.bronze).toBe(16);
    expect(counts.diamond).toBeGreaterThan(0);
    expect(counts.bronze).toBeGreaterThan(0);
  });

  it("gives the single lowest-Elo non-top3 player the lastplace tier", () => {
    const players = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const tiers = assignTiers(players);
    expect(tiers.get(players[19]).tier).toBe("lastplace");
    expect(tiers.get(players[19]).division).toBeUndefined();
  });

  it("does not crash on fewer than 3 ranked players", () => {
    const players = [{ id: 1 }, { id: 2 }];
    const tiers = assignTiers(players);
    expect(tiers.size).toBe(2);
    expect(tiers.get(players[0]).tier).toBe("top3");
  });

  it("never assigns lastplace when it would collide with top3", () => {
    for (let groupSize = 0; groupSize <= 3; groupSize++) {
      const players = Array.from({ length: groupSize }, (_, i) => ({ id: i }));
      const tiers = assignTiers(players);
      for (const p of players) expect(tiers.get(p).tier).not.toBe("lastplace");
    }
  });

  it("assigns exactly one lastplace once a 4th player exists", () => {
    const players = Array.from({ length: 4 }, (_, i) => ({ id: i }));
    const tiers = assignTiers(players);
    expect(tiers.get(players[3]).tier).toBe("lastplace");
  });

  it("does not crash on zero ranked players", () => {
    expect(assignTiers([]).size).toBe(0);
  });
});
