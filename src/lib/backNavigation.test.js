import { describe, expect, it, vi } from "vitest";
import { createBackNavigation } from "./backNavigation.js";

// A minimal browser history: a list of entries, an index, and popstate
// fired asynchronously after go(), like real browsers.
function fakeWindow(initialEntries = [{ state: null }]) {
  const listeners = { popstate: new Set(), hashchange: new Set() };
  const fire = (type, event) => listeners[type].forEach((fn) => fn(event));
  const win = {
    entries: initialEntries.map((e) => ({ ...e })),
    i: initialEntries.length - 1,
    left: false,
    history: {
      get state() {
        return win.entries[win.i].state;
      },
      pushState(state) {
        win.entries = win.entries.slice(0, win.i + 1);
        win.entries.push({ state });
        win.i += 1;
      },
      replaceState(state) {
        win.entries[win.i] = { state };
      },
      go(delta) {
        const next = win.i + delta;
        if (next < 0) {
          win.left = true;
          return;
        }
        if (next >= win.entries.length) return;
        win.i = next;
        setTimeout(() => {
          fire("popstate", { state: win.entries[win.i].state });
          if (win.entries[win.i].hash !== win.entries[win.i - delta]?.hash) fire("hashchange", {});
        }, 0);
      },
    },
    addEventListener: (type, fn) => listeners[type].add(fn),
    removeEventListener: (type, fn) => listeners[type].delete(fn),
    back: () => win.history.go(-1),
    // `location.hash = ...`: a new entry with no state. Chromium reports it
    // as popstate (state null) then hashchange; `events: false` adds it
    // silently.
    setHash(hash, { events = true } = {}) {
      win.entries = win.entries.slice(0, win.i + 1);
      win.entries.push({ state: null, hash });
      win.i += 1;
      if (events) {
        fire("popstate", { state: null });
        fire("hashchange", {});
      }
    },
    fire,
  };
  return win;
}

const settle = () => new Promise((r) => setTimeout(r, 5));

