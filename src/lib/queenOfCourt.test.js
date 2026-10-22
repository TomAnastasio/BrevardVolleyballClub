import { describe, expect, it } from "vitest";
import {
  buildPoolSchedule,
  compareSeeds,
  computeStandings,
  finalSeries,
  gamesPerPlayer,
  isGameOver,
  planRound2,
  poolCountFor,
  rankStandings,
  splitIntoPools,
  unresolvedTies,
} from "./queenOfCourt.js";

describe("buildPoolSchedule", () => {
  for (let n = 4; n <= 9; n++) {
    it(`builds a fair schedule for a pool of ${n}`, () => {
      const games = buildPoolSchedule(n);
      const g = gamesPerPlayer(n);
      expect(games.length).toBe((n * g) / 4);

      const counts = new Array(n).fill(0);
      const partners = new Set();
      games.forEach((game, i) => {
        const players = game.flat();
        expect(new Set(players).size).toBe(4);
        for (const [x, y] of game) {
          const key = [x, y].sort().join("-");
          expect(partners.has(key), `partners ${key} repeat in game ${i + 1}`).toBe(false);
          partners.add(key);
        }
        players.forEach((p) => counts[p]++);
        // Games played stay within 1 of each other throughout the order.
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      });
      expect(counts.every((c) => c === g)).toBe(true);
    });
  }

  it("has everyone partner everyone once in pools of 4 and 5", () => {
    expect(buildPoolSchedule(4)).toHaveLength(3);
    expect(buildPoolSchedule(5)).toHaveLength(5);
  });

  it("refuses pool sizes it can't schedule", () => {
    expect(() => buildPoolSchedule(3)).toThrow();
    expect(() => buildPoolSchedule(10)).toThrow();
  });
});

describe("poolCountFor", () => {
  it("makes pools of only 4s and 5s when possible", () => {
    expect(poolCountFor(3, 5)).toBe(0);
    expect(poolCountFor(5, 4)).toBe(1);
    expect(poolCountFor(8, 5)).toBe(2);
    expect(poolCountFor(9, 4)).toBe(2);
    expect(poolCountFor(10, 4)).toBe(2);
    expect(poolCountFor(12, 5)).toBe(3);
    expect(poolCountFor(16, 4)).toBe(4);
    expect(poolCountFor(20, 5)).toBe(4);
    expect(poolCountFor(20, 4)).toBe(5);
  });

  it("falls back to a bigger pool when 4s and 5s can't work", () => {
    expect(poolCountFor(6, 5)).toBe(1);
    expect(poolCountFor(7, 4)).toBe(1);
    expect(poolCountFor(11, 5)).toBe(2);
  });
});

describe("splitIntoPools", () => {
  const players = ["A", "B", "C", "D", "E", "F", "G", "H"].map((name, i) => ({ id: name, name, elo: 2000 - i * 10 }));

  it("snake-seeds by rank so pools are balanced", () => {
    const pools = splitIntoPools(players, { targetSize: 4, method: "ranked" });
    expect(pools.map((p) => p.map((x) => x.id))).toEqual([
      ["A", "D", "E", "H"],
      ["B", "C", "F", "G"],
    ]);
  });

  it("random seeding keeps everyone, in near-equal pools", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pools = splitIntoPools([...players, { id: "I", name: "I" }], { targetSize: 4, method: "random", random });
    expect(pools.map((p) => p.length).sort()).toEqual([4, 5]);
    expect(pools.flat().map((p) => p.id).sort()).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);
  });
});

