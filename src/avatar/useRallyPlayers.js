import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { fetchRankedProfiles } from "../hooks/useLeaderboard.js";
import { partnerStats, usePlayerGames } from "../hooks/usePlayerGames.js";
import { rallyMatchup } from "./rallyMatchup.js";

// The two players in the home screen's rally, each { name, gear } or null.
// Nobody owns gear yet (the tokens/items database isn't built), so everyone
// is drawn plain for now.
export function useRallyPlayers(user, displayName) {
  const [ranked, setRanked] = useState([]);
  const { games } = usePlayerGames(user?.id ?? null);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    fetchRankedProfiles().then((profiles) => {
      if (!cancelled && profiles) setRanked(profiles.filter((p) => p.elo_games_played > 0));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const toughest = partnerStats(games).toughestOpponent?.player ?? null;
    const me = user ? { id: user.id, name: displayName || "You" } : null;
    const { left, right } = rallyMatchup({ user: me, toughestOpponent: toughest, ranked });
    const dress = (p) => (p ? { name: p.name, gear: null } : null);
    return { left: dress(left), right: dress(right) };
  }, [user, displayName, games, ranked]);
}
