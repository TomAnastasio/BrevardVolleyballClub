// Games saved on this phone that the server hasn't confirmed yet. Pure
// helpers only (no Supabase, no React) so they can be unit tested; the
// uploading itself lives in gameUploader.js.
//
// A game goes into the queue (localStorage) the moment Save is pressed,
// before any upload is tried, and only leaves it once the server has said
// it's saved. Each game carries the id the phone picked for it, and
// record_game (migration 20261025040000) treats a second upload with the
// same id as "already saved", so retrying can never create a duplicate.

export const QUEUE_KEY = "bvc-game-upload-queue-v1";

// "waiting": not uploaded yet, retried automatically (no signal, server
// unreachable, signed out...). "rejected": the server looked at the game and
// refused it, so retrying on its own won't help; it stays on the phone until
// someone taps Retry or Remove.
export const WAITING = "waiting";
export const REJECTED = "rejected";

export function newGameId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Older browsers / non-https: a version 4 UUID from getRandomValues.
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function isEntry(e) {
  return Boolean(e) && typeof e.id === "string" && typeof e.userId === "string" && e.args && e.record;
}

export function readQueue(storage) {
  try {
    const raw = storage?.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch (e) {
    return [];
  }
}

// Returns false if the phone wouldn't store it (private mode, full storage),
// so the caller can say so instead of pretending the game is safe.
export function writeQueue(storage, queue) {
  try {
    if (queue.length) storage.setItem(QUEUE_KEY, JSON.stringify(queue));
    else storage.removeItem(QUEUE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

// Applies one change to the queue as stored on the phone, not to this tab's
// copy, so two open tabs can't wipe out each other's queued games. Falls
// back to this tab's copy only when storage doesn't work at all (then the
// queue lives in memory until the app is closed). Returns the new queue and
// whether it was stored.
export function applyQueueChange(storage, memoryQueue, storageWorks, change) {
  const queue = change(storageWorks ? readQueue(storage) : memoryQueue);
  return { queue, stored: writeQueue(storage, queue) };
}

export function addToQueue(queue, entry) {
  if (queue.some((e) => e.id === entry.id)) return queue;
  return [...queue, { status: WAITING, attempts: 0, lastError: null, ...entry }];
}

export function removeFromQueue(queue, id) {
  return queue.filter((e) => e.id !== id);
}

export function recordFailure(queue, id, error) {
  const status = classifyUploadError(error);
  return queue.map((e) =>
    e.id === id
      ? { ...e, status, attempts: (e.attempts || 0) + 1, lastError: status === REJECTED ? errorText(error) : null }
      : e,
  );
}

// A refusal the server made on purpose (record_game's checks raise P0001;
// bad values are 22xxx; constraints 23xxx) won't go away by retrying.
// Anything else -- no connection ("Failed to fetch", no code), a timeout, an
// expired sign-in, the server briefly down or not updated yet -- might, so
// keep retrying quietly.
export function classifyUploadError(error) {
  const code = String(error?.code || "");
  return code === "P0001" || /^2[23]/.test(code) ? REJECTED : WAITING;
}

function errorText(error) {
  const msg = String(error?.message || "").trim();
  if (!msg) return "The server refused it.";
  return msg.charAt(0).toUpperCase() + msg.slice(1) + (/[.!?]$/.test(msg) ? "" : ".");
}

// The arguments for record_game, built once when the game is saved so a
// retry days later sends exactly the same thing.
export function buildRecordGameArgs(game, { id, date, time, mode }) {
  const format = game.format === "indoor" ? "indoor" : "beach";
  const teamSize = format === "beach" && (game.teamSize === 3 || game.teamSize === 4) ? game.teamSize : null;
  const usesRoster = format === "indoor" || teamSize !== null;
  const participants = game.participants || [];
  const slot = (s) => participants.find((p) => p.slot === s)?.userId ?? null;
  const team = (t) => participants.filter((p) => p.team === t).map((p) => p.userId);
  return {
    p_game_id: id,
    p_name_a: game.nameA,
    p_name_b: game.nameB,
    p_score_a: game.a,
    p_score_b: game.b,
    p_mode: mode,
    p_format: format,
    p_team_size: teamSize,
    p_played_date: date,
    p_played_time: time,
    p_a1: usesRoster ? null : game.playerIdA1 ?? null,
    p_a2: usesRoster ? null : slot("a2"),
    p_b1: usesRoster ? null : slot("b1"),
    p_b2: usesRoster ? null : slot("b2"),
    p_team_a: usesRoster ? team("a") : null,
    p_team_b: usesRoster ? team("b") : null,
  };
}

// Past Games list: the server's games (or this phone's own list when the
// server can't be reached), with every game still in the queue shown too,
// marked as not uploaded. When `base` came from the server, a queued game it
// already has was saved (the server copy wins); when it's this phone's own
// list, the queued copy replaces the phone's plain copy. `tried` is false
// only while the first upload by the signed-in player (`userId`) is still
// under way; a game nobody signed in can upload counts as tried.
export function mergeQueuedIntoHistory(base, queue, baseIsServer, userId = null) {
  const baseIds = new Set(base.map((g) => g.id));
  const pending = queue.filter((e) => !(baseIsServer && baseIds.has(e.id)));
  const pendingIds = new Set(pending.map((e) => e.id));
  const merged = [
    ...base.filter((g) => !pendingIds.has(g.id)),
    ...pending.map((e) => ({
      ...e.record,
      id: e.id,
      upload: { status: e.status, error: e.lastError, tried: (e.attempts || 0) > 0 || e.userId !== userId },
    })),
  ];
  return merged.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

// Queued games the server list shows, i.e. saved even if the phone never
// heard back; safe to drop from the queue.
export function confirmedIds(queue, serverHistory) {
  const ids = new Set(serverHistory.map((g) => g.id));
  return queue.filter((e) => ids.has(e.id)).map((e) => e.id);
}

// One short, plain line for the banner above Past Games and the scoreboard
// menu, or null when nothing is waiting. A game whose first upload is still
// under way doesn't count yet, so a normal save doesn't flash a warning.
export function queueSummary(queue, userId) {
  if (!queue.length) return null;
  const mine = queue.filter((e) => e.userId === userId);
  const rejected = mine.filter((e) => e.status === REJECTED);
  const waiting = mine.filter((e) => e.status !== REJECTED && (e.attempts || 0) > 0).length;
  const others = queue.length - mine.length;
  const games = (n) => (n === 1 ? "1 game" : `${n} games`);
  if (rejected.length) {
    return {
      tone: "error",
      text: `${games(rejected.length)} couldn't be uploaded and ${rejected.length === 1 ? "is" : "are"} only on this phone. Open Past Games to see why.`,
    };
  }
  if (waiting) {
    return {
      tone: "info",
      text: `${games(waiting)} saved on this phone, waiting to upload. ${waiting === 1 ? "It" : "They"}'ll upload by ${waiting === 1 ? "itself" : "themselves"} when you have signal.`,
    };
  }
  if (!others) return null;
  return {
    tone: "info",
    text: userId
      ? `${games(others)} saved on this phone by another account. Sign in as that player to upload ${others === 1 ? "it" : "them"}.`
      : `${games(others)} saved on this phone, waiting to upload. Sign in to upload ${others === 1 ? "it" : "them"}.`,
  };
}
