import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

// County-wide Elo leaderboard (TODO.md item 4), ranked games only. Only
// fetched when `enabled` (the viewer is signed in), since `profiles` is only
// readable to authenticated users (migration 0004).
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
