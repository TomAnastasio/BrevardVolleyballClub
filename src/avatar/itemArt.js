import { useEffect, useState } from "react";
import { DEFAULT_LOOK } from "./engine.js";

// The item art (./art) is a few hundred KB of drawing code, so it's loaded
// on demand the first time a screen needs it, then shared.
let artPromise = null;
export function loadItemArt() {
  artPromise ??= import("./art/index.js").then((m) => m.ART);
  return artPromise;
}

// The art map once it has loaded (null until then). Pass false to hold off
// loading it (e.g. nobody on screen wears anything).
export function useItemArt(enabled = true) {
  const [art, setArt] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loadItemArt().then((a) => {
      if (!cancelled) setArt(a);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return art;
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
