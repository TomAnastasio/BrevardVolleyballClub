import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

// County-wide Elo leaderboard (TODO.md item 4), ranked games only. `profiles`
// is readable by anyone, signed in or not (migration 0008), so this only
// waits on `enabled` for Supabase being configured at all.
export function useLeaderboard(enabled) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, elo_rating, elo_games_played")
      .order("elo_rating", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setPlayers(data.filter((p) => p.display_name && p.display_name.trim()));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { players, loading };
}
