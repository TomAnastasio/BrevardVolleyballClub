// Makes the phone's Back button (and browser back / back swipe) step back
// through the app's own screens, exactly like the in-app "‹ Back" buttons.
//
// All navigation is React state (App.jsx views and pages, the game-tracking
// and admin sub-screens), so the address never changes. Each of those
// screens registers a "layer": how many Back presses it is from its own
// root (its depth) and what its in-app Back does. The total depth is how
// many history entries the app keeps above the page it was opened on:
// going deeper pushes entries, any in-app Back (or a jump home) removes
// them, and a Back press from the phone lands on the entry below, where we
// run the topmost layer's in-app Back. At the app's root there's nothing
// left to pop, so Back leaves the site as usual.
//
// History entries carry { bvcNav: { session, depth, serial } }. A reload
// starts a new session showing home; entries left over from before it are
// skipped.
//
// Something else can add an entry too: Google sign-in returns with
// #access_token=… and Supabase clears it with `location.hash = ""`, which
// adds a stateless entry on top of ours. Such an entry is stamped with the
// depth we're at, so it counts as a duplicate of the screen below it; a Back
// that lands on an older duplicate keeps going, so no press is wasted.

const NAV_KEY = "bvcNav";

export function createBackNavigation(win) {
  const history = win.history;
  const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const layers = new Map(); // id -> { priority, depth, back }
  let nextId = 1;
  let index = 0; // depth of the history entry we're on
  let pending = false; // a history.go() we started hasn't landed yet
  let syncQueued = false;
  let pendingTimer = null;
  let nextSerial = 1;
  let serial = 0; // serial of the entry we're on (higher = created later)

  const stateFor = (depth) => {
    serial = nextSerial++;
    return { ...(history.state || {}), [NAV_KEY]: { session, depth, serial } };
  };

  // Claim the entry the app was opened on as the root. Keep any other
  // state on it (joinLink / tournamentLink preserve it when they rewrite ?t=).
  history.replaceState(stateFor(0), "");

  // An entry someone else added (a hash change): make it ours, at our depth.
  function stampCurrentEntry() {
    if (history.state?.[NAV_KEY]?.session === session) return false;
    history.replaceState(stateFor(index), "");
    return true;
  }

  function setPending(on) {
    pending = on;
    clearTimeout(pendingTimer);
    // Safety net: if our history.go() never reports landing, read where we
    // are and carry on rather than stop syncing for good.
    if (on) {
      pendingTimer = setTimeout(() => {
        pending = false;
        const nav = history.state?.[NAV_KEY];
        if (nav?.session === session) {
          index = nav.depth;
          serial = nav.serial;
        } else {
          stampCurrentEntry();
        }
        scheduleSync();
      }, 1500);
    }
  }

  function totalDepth() {
    let sum = 0;
    for (const layer of layers.values()) sum += Math.max(0, layer.depth);
    return sum;
  }

  function topLayer() {
    let top = null;
    for (const layer of layers.values()) {
      if (layer.depth > 0 && (!top || layer.priority >= top.priority)) top = layer;
    }
    return top;
  }

  function sync() {
    syncQueued = false;
    if (pending) return;
    // Covers an entry added behind our back without any event.
    stampCurrentEntry();
    const target = totalDepth();
    while (index < target) {
      index += 1;
      history.pushState(stateFor(index), "");
    }
    if (index > target) {
      setPending(true);
      history.go(target - index);
    }
  }

  // Coalesced, so a screen unmounting and the next one mounting in the same
  // render (or StrictMode's mount-unmount-mount) costs no history traffic.
  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    queueMicrotask(sync);
  }

  function onPopState(event) {
    const nav = event.state?.[NAV_KEY];
    if (!nav) {
      // A same-page entry with no state: normally one just created by a hash
      // change (browsers report those as popstate too). Not our go() landing,
      // so a pending one stays pending.
      if (stampCurrentEntry()) scheduleSync();
      return;
    }
    const wasPending = pending;
    const fromSerial = serial;
    setPending(false);
    if (nav.session !== session) {
      // Back went below our root: onto an entry from before a reload (skip
      // those, back to where that older session started) or off the app.
      if (nav && nav.depth > 0) history.go(-nav.depth);
      return;
    }
    serial = nav.serial;
    if (!wasPending && nav.depth === index && nav.serial < fromSerial) {
      // Back onto an older duplicate of this screen (see above): nothing to
      // undo here, so take the step the person asked for.
      history.go(-1);
      return;
    }
    if (nav.depth < index && !wasPending) {
      // The phone's Back: do what the screen's own Back button does. Its
      // depth drops by one and the layers re-sync from there.
      index = nav.depth;
      topLayer()?.back();
      // Normally the screen's depth change re-syncs. If its Back did nothing
      // (depth unchanged), put the entry back once React has settled.
      setTimeout(scheduleSync, 500);
      return;
    }
    // Our own history.go() landing, or the browser's Forward button (which
    // the app can't replay, so it's undone).
    index = nav.depth;
    scheduleSync();
  }

  // Browsers that don't report a hash change as popstate still send this.
  function onHashChange() {
    if (stampCurrentEntry()) scheduleSync();
  }

  win.addEventListener("popstate", onPopState);
  win.addEventListener("hashchange", onHashChange);

  return {
    // Register a screen's layer; returns an id for update/remove.
    add(priority, depth, back) {
      const id = nextId++;
      layers.set(id, { priority, depth, back });
      scheduleSync();
      return id;
    },
    update(id, depth) {
      const layer = layers.get(id);
      if (!layer || layer.depth === depth) return;
      layer.depth = depth;
      scheduleSync();
    },
    remove(id) {
      if (layers.delete(id)) scheduleSync();
    },
    // For tests.
    get index() {
      return index;
    },
    totalDepth,
    destroy() {
      win.removeEventListener("popstate", onPopState);
      win.removeEventListener("hashchange", onHashChange);
      clearTimeout(pendingTimer);
    },
  };
}

let shared = null;

export function backNavigation() {
  if (!shared && typeof window !== "undefined") shared = createBackNavigation(window);
  return shared;
}
