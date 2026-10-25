// Uploads the games waiting in this phone's queue (see gameUploadQueue.js),
// for the whole app, not just while the scoreboard screen is open. Tries:
//   - when the app opens and whenever someone signs in
//   - when the phone gets a connection back (the browser's "online" event)
//   - when the app comes back to the front (switching back to the tab/app)
//   - every 30 seconds while something is waiting and the app is in front
//     (phones often say they're "online" on one bar of signal that can't
//     actually reach the server, so the online event alone isn't enough)
//   - when someone taps Retry
// React reads it through subscribe/getSnapshot (useSyncExternalStore).
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import {
  QUEUE_KEY,
  WAITING,
  addToQueue,
  readQueue,
  recordFailure,
  removeFromQueue,
  applyQueueChange,
} from "./gameUploadQueue.js";

const RETRY_EVERY_MS = 30000;
const REQUEST_TIMEOUT_MS = 20000;
const storage = typeof localStorage !== "undefined" ? localStorage : null;

// `uploaded` keeps the display records of games uploaded in this session, so
// Past Games can show them straight away while it reloads from the server.
let snapshot = { queue: readQueue(storage), uploaded: [] };
const listeners = new Set();
const inFlight = new Set();
let started = false;
let timer = null;

function publish(next) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((fn) => fn());
  scheduleTimer();
}

// Storage is the working copy: every change is applied to what's stored
// right now (which may include another tab's games) and written back, and
// another tab's changes also come in through the storage event (see
// startGameUploader). If storage is blocked or full, the queue still works
// from memory for as long as the app stays open.
let storageWorks = true;
function update(change) {
  const { queue, stored } = applyQueueChange(storage, snapshot.queue, storageWorks, change);
  storageWorks = stored;
  publish({ queue });
  return stored;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSnapshot() {
  return snapshot;
}

// Called the moment a game is saved. Returns false if this phone wouldn't
// keep it (storage full/blocked), in which case it's only held in memory
// until it uploads.
export function queueGame(entry) {
  const stored = update((q) => addToQueue(q, entry));
  flushQueue();
  return stored;
}

export function removeQueuedGame(id) {
  update((q) => removeFromQueue(q, id));
}

// The server's game list already has these (a save that went through even
// though the phone never heard back).
export function confirmQueuedGames(ids) {
  if (!ids.length) return;
  update((q) => q.filter((e) => !ids.includes(e.id)));
}

// `includeRejected` is for the Retry button: games the server refused are
// otherwise left alone, since sending them again unchanged won't help.
export async function flushQueue({ includeRejected = false } = {}) {
  if (!isSupabaseConfigured) return;
  // Start from what's stored, which may include games another tab saved.
  if (storageWorks) publish({ queue: readQueue(storage) });
  const due = snapshot.queue.filter((e) => (includeRejected || e.status === WAITING) && !inFlight.has(e.id));
  if (!due.length) return;
  // Claimed before the first await so overlapping triggers (online + back
  // to the front at once) don't send the same game twice. The server would
  // shrug off a double send anyway; this just saves the request.
  due.forEach((e) => inFlight.add(e.id));
  try {
    let userId = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id ?? null;
    } catch (e) {
      /* offline or sign-in unreadable: try again later */
    }
    // Uploads go in as the signed-in player (record_game records their
    // account as the submitter), so only that player's own games are sent.
    for (const entry of due.filter((e) => e.userId === userId)) {
      // Gives up on a request after 20 seconds: on one bar of signal a
      // request can hang for minutes, which would hold up every retry. If it
      // actually got through, the next try just gets "already saved" back.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const { error } = await supabase.rpc("record_game", entry.args).abortSignal(controller.signal);
        if (error) throw error;
        update((q) => removeFromQueue(q, entry.id));
        publish({ uploaded: [{ ...entry.record, id: entry.id }, ...snapshot.uploaded].slice(0, 20) });
      } catch (error) {
        console.error("Game upload failed; it stays on this phone:", error);
        update((q) => recordFailure(q, entry.id, error));
      } finally {
        clearTimeout(timeout);
      }
    }
  } finally {
    due.forEach((e) => inFlight.delete(e.id));
  }
}

function scheduleTimer() {
  const hasWaiting = snapshot.queue.some((e) => e.status === WAITING);
  if (hasWaiting && !timer && started) {
    timer = setInterval(() => {
      if (document.visibilityState === "visible") flushQueue();
    }, RETRY_EVERY_MS);
  } else if (!hasWaiting && timer) {
    clearInterval(timer);
    timer = null;
  }
}

// Called once from main.jsx.
export function startGameUploader() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  window.addEventListener("online", () => flushQueue());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") flushQueue();
  });
  // Another tab changed the queue: pick up its version.
  window.addEventListener("storage", (e) => {
    if (e.key === QUEUE_KEY) publish({ queue: readQueue(storage) });
  });
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") setTimeout(() => flushQueue(), 0);
  });
  scheduleTimer();
  flushQueue();
}
