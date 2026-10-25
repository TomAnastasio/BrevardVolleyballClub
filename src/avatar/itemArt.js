import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LOOK } from "./engine.js";

// Runs load() once and shares the result, but forgets a failure so the next
// call tries again (a network blip shouldn't break a screen until reload).
export function shareUntilFailure(load) {
  let promise = null;
  return () => {
    promise ??= load().catch((err) => {
      promise = null;
      throw err;
    });
    return promise;
  };
}

// The item art (./art) is a few hundred KB of drawing code, so it's loaded
// on demand the first time a screen needs it, then shared.
export const loadItemArt = shareUntilFailure(() => import("./art/index.js").then((m) => m.ART));

// { art, error, retry }: the art map once it has loaded (null until then),
// the error if loading failed, and a way to try again. Pass false to hold
// off loading it (e.g. nobody on screen wears anything).
export function useItemArtStatus(enabled = true) {
  const [state, setState] = useState({ art: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loadItemArt().then(
      (art) => {
        if (!cancelled) setState({ art, error: null });
      },
      (error) => {
        console.error("Failed to load item art:", error);
        if (!cancelled) setState((s) => ({ ...s, error }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);
  const retry = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
    setAttempt((n) => n + 1);
  }, []);
  return { ...state, retry };
}

// Just the art map, for screens that only show avatars: until it loads (or
// if it can't), items are drawn plain.
export function useItemArt(enabled = true) {
  return useItemArtStatus(enabled).art;
}

export const SLOTS = ["head", "shirt", "pants", "shoes"];

// What drawAvatar takes for an outfit row ({ head, shirt, pants, shoes,
// transformation } of item keys, plus avatar and skin; any may be missing).
// A transformation covers the whole outfit. Items are drawn once `art` has
// loaded; keys without art (e.g. an item added to the database before the
// app caught up) are drawn plain.
export function gearFor(outfit, art) {
  if (!outfit) return null;
  const item = (key) => (key && art?.get(key)?.item) || null;
  if (outfit.transformation && item(outfit.transformation)) return { transformation: item(outfit.transformation) };
  const look = { avatar: outfit.avatar ?? DEFAULT_LOOK.avatar, skin: outfit.skin ?? DEFAULT_LOOK.skin };
  return { ...Object.fromEntries(SLOTS.map((s) => [s, item(outfit[s])])), look };
}

// True if the outfit has any item on (so its art is needed).
export const wearsSomething = (outfit) => Boolean(outfit && [...SLOTS, "transformation"].some((s) => outfit[s]));
