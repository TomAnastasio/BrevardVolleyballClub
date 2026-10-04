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

export function mapTeamPlayers(gamePlayers, team) {
  return (gamePlayers || [])
    .filter((gp) => gp.team === team)
    .map((gp) => ({
      id: gp.user_id,
      name: gp.profiles?.display_name || "Player",
      avatarUrl: gp.profiles?.avatar_url || null,
    }))
    .sort((x, y) => x.name.localeCompare(y.name));
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
    format: row.format,
    teamAPlayers: row.format === "indoor" ? mapTeamPlayers(row.game_players, "a") : [],
    teamBPlayers: row.format === "indoor" ? mapTeamPlayers(row.game_players, "b") : [],
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
  // Set when a background Supabase write in addGame() fails, so the UI can
  // surface it instead of only logging to console (the pre-0007 outage went
  // unnoticed for exactly this reason — see TODO.md item 1).
  const [saveError, setSaveError] = useState(null);
  // Games inserted via addGame() while a fetch is still in flight, keyed by
  // id. A fetch that was already in flight when the insert happened can read
  // a pre-insert snapshot and resolve afterward; without this, its result
  // would blindly replace remoteHistory and silently drop the new game.
  const pendingInsertsRef = useRef(new Map());

  // Guards against two overlapping fetches (e.g. a user?.id change racing a
  // manual refreshHistory() call) resolving out of order — only the result
  // of the most recently *started* fetch is ever applied.
  const latestRequestRef = useRef(0);

  // Extracted so an admin edit save can force a re-fetch immediately instead
  // of waiting on user?.id to change (see `refreshHistory` returned below).
  const fetchRemoteHistory = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setRemoteLoading(true);
    try {
      // No .eq("user_id", ...) filter — `games` is publicly readable
      // (migration 0009), a club-wide history, not a per-user one. Still
      // fetched on `user?.id` changes below so a sign-in/out swaps in any
      // optimistic inserts tied to the new session correctly.
      const { data, error } = await supabase
        .from("games")
        .select("*, game_players(user_id, team, profiles(id, display_name, avatar_url))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (requestId !== latestRequestRef.current) return;

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
      if (requestId === latestRequestRef.current) setRemoteLoading(false);
    }
  }, []);

  useEffect(() => {
    pendingInsertsRef.current.clear();

    if (!isSupabaseConfigured) {
      setRemoteHistory(null);
      setRemoteLoading(false);
      return;
    }

    fetchRemoteHistory();
  }, [user?.id, fetchRemoteHistory]);

  const addGame = useCallback(
    (game) => {
      const now = new Date();
      const date = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
      const time = pad2(now.getHours()) + ":" + pad2(now.getMinutes());
      const mode = normalizeMode(game.mode);

      // `synced: false` marks a game that was saved while signed out (or
      // Supabase isn't configured) and therefore will never show up in
      // remoteHistory — `history` below uses this to merge it back in
      // instead of letting it quietly disappear once remote data loads.
      // Older cached records predate this field (`synced === undefined`)
      // and are deliberately left out of that merge, since there's no way
      // to tell whether they were already synced before this existed.
      const record = {
        id: "game-" + now.getTime(),
        nameA: game.nameA,
        nameB: game.nameB,
        a: game.a,
        b: game.b,
        date,
        time,
        mode,
        format: game.format || "beach",
        teamAPlayers: game.format === "indoor" ? game.teamAPlayers || [] : [],
        teamBPlayers: game.format === "indoor" ? game.teamBPlayers || [] : [],
        synced: Boolean(isSupabaseConfigured && user),
      };

      setLocalHistory((prev) => {
        const next = [record, ...prev];
        saveHistory(next);
        return next;
      });

      if (isSupabaseConfigured && user) {
        setSaveError(null);
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
                format: game.format || "beach",
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
            let insertedPlayers = null;
            if (data && game.participants?.length) {
              try {
                const { data: linkData, error: linkError } = await supabase
                  .from("game_players")
                  .insert(
                    game.participants.map((p) => ({
                      game_id: data.id,
                      user_id: p.userId,
                      slot: p.slot ?? null,
                      team: p.team ?? null,
                    })),
                  )
                  .select("user_id, team, profiles(id, display_name, avatar_url)");
                if (linkError) throw linkError;
                insertedPlayers = linkData;
              } catch (linkErr) {
                console.error("Failed to link game participants in Supabase:", linkErr);
                setSaveError(
                  "This game saved, but one or more players couldn't be linked — their stats may not update.",
                );
              }
            }

            // Optimistically (and asynchronously) merge the saved game into
            // remoteHistory so it shows up immediately, without waiting for
            // user?.id to change and re-trigger the fetch effect. Prefer the
            // DB-returned row (has real id/created_at); fall back to the
            // locally-generated record if the insert didn't return one.
            const newRecord = data
              ? mapRowToRecord({ ...data, game_players: insertedPlayers })
              : record;
            pendingInsertsRef.current.set(newRecord.id, newRecord);
            setRemoteHistory((prev) => {
              const base = prev ?? [];
              if (base.some((g) => g.id === newRecord.id)) return base;
              return [newRecord, ...base];
            });
          } catch (e) {
            console.error("Failed to save game to Supabase:", e);
            setSaveError(
              "This game didn't sync to the server — it's only saved on this device for now. Check your connection and try again.",
            );
          }
        })();
      }
    },
    [user],
  );

  // Local games saved while signed out never reach `games` (its insert
  // policy requires auth.uid() = user_id), so they'd otherwise vanish from
  // Past Games the moment remoteHistory loads. Merge them back in, sorted
  // alongside the remote (public) history by when they were played.
  const history =
    isSupabaseConfigured && remoteHistory !== null
      ? [...remoteHistory, ...localHistory.filter((g) => g.synced === false)].sort((a, b) =>
          `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
        )
      : localHistory;
  const historyLoading = isSupabaseConfigured && remoteLoading;
  const dismissSaveError = useCallback(() => setSaveError(null), []);

  return {
    history,
    addGame,
    historyLoading,
    refreshHistory: fetchRemoteHistory,
    saveError,
    dismissSaveError,
  };
}
