import { describe, expect, it } from "vitest";
import { buildTournamentModel } from "../hooks/useTournament.js";
import { buildPoolSchedule } from "./queenOfCourt.js";
import { planEntrantRemoval, scheduleProblems } from "./tournamentRoster.js";

// A one-division tournament with one pool of `names`, scheduled the way
// savePools does. `scores[i]` scores game i+1 ([a, b]); `live[i]` gives it
// a live score.
function makeModel(names, { scores = [], live = [], extraMatches = [] } = {}) {
  const entrants = names.map((n) => ({ id: `e-${n}`, profile_id: n, division_id: "d1", checked_in: true }));
  const matches = buildPoolSchedule(names.length).map(([[a1, a2], [b1, b2]], i) => ({
    id: `m${i + 1}`,
    division_id: "d1",
    pool_id: "pA",
    stage: "pool",
    round: 1,
    sequence: i + 1,
    a1: names[a1],
    a2: names[a2],
    b1: names[b1],
    b2: names[b2],
    live_score_a: live[i]?.[0] ?? (scores[i]?.[0] || 0),
    live_score_b: live[i]?.[1] ?? (scores[i]?.[1] || 0),
    live_updated_at: null,
    game: scores[i] ? { score_a: scores[i][0], score_b: scores[i][1] } : null,
    win_score: names.length === 4 ? 28 : 21,
    win_by_two: true,
    point_cap: names.length === 4 ? 30 : 23,
  }));
  return buildTournamentModel({
    tournament: { id: "t1", win_score: 21, win_by_two: true, point_cap: null },
    divisions: [{ id: "d1", name: "Open", sort_order: 0 }],
    entrants,
    pools: [{ id: "pA", division_id: "d1", round: 1, label: "A" }],
    poolPlayers: entrants.map((e, i) => ({ pool_id: "pA", entrant_id: e.id, seed: i + 1 })),
    matches: [...matches, ...extraMatches],
    profiles: names.map((n) => ({ id: n, display_name: n })),
  });
}
const entrant = (model, name) => model.divisions[0].entrants.find((e) => e.profile_id === name);

describe("planEntrantRemoval", () => {
  it("rebuilds an unstarted pool for the players left", () => {
    const model = makeModel(["ana", "bea", "cat", "dee", "eve"]);
    const plan = planEntrantRemoval(model, entrant(model, "eve"), "eve");
    const games = plan.rebuiltPools.pA;
    expect(games).toHaveLength(3);
    expect(games.every((g) => ![g.a1, g.a2, g.b1, g.b2].includes("eve"))).toBe(true);
    expect(games[0]).toMatchObject({ win_score: 28, win_by_two: true, point_cap: 30 });
    expect(plan.lines).toEqual(["Pool A gets a new schedule for the 4 players left: 3 games to 28, win by 2, cap 30."]);
  });

  it("keeps scored games and removes only the player's unplayed ones once play has started", () => {
    const model = makeModel(["ana", "bea", "cat", "dee", "eve"], { scores: [[21, 15]] });
    const sitsOut = model.matches.filter((m) => ![m.a1, m.a2, m.b1, m.b2].includes("eve")).length;
    const plan = planEntrantRemoval(model, entrant(model, "eve"), "eve");
    expect(plan.rebuiltPools).toEqual({});
    const theirs = model.matches.filter((m) => [m.a1, m.a2, m.b1, m.b2].includes("eve"));
    const scored = theirs.filter((m) => m.status === "final").length;
    expect(sitsOut).toBe(1);
    expect(plan.lines[0]).toBe(`Removes their ${theirs.length - scored} unplayed games from Pool A; the other games keep their numbers.`);
    if (scored) expect(plan.lines[1]).toMatch(/scored game in Pool A stays/);
  });

  it("treats a game with a live score as started", () => {
    const model = makeModel(["ana", "bea", "cat", "dee", "eve"], { live: [[3, 1]] });
    expect(planEntrantRemoval(model, entrant(model, "eve"), "eve").rebuiltPools).toEqual({});
  });

  it("says when a pool is left too small to play", () => {
    const model = makeModel(["ana", "bea", "cat", "dee"]);
    const plan = planEntrantRemoval(model, entrant(model, "dee"), "dee");
    expect(plan.rebuiltPools).toEqual({});
    expect(plan.lines).toEqual([
      "Removes their 3 unplayed games from Pool A; the other games keep their numbers.",
      "Pool A is left with 3 players, too few to play: rebuild pools afterward.",
    ]);
  });

  it("mentions finals they're in", () => {
    const final = {
      id: "f1", division_id: "d1", pool_id: "pA", stage: "final", round: 1, sequence: 1,
      a1: "ana", a2: "zed", b1: "bea", b2: "cat", live_score_a: 0, live_score_b: 0, game: null,
    };
    const model = makeModel(["ana", "bea", "cat", "dee"], { scores: [[28, 20], [28, 26], [30, 28]], extraMatches: [final] });
    const plan = planEntrantRemoval(model, entrant(model, "ana"), "ana");
    expect(plan.lines).toContain("Removes 1 unplayed final set they're in; set the final up again on Finals.");
  });

  it("refuses when they're in a final with a scored set", () => {
    const set = (n, game) => ({
      id: `f${n}`, division_id: "d1", pool_id: "pA", stage: "final", round: 1, sequence: n,
      a1: "ana", a2: "zed", b1: "bea", b2: "cat", live_score_a: 0, live_score_b: 0, game,
    });
    const model = makeModel(["ana", "bea", "cat", "dee"], {
      scores: [[28, 20], [28, 26], [30, 28]],
      extraMatches: [set(1, { score_a: 21, score_b: 15 }), set(2, null), set(3, null)],
    });
    const plan = planEntrantRemoval(model, entrant(model, "bea"), "Bea");
    expect(plan.blocked).toBe(
      "Bea is in a final that already has a scored set, so they can't be removed. Undo that set's score on the live page first, or leave them in.",
    );
    expect(plan.rebuiltPools).toEqual({});
    // Someone not in that final can still be removed.
    expect(planEntrantRemoval(model, entrant(model, "dee"), "Dee").blocked).toBeUndefined();
  });

  it("handles a player who isn't in a pool", () => {
    const model = makeModel(["ana", "bea", "cat", "dee"]);
    const loner = { id: "e-zed", profile_id: "zed" };
    expect(planEntrantRemoval(model, loner, "Zed").lines).toEqual(["Zed isn't in any pool or game yet."]);
  });
});