describe("standings", () => {
  const matches = [
    { a1: "p1", a2: "p2", b1: "p3", b2: "p4", scoreA: 21, scoreB: 15 },
    { a1: "p1", a2: "p3", b1: "p2", b2: "p4", scoreA: 21, scoreB: 19 },
    { a1: "p1", a2: "p4", b1: "p2", b2: "p3", scoreA: null, scoreB: null },
  ];

  it("totals wins and points from scored games only", () => {
    const rows = computeStandings(["p1", "p2", "p3", "p4"], matches);
    const p1 = rows.find((r) => r.id === "p1");
    expect(p1).toMatchObject({ played: 2, wins: 2, losses: 0, pointsFor: 42, pointsAgainst: 34, diff: 8 });
    const p4 = rows.find((r) => r.id === "p4");
    expect(p4).toMatchObject({ played: 2, wins: 0, losses: 2, diff: -8 });
  });

  it("ranks by wins, then fewest points against", () => {
    const ranked = rankStandings(computeStandings(["p1", "p2", "p3", "p4"], matches));
    expect(ranked.map((r) => [r.id, r.place])).toEqual([
      ["p1", 1],
      ["p2", 2],
      ["p3", 3],
      ["p4", 4],
    ]);
  });

  it("gives fully tied players the same place", () => {
    const tied = [{ a1: "p1", a2: "p2", b1: "p3", b2: "p4", scoreA: 21, scoreB: 15 }];
    const ranked = rankStandings(computeStandings(["p1", "p2", "p3", "p4"], tied));
    expect(ranked.map((r) => r.place)).toEqual([1, 1, 3, 3]);
  });
});

describe("isGameOver", () => {
  it("needs the target score and a 2-point lead", () => {
    expect(isGameOver(21, 19)).toBe(true);
    expect(isGameOver(21, 20)).toBe(false);
    expect(isGameOver(20, 15)).toBe(false);
    expect(isGameOver(23, 21)).toBe(true);
  });
  it("respects a point cap and win-by-one", () => {
    expect(isGameOver(23, 22, { winScore: 21, pointCap: 23 })).toBe(true);
    expect(isGameOver(15, 14, { winScore: 15, winByTwo: false })).toBe(true);
  });
});

describe("compareSeeds", () => {
  it("orders by AVP rank, then TruVolley, then Elo, missing values last", () => {
    const players = [
      { name: "elo only", elo: 1900 },
      { name: "nothing" },
      { name: "tv 50", truvolley: 50, elo: 1200 },
      { name: "avp 30", avp: 30 },
      { name: "tv 70", truvolley: 70 },
      { name: "avp 4", avp: 4, elo: 1100 },
      { name: "elo high", elo: 2000 },
    ];
    expect([...players].sort(compareSeeds).map((p) => p.name)).toEqual([
      "avp 4",
      "avp 30",
      "tv 70",
      "tv 50",
      "elo high",
      "elo only",
      "nothing",
    ]);
  });
});

// A finished pool's ranked standings, from a list of [id, wins, pointsAgainst].
function pool(rows, played = 3) {
  return {
    standings: rankStandings(rows.map(([id, wins, pointsAgainst]) => ({ id, wins, pointsAgainst, played }))),
  };
}

