import { describe, expect, it } from "vitest";
import { mapGameForPlayer, sideForPlayer } from "./usePlayerGames.js";

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