describe("backNavigation", () => {
  it("pushes one entry per level and runs the top screen's Back on the phone's Back", async () => {
    const win = fakeWindow();
    const nav = createBackNavigation(win);
    let viewDepth = 0;
    const view = nav.add(0, 0, () => nav.update(view, (viewDepth = 0)));
    nav.update(view, (viewDepth = 1));
    await settle();
    expect(win.entries).toHaveLength(2);

    // A page stacked on top (game details).
    const pageBack = vi.fn(() => nav.update(pages, 0));
    const pages = nav.add(2, 1, pageBack);
    await settle();
    expect(win.entries).toHaveLength(3);

    win.back();
    await settle();
    expect(pageBack).toHaveBeenCalledTimes(1);
    expect(nav.index).toBe(1);
    expect(win.i).toBe(1);

    win.back();
    await settle();
    expect(viewDepth).toBe(0);
    expect(win.i).toBe(0);
  });

  it("an in-app Back removes the entry without running Back twice", async () => {
    const win = fakeWindow();
    const nav = createBackNavigation(win);
    const back = vi.fn();
    const id = nav.add(1, 3, back);
    await settle();
    expect(win.i).toBe(3);

    nav.update(id, 2); // in-app Back button
    await settle();
    expect(win.i).toBe(2);
    expect(back).not.toHaveBeenCalled();

    nav.update(id, 0); // jump home (e.g. Save Game from deep in a flow)
    await settle();
    expect(win.i).toBe(0);
    expect(back).not.toHaveBeenCalled();
  });

  it("coalesces a screen swap in the same tick into no history traffic", async () => {
    const win = fakeWindow();
    const nav = createBackNavigation(win);
    const a = nav.add(1, 1, () => {});
    await settle();
    nav.remove(a);
    nav.add(1, 1, () => {});
    await settle();
    expect(win.entries).toHaveLength(2);
    expect(win.i).toBe(1);
  });

  it("depth changes while a go() is in flight wait for it to land", async () => {
    const win = fakeWindow();
    const nav = createBackNavigation(win);
    const id = nav.add(1, 4, () => {});
    await settle();
    nav.update(id, 1);
    await Promise.resolve();
    nav.update(id, 2);
    await settle();
    expect(win.i).toBe(2);
    expect(nav.index).toBe(2);
  });

  it("undoes the browser's Forward button", async () => {
    const win = fakeWindow();
    const nav = createBackNavigation(win);
    const id = nav.add(1, 2, () => {});
    await settle();
    nav.update(id, 0);
    await settle();
    expect(win.i).toBe(0);
    win.history.go(1);
    await settle();
    await settle();
    expect(win.i).toBe(0);
  });

  it("stamps an entry added by a hash change (Google sign-in) and still steps back through it", async () => {
    const win = fakeWindow();
    const nav = createBackNavigation(win);
    const back = vi.fn(() => nav.update(view, 0));
    const view = nav.add(0, 0, back);
    await settle();
    win.setHash(""); // Supabase clearing #access_token after init
    await settle();
    expect(win.history.state.bvcNav.depth).toBe(0);

    nav.update(view, 1); // open Rankings
    await settle();
    expect(win.entries).toHaveLength(3);

    win.back(); // phone Back: home
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
    expect(win.left).toBe(false);

    win.back(); // lands on the older duplicate of home, keeps going: leaves the site
    await settle();
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
    expect(win.left).toBe(true);
  });

  it("stamps a stateless entry added without any event before pushing over it", async () => {
    const win = fakeWindow();
    const nav = createBackNavigation(win);
    const back = vi.fn(() => nav.update(view, 0));
    const view = nav.add(0, 0, back);
    await settle();
    win.setHash("", { events: false });
    nav.update(view, 1);
    await settle();
    expect(win.entries[1].state.bvcNav.depth).toBe(0);

    win.back();
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("in-app Backs after a hash entry never go past the root", async () => {
    const win = fakeWindow([{ state: null }, { state: null }]); // a page before the app
    const nav = createBackNavigation(win);
    const id = nav.add(1, 0, () => {});
    await settle();
    win.setHash("");
    nav.update(id, 2);
    await settle();
    nav.update(id, 1);
    await settle();
    nav.update(id, 0);
    await settle();
    await settle();
    expect(win.left).toBe(false);
    expect(win.i).toBeGreaterThanOrEqual(1);
    expect(win.history.state.bvcNav.depth).toBe(0);
    expect(nav.index).toBe(0);
  });

  it("a stateless popstate during our own go() leaves it pending until it lands", async () => {
    const win = fakeWindow();
    const nav = createBackNavigation(win);
    const back = vi.fn();
    const id = nav.add(1, 2, back);
    await settle();
    nav.update(id, 0);
    await Promise.resolve(); // go(-2) started
    win.fire("popstate", { state: null });
    nav.update(id, 1); // must wait for the landing
    await settle();
    await settle();
    expect(back).not.toHaveBeenCalled();
    expect(win.i).toBe(1);
    expect(nav.index).toBe(1);
  });

  it("keeps existing state on the root entry and skips entries left from before a reload", async () => {
    const old = { session: "old", depth: 0 };
    const win = fakeWindow([
      { state: { bvcNav: old } },
      { state: { bvcNav: { session: "old", depth: 1 } } },
      { state: { bvcNav: { session: "old", depth: 2 }, other: 1 } },
    ]);
    const nav = createBackNavigation(win);
    expect(win.history.state.other).toBe(1);
    expect(win.history.state.bvcNav.depth).toBe(0);
    expect(nav.totalDepth()).toBe(0);

    win.back(); // lands on old depth-1 entry, skipped down to the old root
    await settle();
    await settle();
    expect(win.i).toBe(0);
  });
});
