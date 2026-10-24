import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";
import { fetchRankedProfiles } from "../hooks/useLeaderboard.js";
import { partnerStats, usePlayerGames } from "../hooks/usePlayerGames.js";
import { rallyMatchup } from "./rallyMatchup.js";
import { gearFor, useItemArt, wearsSomething } from "./itemArt.js";
import { usePlayerOutfit } from "./loot.js";

// The two players in the home screen's rally, each { name, gear } or null,
// in the avatar, skin color and outfit they picked in the Locker (items
// appear once their art has loaded).
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

  const { left, right } = useMemo(() => {
    const toughest = partnerStats(games).toughestOpponent?.player ?? null;
    const me = user ? { id: user.id, name: displayName || "You" } : null;
    return rallyMatchup({ user: me, toughestOpponent: toughest, ranked });
  }, [user, displayName, games, ranked]);

  const leftOutfit = usePlayerOutfit(left?.id).outfit;
  const rightOutfit = usePlayerOutfit(right?.id).outfit;
  const art = useItemArt(wearsSomething(leftOutfit) || wearsSomething(rightOutfit));

  return useMemo(() => {
    const dress = (p, outfit) => (p ? { name: p.name, gear: gearFor(outfit, art) } : null);
    return { left: dress(left, leftOutfit), right: dress(right, rightOutfit) };
  }, [left, right, leftOutfit, rightOutfit, art]);
}
