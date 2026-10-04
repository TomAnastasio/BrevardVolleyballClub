import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Percentile tier among ranked players only (players with 0 games never
// enter the percentile math at all). Deliberately no minimum-games buffer
// and no caching/batching — a player's very first ranked game immediately
// slots them into a tier off that single data point, recomputed fresh every
// time the leaderboard loads.
//
// The literal #1/#2/#3 ranked players always get the "top3" tier, regardless
// of what percentile that'd otherwise land them in. The single lowest-Elo
// ranked player (excluding anyone already claimed by top3, so a tiny pool
// never double-assigns the same person) gets "lastplace" — no division,
// just the one badge. Bronze/Gold/Diamond (bottom 40% / next 50% / top 10%)
// are then computed over everyone left. Within whichever tier a player lands
// in, a 1/2/3 "division" sub-badge marks their position within that tier's
// own bottom-30%/middle-40%/top-30%.
export function divisionForIndex(index, groupSize) {
  // Symmetric 30%-from-each-end split. Using the same rounded count from
  // both ends (rather than independent ceil'd cutoffs) guarantees the three
  // buckets never overlap or leave one empty for small groupSize — e.g. a
  // 3-person group (the top3 tier) always lands exactly one person in each
  // division instead of two people tying for "division 2".
  const edgeCount = Math.round(groupSize * 0.3);
  if (index < edgeCount) return 3;
  if (index >= groupSize - edgeCount) return 1;
  return 2;
}

export function assignTiers(ranked) {
  const top3 = ranked.slice(0, 3);
  let rest = ranked.slice(3);

  const tiers = new Map();
  top3.forEach((p, i) => tiers.set(p, { tier: "top3", division: divisionForIndex(i, top3.length) }));

  if (rest.length > 0) {
    tiers.set(rest[rest.length - 1], { tier: "lastplace" });
    rest = rest.slice(0, -1);
  }

  const diamondCutoff = Math.ceil(rest.length * 0.1);
  const goldCutoff = Math.ceil(rest.length * 0.6);
  const groups = { diamond: [], gold: [], bronze: [] };
  rest.forEach((p, i) => {
    if (i < diamondCutoff) groups.diamond.push(p);
    else if (i < goldCutoff) groups.gold.push(p);
    else groups.bronze.push(p);
  });
  for (const [tier, members] of Object.entries(groups)) {
    members.forEach((p, i) => tiers.set(p, { tier, division: divisionForIndex(i, members.length) }));
  }

  return tiers;
}

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
        if (!error && data) {
          const valid = data.filter((p) => p.display_name && p.display_name.trim());
          const ranked = valid.filter((p) => p.elo_games_played > 0);
          const tiers = assignTiers(ranked);
          const withTiers = valid.map((p) => {
            const assigned = tiers.get(p);
            return assigned ? { ...p, ...assigned } : p;
          });
          setPlayers(withTiers);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { players, loading };
}
