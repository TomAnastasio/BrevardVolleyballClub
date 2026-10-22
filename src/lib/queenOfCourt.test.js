import { describe, expect, it } from "vitest";
import {
  buildPoolSchedule,
  computeStandings,
  gamesPerPlayer,
  isGameOver,
  poolCountFor,
  rankStandings,
  splitIntoPools,
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
  it("splits divisions into pools near the target size", () => {
    expect(poolCountFor(3, 4)).toBe(0);
    expect(poolCountFor(5, 4)).toBe(1);
    expect(poolCountFor(8, 4)).toBe(2);
    expect(poolCountFor(9, 4)).toBe(2);
    expect(poolCountFor(7, 4)).toBe(1);
    expect(poolCountFor(10, 5)).toBe(2);
    expect(poolCountFor(20, 9)).toBe(3);
  });
});

describe("splitIntoPools", () => {
  const players = ["A", "B", "C", "D", "E", "F", "G", "H"].map((name, i) => ({ id: name, name, elo: 2000 - i * 10 }));

  it("snake-seeds by Elo so pools are balanced", () => {
    const pools = splitIntoPools(players, { targetSize: 4, method: "elo" });
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

  it("ranks by wins, then point differential, sharing tied places", () => {
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
