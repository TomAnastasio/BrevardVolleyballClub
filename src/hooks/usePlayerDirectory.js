import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Players who have signed in at least once (one row per `profiles`
// account). Used to power the ranked-game player
// search so ranked participants can be picked from known accounts instead
// of free-typed. Only fetched when `enabled` (ranked beach games), since
// `profiles` is only readable to signed-in users. Changing `reloadKey`
// fetches the list again (e.g. after Merge Profiles deletes one).
// `failed`: the list didn't load (so search can't find anyone), vs. no
// matches; `retry` tries again.
export function usePlayerDirectory(enabled, reloadKey = 0) {
  const [players, setPlayers] = useState([]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !supabase) return;
    let cancelled = false;

    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_manual")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          if (error) console.error("Failed to load players:", error);
          setFailed(true);
          return;
        }
        setFailed(false);
        setPlayers(data.filter((p) => p.display_name && p.display_name.trim()));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadKey, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { players, failed, retry };
}
