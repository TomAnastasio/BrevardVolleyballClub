import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Players who have signed in at least once (one row per `profiles`
// account, see TODO.md item 6). Used to power the ranked-game player
// search so ranked participants can be picked from known accounts instead
// of free-typed. Only fetched when `enabled` (ranked beach games), since
// `profiles` is only readable to signed-in users.
export function usePlayerDirectory(enabled) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!enabled || !supabase) return;
    let cancelled = false;

    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setPlayers(data.filter((p) => p.display_name && p.display_name.trim()));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return players;
}
