import { describe, expect, it } from "vitest";
import { mapGameForPlayer, partnerStats, sideForPlayer, winLossRecords } from "./usePlayerGames.js";

const PLAYER = "player-1";
const OTHER = "player-2";

function gp(entries) {
  return new Map(entries.map((e) => [e.gameId, e.links]));
}

describe("sideForPlayer", () => {
  it("puts beach's implicit submitter (a1) on side 'a' with no game_players row", () => {
    const game = { id: "g1", format: "beach", user_id: PLAYER };
    expect(sideForPlayer(game, PLAYER, gp([]))).toBe("a");
  });

  it("reads a beach a2/b1/b2 slot from the linked game_players row", () => {
    const linked = gp([{ gameId: "g1", links: [{ user_id: PLAYER, slot: "a2" }] }]);
    expect(sideForPlayer({ id: "g1", format: "beach", user_id: OTHER }, PLAYER, linked)).toBe("a");

    const linkedB = gp([{ gameId: "g1", links: [{ user_id: PLAYER, slot: "b1" }] }]);
    expect(sideForPlayer({ id: "g1", format: "beach", user_id: OTHER }, PLAYER, linkedB)).toBe("b");
  });

  it("reads an indoor roster spot's team directly", () => {
    const linked = gp([{ gameId: "g1", links: [{ user_id: PLAYER, team: "b" }] }]);
    expect(sideForPlayer({ id: "g1", format: "indoor", user_id: OTHER }, PLAYER, linked)).toBe("b");
  });

  it("returns null for a player who isn't part of the game", () => {
    const game = { id: "g1", format: "beach", user_id: OTHER };
    expect(sideForPlayer(game, PLAYER, gp([]))).toBeNull();
  });
});

describe("mapGameForPlayer", () => {
  it("returns null (filters out) games the player wasn't part of", () => {
    const game = { id: "g1", format: "beach", user_id: OTHER, score_a: 21, score_b: 15 };
    expect(mapGameForPlayer(game, PLAYER, gp([]))).toBeNull();
  });

  it("orients own/opponent score and name to the player's side, not always side A", () => {
    const linked = gp([{ gameId: "g1", links: [{ user_id: PLAYER, slot: "b1" }] }]);
    const game = {
      id: "g1",
      format: "beach",
      mode: "ranked",
      user_id: OTHER,
      score_a: 21,
      score_b: 15,
      name_a: "Team A",
      name_b: "Team B",
      played_date: "2026-10-04",
      created_at: "2026-10-04T00:00:00Z",
    };
    const mapped = mapGameForPlayer(game, PLAYER, linked);
    expect(mapped.ownScore).toBe(15);
    expect(mapped.oppScore).toBe(21);
    expect(mapped.oppName).toBe("Team A");
  });
});

describe("winLossRecords", () => {
  it("counts every game overall and only ranked games for the ranked record", () => {
    const games = [
      { mode: "ranked", ownScore: 21, oppScore: 15 },
      { mode: "ranked", ownScore: 12, oppScore: 21 },
      { mode: "casual", ownScore: 21, oppScore: 19 },
      { mode: "casual", ownScore: 21, oppScore: 10 },
      { mode: "casual", ownScore: 5, oppScore: 21 },
    ];
    expect(winLossRecords(games)).toEqual({
      overall: { wins: 3, losses: 2 },
      ranked: { wins: 1, losses: 1 },
    });
  });

  it("is all zeros with no games", () => {
    expect(winLossRecords([])).toEqual({ overall: { wins: 0, losses: 0 }, ranked: { wins: 0, losses: 0 } });
  });
});

describe("mapGameForPlayer teammates and opponents", () => {
  const prof = (id) => ({ id, display_name: id.toUpperCase(), avatar_url: null });
  it("splits a 2v2 beach game, including the implicit A1 submitter", () => {
    const game = { id: "g1", format: "beach", team_size: null, user_id: "a1", score_a: 21, score_b: 15 };
    const linked = new Map([
      [
        "g1",
        [
          { user_id: PLAYER, slot: "a2", profiles: prof(PLAYER) },
          { user_id: "b1", slot: "b1", profiles: prof("b1") },
          { user_id: "b2", slot: "b2", profiles: prof("b2") },
        ],
      ],
    ]);
    const mapped = mapGameForPlayer(game, PLAYER, linked, { a1: prof("a1") });
    expect(mapped.teammates.map((p) => p.id)).toEqual(["a1"]);
    expect(mapped.teammates[0].name).toBe("A1");
    expect(mapped.opponents.map((p) => p.id).sort()).toEqual(["b1", "b2"]);
  });

  it("uses team for indoor rosters", () => {
    const game = { id: "g1", format: "indoor", user_id: "x", score_a: 25, score_b: 20 };
    const linked = new Map([
      ["g1", [{ user_id: PLAYER, team: "b" }, { user_id: "m", team: "b" }, { user_id: "n", team: "a" }]],
    ]);
    const mapped = mapGameForPlayer(game, PLAYER, linked);
    expect(mapped.teammates.map((p) => p.id)).toEqual(["m"]);
    expect(mapped.opponents.map((p) => p.id)).toEqual(["n"]);
  });
});

describe("partnerStats", () => {
  const sam = { id: "sam", name: "Sam" };
  const jo = { id: "jo", name: "Jo" };
  const kim = { id: "kim", name: "Kim" };
  const g = (won, teammates, opponents) => ({ ownScore: won ? 21 : 10, oppScore: won ? 10 : 21, teammates, opponents });

  it("finds most frequent partner, best partner and toughest opponent", () => {
    const games = [
      g(true, [sam], [kim]),
      g(false, [sam], [kim]),
      g(false, [sam], [kim]),
      g(false, [sam], [jo]),
      g(true, [jo], [kim]),
      g(true, [jo], [kim]),
      g(true, [jo], [kim]),
    ];
    const stats = partnerStats(games);
    expect(stats.mostFrequentPartner).toMatchObject({ player: sam, games: 4, wins: 1, losses: 3 });
    expect(stats.bestPartner).toMatchObject({ player: jo, games: 3, wins: 3 });
    expect(stats.toughestOpponent).toMatchObject({ player: kim, games: 6, wins: 4, losses: 2 });
  });

  it("needs at least 3 games for best/toughest, and a loss for toughest", () => {
    const stats = partnerStats([g(true, [sam], [kim]), g(false, [sam], [kim]), g(true, [jo], [kim])]);
    expect(stats.mostFrequentPartner.player).toBe(sam);
    expect(stats.bestPartner).toBeNull();
    expect(stats.toughestOpponent).toMatchObject({ player: kim, games: 3 });
    expect(partnerStats([g(true, [sam], [kim]), g(true, [sam], [kim]), g(true, [sam], [kim])]).toughestOpponent).toBeNull();
  });

  it("is empty with no games", () => {
    expect(partnerStats([])).toEqual({ mostFrequentPartner: null, bestPartner: null, toughestOpponent: null });
  });
});
