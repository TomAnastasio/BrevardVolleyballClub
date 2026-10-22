import { describe, expect, it } from "vitest";
import { eloSeries } from "./usePlayerElo.js";

const row = (gameId, date, time, before, after) => ({
  game_id: gameId,
  rating_before: before,
  rating_after: after,
  delta: after - before,
  games: { played_date: date, played_time: time, created_at: `${date}T00:00:00Z` },
});

describe("eloSeries", () => {
  it("orders by when the game was played, not when the row was written", () => {
    const series = eloSeries([
      row("g2", "2026-10-18", "19:00", 1512, 1500),
      row("g1", "2026-10-18", "18:00", 1500, 1512),
      row("g3", "2026-10-20", "09:00", 1500, 1520),
    ]);
    expect(series.map((p) => p.gameId)).toEqual(["g1", "g2", "g3"]);
    expect(series.map((p) => p.game)).toEqual([1, 2, 3]);
    expect(series[0]).toMatchObject({ before: 1500, rating: 1512, delta: 12 });
  });

  it("skips rows whose game isn't visible", () => {
    expect(eloSeries([{ game_id: "g1", rating_before: 1500, rating_after: 1510, delta: 10, games: null }])).toEqual([]);
  });
});