describe("scheduleProblems", () => {
  it("is happy with a normal pool", () => {
    expect(scheduleProblems(makeModel(["ana", "bea", "cat", "dee"]))).toEqual([]);
  });

  it("flags an unplayed game listing someone who left the pool", () => {
    const model = makeModel(["ana", "bea", "cat", "dee", "eve"]);
    const pool = model.divisions[0].pools[0];
    pool.players = pool.players.filter((e) => e.profile_id !== "eve");
    expect(scheduleProblems(model)).toEqual([
      "Open, Pool A: 4 unplayed games list someone who isn't in the pool. Rebuild this pool.",
    ]);
  });

  it("ignores scored games with someone not in the pool (a substitute or a removed player)", () => {
    const model = makeModel(["ana", "bea", "cat", "dee"], { scores: [[28, 20]] });
    model.divisions[0].pools[0].matches[0].a1 = "sub";
    expect(scheduleProblems(model)).toEqual([]);
  });

  it("flags a pool with players but no games", () => {
    const model = makeModel(["ana", "bea", "cat", "dee"]);
    model.divisions[0].pools[0].matches = [];
    expect(scheduleProblems(model)).toEqual(["Open, Pool A: 4 players but no games. Rebuild this pool."]);
  });
});

describe("standings after a player leaves mid-pool", () => {
  it("ranks by win rate when the pool's players have different numbers of games", () => {
    // Pool of 5 played eve's first game, then eve left: her unplayed games
    // are gone, so whoever sat that game out has one game fewer.
    const full = makeModel(["ana", "bea", "cat", "dee", "eve"]);
    const hasEve = (m) => [m.a1, m.a2, m.b1, m.b2].includes("eve");
    const first = full.matches.find(hasEve);
    const keep = full.matches.filter((m) => m === first || !hasEve(m));
    const rows = keep.map((m) => ({
      id: m.id, division_id: "d1", pool_id: "pA", stage: "pool", round: 1, sequence: m.sequence,
      a1: m.a1, a2: m.a2, b1: m.b1, b2: m.b2, live_score_a: 0, live_score_b: 0,
      game: m === first ? { score_a: 21, score_b: 10 } : { score_a: 21, score_b: 19 },
    }));
    const model = buildTournamentModel({
      tournament: { id: "t1", win_score: 21, win_by_two: true, point_cap: null },
      divisions: [{ id: "d1", name: "Open", sort_order: 0 }],
      entrants: ["ana", "bea", "cat", "dee"].map((n) => ({ id: `e-${n}`, profile_id: n, division_id: "d1" })),
      pools: [{ id: "pA", division_id: "d1", round: 1, label: "A" }],
      poolPlayers: ["ana", "bea", "cat", "dee"].map((n, i) => ({ pool_id: "pA", entrant_id: `e-${n}`, seed: i + 1 })),
      matches: rows,
      profiles: [],
    });
    const { standings, matches } = model.divisions[0].pools[0];
    expect(matches).toHaveLength(rows.length);
    expect(new Set(standings.map((r) => r.scheduled)).size).toBeGreaterThan(1);
    // Every place is decided by per-game rates: wins/played never increases down the table.
    const rates = standings.map((r) => (r.played ? r.wins / r.played : 0));
    expect([...rates].sort((a, b) => b - a)).toEqual(rates);
  });
});