describe("planRound2", () => {
  it("needs at least 2 pools", () => {
    expect(planRound2([pool([["a", 3, 40]])])).toBeNull();
  });

  it("2 pools of 4: top 2 of each pool to Gold, bottom 2 to Silver", () => {
    const plan = planRound2([
      pool([["a1", 3, 50], ["a2", 2, 60], ["a3", 1, 70], ["a4", 0, 80]]),
      pool([["b1", 3, 50], ["b2", 2, 60], ["b3", 1, 70], ["b4", 0, 80]]),
    ]);
    expect(plan.method).toBe("place");
    expect(plan.tiers.map((t) => t.map((r) => r.id))).toEqual([
      ["a1", "a2", "b1", "b2"],
      ["a3", "a4", "b3", "b4"],
    ]);
    expect(plan.ties).toEqual([]);
  });

  it("4 pools: each place goes to its own tier", () => {
    const pools = ["a", "b", "c", "d"].map((p) =>
      pool([[`${p}1`, 3, 50], [`${p}2`, 2, 60], [`${p}3`, 1, 70], [`${p}4`, 0, 80]]),
    );
    const plan = planRound2(pools);
    expect(plan.tiers.map((t) => t.map((r) => r.id))).toEqual([
      ["a1", "b1", "c1", "d1"],
      ["a2", "b2", "c2", "d2"],
      ["a3", "b3", "c3", "d3"],
      ["a4", "b4", "c4", "d4"],
    ]);
  });

  it("2 pools of 5: ranks all 10 players, top 5 Gold", () => {
    const plan = planRound2([
      pool([["a1", 4, 50], ["a2", 3, 60], ["a3", 3, 61], ["a4", 1, 70], ["a5", 0, 80]], 4),
      pool([["b1", 2, 50], ["b2", 2, 55], ["b3", 2, 56], ["b4", 1, 65], ["b5", 1, 90]], 4),
    ]);
    expect(plan.method).toBe("overall");
    expect(plan.tiers.map((t) => t.map((r) => r.id))).toEqual([
      ["a1", "a2", "a3", "b1", "b2"],
      ["b3", "b4", "a4", "b5", "a5"],
    ]);
  });

  it("3 pools: top 4 Gold, middle 4 Silver, bottom 4 Bronze", () => {
    const pools = ["a", "b", "c"].map((p, i) =>
      pool([[`${p}1`, 3, 50 + i], [`${p}2`, 2, 60 + i], [`${p}3`, 1, 70 + i], [`${p}4`, 0, 80 + i]]),
    );
    const plan = planRound2(pools);
    expect(plan.tiers.map((t) => t.map((r) => r.id))).toEqual([
      ["a1", "b1", "c1", "a2"],
      ["b2", "c2", "a3", "b3"],
      ["c3", "a4", "b4", "c4"],
    ]);
  });

  it("flags players tied across a tier boundary", () => {
    const plan = planRound2([
      pool([["a1", 3, 50], ["a2", 1, 60], ["a3", 1, 60], ["a4", 1, 80]]),
      pool([["b1", 3, 50], ["b2", 2, 60], ["b3", 1, 70], ["b4", 0, 80]]),
    ]);
    expect(plan.ties).toEqual([{ tier: 0, ids: ["a2", "a3"] }]);
  });

  it("compares unequal pools per game played", () => {
    const plan = planRound2([
      pool([["a1", 4, 60], ["a2", 2, 80], ["a3", 2, 84], ["a4", 1, 90], ["a5", 1, 92]], 4),
      pool([["b1", 3, 40], ["b2", 2, 60], ["b3", 1, 70], ["b4", 0, 80]], 3),
    ]);
    expect(plan.tiers[0].map((r) => r.id)).toEqual(["b1", "a1", "b2", "a2", "a3"]);
  });
});

describe("unresolvedTies", () => {
  it("reports shared places only once the pool is finished", () => {
    const done = [{ a1: "p1", a2: "p2", b1: "p3", b2: "p4", scoreA: 21, scoreB: 15 }];
    const standings = rankStandings(computeStandings(["p1", "p2", "p3", "p4"], done));
    expect(unresolvedTies(standings, done)).toEqual([
      { place: 1, ids: ["p1", "p2"] },
      { place: 3, ids: ["p3", "p4"] },
    ]);
    expect(unresolvedTies(standings, [...done, { scoreA: null, scoreB: null }])).toEqual([]);
  });
});

describe("finalSeries", () => {
  const set = (scoreA, scoreB) => ({ scoreA, scoreB });
  it("is won with 2 sets, and a third set isn't needed after 2-0", () => {
    const s = finalSeries([set(21, 18), set(23, 21), set(null, null)]);
    expect(s).toMatchObject({ winsA: 2, winsB: 0, winner: "a" });
    expect(s.sets.map((r) => r.notNeeded)).toEqual([false, false, true]);
  });
  it("goes to a third set at 1-1", () => {
    const s = finalSeries([set(21, 18), set(19, 21), set(null, null)]);
    expect(s).toMatchObject({ winsA: 1, winsB: 1, winner: null });
    expect(s.sets[2].notNeeded).toBe(false);
    expect(finalSeries([set(21, 18), set(19, 21), set(13, 15)]).winner).toBe("b");
  });
  it("one set decides a single-set final", () => {
    expect(finalSeries([set(21, 25)]).winner).toBe("b");
  });
});
