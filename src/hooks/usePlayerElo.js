import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

// Ranked games in the order Elo was rated: the same order Recompute Elo
// replays them in (played_date, played_time, created_at; migration
// 20261004180000). Not elo_history.created_at, which a recompute resets.
export function eloSeries(rows) {
  const sorted = [...rows]
    .filter((r) => r.games)
    .sort((x, y) =>
      `${x.games.played_date} ${x.games.played_time} ${x.games.created_at}`.localeCompare(
        `${y.games.played_date} ${y.games.played_time} ${y.games.created_at}`,
      ),
    );
  return sorted.map((r, i) => ({
    game: i + 1,
    gameId: r.game_id,
    date: r.games.played_date,
    before: r.rating_before,
    rating: r.rating_after,
    delta: r.delta,
  }));
}

// A player's Elo after each ranked game, for the profile's chart. elo_history
// is only readable by signed-in members (owner's call, 2026-10-22), so this
// does nothing while signed out.
export function usePlayerElo(playerId, signedIn, refreshKey) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(Boolean(playerId && signedIn));

  useEffect(() => {
    if (!playerId || !signedIn || !isSupabaseConfigured) {
      setSeries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("elo_history")
      .select("game_id, rating_before, rating_after, delta, games(played_date, played_time, created_at)")
      .eq("user_id", playerId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load Elo history:", error);
        setSeries(eloSeries(data || []));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId, signedIn, refreshKey]);

  return { series, loading };
}
