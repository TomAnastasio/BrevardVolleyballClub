import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth.js";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { normalizeMode } from "../lib/gameMode.js";

const HISTORY_KEY = "bvc-game-history-v1";

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
}

function mapRowToRecord(row) {
  return {
    id: row.id,
    nameA: row.name_a,
    nameB: row.name_b,
    a: row.score_a,
    b: row.score_b,
    date: row.played_date,
    time: row.played_time,
    mode: row.mode,
    submittedByUserId: row.user_id,
    submittedByName: row.submitted_by_name,
  };
}

export function useGameHistory() {
  const { user } = useAuth();
  const [localHistory, setLocalHistory] = useState(loadHistory);
  const [remoteHistory, setRemoteHistory] = useState(null);
  // True only while the current user's fetch is actually in flight — distinct
  // from remoteHistory being null, which also covers "fetch failed, fall
  // back to local". Lets the UI show a loading state instead of flashing
  // localHistory (which may be stale/pre-signin) and then replacing it with
  // the real remote list a moment later.
  const [remoteLoading, setRemoteLoading] = useState(false);
  // Games inserted via addGame() while a fetch is still in flight, keyed by
  // id. A fetch that was already in flight when the insert happened can read
  // a pre-insert snapshot and resolve afterward; without this, its result
  // would blindly replace remoteHistory and silently drop the new game.
  const pendingInsertsRef = useRef(new Map());

  useEffect(() => {
    pendingInsertsRef.current.clear();

    if (!isSupabaseConfigured) {
      setRemoteHistory(null);
      setRemoteLoading(false);
      return;
    }

    let active = true;
    setRemoteLoading(true);

    async function fetchRemoteHistory() {
      try {
        // No .eq("user_id", ...) filter — `games` is publicly readable
        // (migration 0009), a club-wide history, not a per-user one. Still
        // fetched on `user?.id` changes below so a sign-in/out swaps in any
        // optimistic inserts tied to the new session correctly.
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!active) return;

        const fetched = (data || []).map(mapRowToRecord);
        const fetchedIds = new Set(fetched.map((g) => g.id));
        // Carry forward any optimistic insert this fetch raced past (i.e.
        // doesn't yet reflect) instead of letting it disappear; drop entries
        // the fetch already confirmed so the pending set doesn't grow stale.
        const stillPending = [];
        for (const [id, game] of pendingInsertsRef.current) {
          if (fetchedIds.has(id)) {
            pendingInsertsRef.current.delete(id);
          } else {
            stillPending.push(game);
          }
        }
        setRemoteHistory([...stillPending, ...fetched]);
      } catch (e) {
        console.error("Failed to fetch game history from Supabase:", e);
        // Leave remoteHistory as null (not []) so `history` falls back to
        // localHistory instead of appearing as a definitive "zero games".
      } finally {
        if (active) setRemoteLoading(false);
      }
    }

    fetchRemoteHistory();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const addGame = useCallback(
    (game) => {
      const now = new Date();
      const date = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
      const time = pad2(now.getHours()) + ":" + pad2(now.getMinutes());
      const mode = normalizeMode(game.mode);

      const record = {
        id: "game-" + now.getTime(),
        nameA: game.nameA,
        nameB: game.nameB,
        a: game.a,
        b: game.b,
        date,
        time,
        mode,
      };

      setLocalHistory((prev) => {
        const next = [record, ...prev];
        saveHistory(next);
        return next;
      });

      if (isSupabaseConfigured && user) {
        (async () => {
          try {
            const submittedByName =
              user.user_metadata?.full_name || user.user_metadata?.name || user.email || "A player";

            const { data, error } = await supabase
              .from("games")
              .insert({
                name_a: game.nameA,
                name_b: game.nameB,
                score_a: game.a,
                score_b: game.b,
                mode,
                played_date: date,
                played_time: time,
                user_id: user.id,
                submitted_by_name: submittedByName,
              })
              .select()
              .single();
            if (error) throw error;

            // Link whichever other-player slots were picked from the known-
            // player search (not free-typed) to their real profiles, so they
            // can see this game in their own history too, and so a ranked
            // game's Elo trigger (migration 0006) knows which team each
            // linked player was on. A failure here must not undo or block
            // the game save above — it's a separate insert, logged on its
            // own.
            if (data && game.participants?.length) {
              try {
                const { error: linkError } = await supabase.from("game_players").insert(
                  game.participants.map((p) => ({ game_id: data.id, user_id: p.userId, slot: p.slot })),
                );
                if (linkError) throw linkError;
              } catch (linkErr) {
                console.error("Failed to link game participants in Supabase:", linkErr);
              }
            }

            // Optimistically (and asynchronously) merge the saved game into
            // remoteHistory so it shows up immediately, without waiting for
            // user?.id to change and re-trigger the fetch effect. Prefer the
            // DB-returned row (has real id/created_at); fall back to the
            // locally-generated record if the insert didn't return one.
            const newRecord = data ? mapRowToRecord(data) : record;
            pendingInsertsRef.current.set(newRecord.id, newRecord);
            setRemoteHistory((prev) => {
              const base = prev ?? [];
              if (base.some((g) => g.id === newRecord.id)) return base;
              return [newRecord, ...base];
            });
          } catch (e) {
            console.error("Failed to save game to Supabase:", e);
          }
        })();
      }
    },
    [user],
  );

  const history = isSupabaseConfigured && remoteHistory !== null ? remoteHistory : localHistory;
  const historyLoading = isSupabaseConfigured && remoteLoading;

  return { history, addGame, historyLoading };
}
