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

// Beach's A1 is never a game_players row (see migration
// 20261001191519_add_game_participants.sql) — it's the submitter, identified
// via games.user_id. `submitterProfilesById` carries that one extra profile
// lookup in so A1 can show an avatar like A2/B1/B2 do. A2/B1/B2 are only
// present when the submitter picked them from player search (ranked beach
// requires it; casual beach doesn't), so a free-typed, unlinked slot simply
// contributes no entry here — same "only show what's actually linked"
// behavior indoor rosters already have.
function mapBeachTeamPlayers(gamePlayers, side, submitterUserId, submitterProfilesById) {
  const players = [];
  if (side === "a" && submitterUserId) {
    const profile = submitterProfilesById[submitterUserId];
    players.push({
      id: submitterUserId,
      name: profile?.display_name || "Player",
      avatarUrl: profile?.avatar_url || null,
    });
  }
  const slots = side === "a" ? ["a2"] : ["b1", "b2"];
  for (const slot of slots) {
    const gp = (gamePlayers || []).find((p) => p.slot === slot);
    if (gp) {
      players.push({
        id: gp.user_id,
        name: gp.profiles?.display_name || "Player",
        avatarUrl: gp.profiles?.avatar_url || null,
      });
    }
  }
  return players;
}

function mapRowToRecord(row, submitterProfilesById = {}) {
  const isIndoor = row.format === "indoor";
  const usesRoster = isIndoor || Boolean(row.team_size);
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
    teamSize: row.team_size ?? null,
    teamAPlayers: usesRoster
      ? mapTeamPlayers(row.game_players, "a")
      : mapBeachTeamPlayers(row.game_players, "a", row.user_id, submitterProfilesById),
    teamBPlayers: usesRoster
      ? mapTeamPlayers(row.game_players, "b")
      : mapBeachTeamPlayers(row.game_players, "b", row.user_id, submitterProfilesById),
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
        .select("*, game_players(user_id, slot, team, profiles(id, display_name, avatar_url))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (requestId !== latestRequestRef.current) return;

      // Beach's A1 player is identified only via games.user_id (see
      // mapBeachTeamPlayers above), so their profile isn't covered by the
      // game_players join above — fetch it separately, one query for every
      // submitter in this page of history rather than N+1.
      const submitterIds = [...new Set((data || []).map((row) => row.user_id).filter(Boolean))];
      let submitterProfilesById = {};
      if (submitterIds.length > 0) {
        const { data: submitterProfiles, error: submitterError } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", submitterIds);
        if (submitterError) throw submitterError;
        submitterProfilesById = Object.fromEntries((submitterProfiles || []).map((p) => [p.id, p]));
      }

      const fetched = (data || []).map((row) => mapRowToRecord(row, submitterProfilesById));
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
      const format = game.format || "beach";
      const usesRoster = format === "indoor" || Boolean(game.teamSize);
      const record = {
        id: "game-" + now.getTime(),
        nameA: game.nameA,
        nameB: game.nameB,
        a: game.a,
        b: game.b,
        date,
        time,
        mode,
        format,
        teamSize: format === "beach" ? game.teamSize ?? null : null,
        teamAPlayers: usesRoster ? game.teamAPlayers || [] : [],
        teamBPlayers: usesRoster ? game.teamBPlayers || [] : [],
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
                format,
                team_size: format === "beach" ? game.teamSize ?? null : null,
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
                  .select("user_id, slot, team, profiles(id, display_name, avatar_url)");
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
            // The submitter is always the current user, so their profile for
            // beach's implicit A1 slot (see mapBeachTeamPlayers) is already
            // on hand here — no extra round trip needed like the bulk fetch
            // above.
            const newRecord = data
              ? mapRowToRecord(
                  { ...data, game_players: insertedPlayers },
                  {
                    [user.id]: {
                      display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
                      avatar_url: user.user_metadata?.avatar_url || null,
                    },
                  },
                )
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

  // Admin-only: insert a game that already happened, with a caller-chosen
  // played_date instead of "now". Indoor (and squad beach, 3v3/4v4 — see
  // migration 20261004150000) is a plain insert: their rosters have no
  // implicit submitter-as-player slot, so Elo already keys off game_players
  // alone. 2v2 beach is trickier: games.user_id doubles as A1's identity for
  // both display and the ranked Elo trigger, and the admin logging this
  // almost certainly isn't A1 themself. So 2v2 beach inserts as normal
  // (submitter = admin), then immediately reuses admin_update_beach_game_players (migration
  // 20261003120000, the same RPC the "Edit Game" admin flow calls) to
  // reassign user_id to the real A1 and replay Elo correctly — no new
  // migration needed. That RPC also re-enforces is_admin server-side, so
  // this is safe even if ever reachable by a non-admin.
  const logPastGame = useCallback(
    async (game) => {
      if (!isSupabaseConfigured || !user) {
        return { error: "You must be signed in to log a past game." };
      }
      const mode = normalizeMode(game.mode);
      const format = game.format === "indoor" ? "indoor" : "beach";
      const usesRoster = format === "indoor" || Boolean(game.teamSize);
      const nameA = usesRoster ? game.teamAPlayers.map((p) => p.name).join(", ") : `${game.nameA1} & ${game.nameA2}`;
      const nameB = usesRoster ? game.teamBPlayers.map((p) => p.name).join(", ") : `${game.nameB1} & ${game.nameB2}`;

      try {
        const submittedByName =
          user.user_metadata?.full_name || user.user_metadata?.name || user.email || "A player";

        const { data, error } = await supabase
          .from("games")
          .insert({
            name_a: nameA,
            name_b: nameB,
            score_a: game.a,
            score_b: game.b,
            mode,
            played_date: game.playedDate,
            played_time: "12:00",
            user_id: user.id,
            submitted_by_name: submittedByName,
            format,
            team_size: format === "beach" ? game.teamSize ?? null : null,
          })
          .select()
          .single();
        if (error) throw error;

        if (usesRoster) {
          const rows = [
            ...game.teamAPlayers.map((p) => ({ game_id: data.id, user_id: p.id, team: "a" })),
            ...game.teamBPlayers.map((p) => ({ game_id: data.id, user_id: p.id, team: "b" })),
          ];
          if (rows.length) {
            const { error: linkError } = await supabase.from("game_players").insert(rows);
            if (linkError) throw linkError;
          }
        } else {
          const { error: rpcError } = await supabase.rpc("admin_update_beach_game_players", {
            p_game_id: data.id,
            p_a1_user_id: game.a1,
            p_a2_user_id: game.a2,
            p_b1_user_id: game.b1,
            p_b2_user_id: game.b2,
          });
          if (rpcError) throw rpcError;
        }

        await fetchRemoteHistory();
        return { error: null };
      } catch (e) {
        console.error("Failed to log past game:", e);
        return { error: `Couldn't save this game: ${e?.message || "unknown error"}` };
      }
    },
    [user, fetchRemoteHistory],
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
    logPastGame,
    historyLoading,
    refreshHistory: fetchRemoteHistory,
    saveError,
    dismissSaveError,
  };
}
