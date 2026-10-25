import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "./useAuth.js";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { normalizeMode } from "../lib/gameMode.js";
import { TOURNAMENT_MATCH_EMBED, tournamentTagFor } from "../lib/tournamentGameTag.js";
import { buildRecordGameArgs, confirmedIds, mergeQueuedIntoHistory, newGameId } from "../lib/gameUploadQueue.js";
import {
  confirmQueuedGames,
  flushQueue,
  getSnapshot as getUploadSnapshot,
  queueGame,
  removeQueuedGame,
  subscribe as subscribeUploads,
} from "../lib/gameUploader.js";

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
    // Games saved through record_game record who pressed Save separately
    // (submitted_by), since a 2v2 beach game's user_id is Player 1, who may
    // be someone else. Older games only have user_id.
    submittedByUserId: row.submitted_by ?? row.user_id,
    submittedByName: row.submitted_by_name,
    format: row.format,
    teamSize: row.team_size ?? null,
    tournament: tournamentTagFor(row),
    teamAPlayers: usesRoster
      ? mapTeamPlayers(row.game_players, "a")
      : mapBeachTeamPlayers(row.game_players, "a", row.user_id, submitterProfilesById),
    teamBPlayers: usesRoster
      ? mapTeamPlayers(row.game_players, "b")
      : mapBeachTeamPlayers(row.game_players, "b", row.user_id, submitterProfilesById),
  };
}

// One game, in the same shape as a Past Games record, for the game details
// screen. Throws on a failed fetch; null if the game doesn't exist (e.g.
// just deleted).
export async function fetchGameRecord(gameId) {
  const { data: row, error } = await supabase
    .from("games")
    .select(`*, game_players(user_id, slot, team, profiles(id, display_name, avatar_url)), ${TOURNAMENT_MATCH_EMBED}`)
    .eq("id", gameId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  let submitterProfilesById = {};
  if (row.user_id) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", row.user_id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile) submitterProfilesById = { [profile.id]: profile };
  }
  return mapRowToRecord(row, submitterProfilesById);
}

export function useGameHistory() {
  const { user, displayName } = useAuth();
  const [localHistory, setLocalHistory] = useState(loadHistory);
  const [remoteHistory, setRemoteHistory] = useState(null);
  // True only while the current user's fetch is actually in flight — distinct
  // from remoteHistory being null, which also covers "fetch failed, fall
  // back to local". Lets the UI show a loading state instead of flashing
  // localHistory (which may be stale/pre-signin) and then replacing it with
  // the real remote list a moment later.
  const [remoteLoading, setRemoteLoading] = useState(false);
  // Set when addGame() couldn't keep the game safe on the phone, so the UI
  // can say so instead of only logging to console. Upload trouble itself
  // shows through the upload queue (`uploads` below), not here.
  const [saveError, setSaveError] = useState(null);
  // Games saved but not yet confirmed by the server (gameUploader.js).
  const { queue: uploadQueue, uploaded } = useSyncExternalStore(subscribeUploads, getUploadSnapshot);
  // Games uploaded while a fetch is still in flight, keyed by id. A fetch
  // that was already in flight when the upload happened can read a
  // pre-upload snapshot and resolve afterward; without this, its result
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
        .select(`*, game_players(user_id, slot, team, profiles(id, display_name, avatar_url)), ${TOURNAMENT_MATCH_EMBED}`)
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
      // A queued game the server already has got through even if the phone
      // never heard back, so it can leave the queue.
      confirmQueuedGames(confirmedIds(getUploadSnapshot().queue, fetched));
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

  // A queued game just uploaded: show it as a normal server game right away
  // (optimistically, like a fresh save always was) and reload the list so it
  // picks up player photos and anything else saved meanwhile.
  const lastUploadedRef = useRef(uploaded[0]);
  useEffect(() => {
    if (!uploaded.length || uploaded[0] === lastUploadedRef.current) return;
    const fresh = [];
    for (const g of uploaded) {
      if (g === lastUploadedRef.current) break;
      fresh.push(g);
    }
    lastUploadedRef.current = uploaded[0];
    for (const g of fresh) pendingInsertsRef.current.set(g.id, g);
    // (Not when the server list never loaded: Past Games is showing this
    // phone's own list then, which already has the game.)
    setRemoteHistory((prev) => {
      if (prev === null) return prev;
      const ids = new Set(prev.map((g) => g.id));
      return [...fresh.filter((g) => !ids.has(g.id)), ...prev];
    });
    if (isSupabaseConfigured) fetchRemoteHistory();
  }, [uploaded, fetchRemoteHistory]);

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
      // A signed-in save instead goes into the upload queue, which keeps it
      // in Past Games, marked, until the server confirms it.
      const format = game.format || "beach";
      const usesRoster = format === "indoor" || Boolean(game.teamSize);
      const goesToServer = Boolean(isSupabaseConfigured && user);
      // Picked once, here: every upload attempt sends this same id, which is
      // what lets record_game recognize a retry instead of saving it twice.
      const id = newGameId();
      const record = {
        id,
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
        submittedByUserId: user?.id ?? null,
        submittedByName: displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || null,
        synced: goesToServer,
      };

      setLocalHistory((prev) => {
        const next = [record, ...prev];
        saveHistory(next);
        return next;
      });

      if (goesToServer) {
        setSaveError(null);
        // One request (record_game, migration 20261025040000) saves the game
        // and every player link together, with the right Player 1, so the
        // Elo triggers rate it once and correctly; it either all lands or
        // none of it does.
        const stored = queueGame({
          id,
          userId: user.id,
          queuedAt: now.toISOString(),
          args: buildRecordGameArgs(game, { id, date, time, mode }),
          record,
        });
        if (!stored) {
          setSaveError(
            "This phone won't let the app keep the game for later, so it's only held while the app stays open. Keep it open until the game shows in Past Games without “waiting to upload”.",
          );
        }
      }
    },
    [user, displayName],
  );

  // Local games saved while signed out never reach `games` (its insert
  // policy requires auth.uid() = user_id), so they'd otherwise vanish from
  // Past Games the moment remoteHistory loads. Merge them back in, along
  // with every game still waiting in the upload queue, sorted alongside the
  // remote (public) history by when they were played.
  const fromServer = isSupabaseConfigured && remoteHistory !== null;
  const base = fromServer ? [...remoteHistory, ...localHistory.filter((g) => g.synced === false)] : localHistory;
  const history = mergeQueuedIntoHistory(base, uploadQueue, fromServer, user?.id ?? null);
  const historyLoading = isSupabaseConfigured && remoteLoading;
  const dismissSaveError = useCallback(() => setSaveError(null), []);
  const retryUploads = useCallback(() => flushQueue({ includeRejected: true }), []);

  return {
    history,
    addGame,
    historyLoading,
    refreshHistory: fetchRemoteHistory,
    saveError,
    dismissSaveError,
    uploadQueue,
    retryUploads,
    removeQueuedGame,
  };
}
