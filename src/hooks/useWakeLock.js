import { useEffect } from "react";

// Keeps the phone's screen on while `active` (the live scoreboard), so it
// doesn't dim and lock between rallies. The browser drops the lock whenever
// the app is hidden, so it's asked for again on coming back. Browsers
// without the Screen Wake Lock API, or that refuse (e.g. battery saver),
// just behave as before.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.wakeLock) return undefined;
    let lock = null;
    // One request at a time, so no lock is left unreleased; a call during
    // one is remembered and tried once it settles.
    let requesting = false;
    let askedAgain = false;
    let stopped = false;

    async function acquire() {
      if (requesting) {
        askedAgain = true;
        return;
      }
      if (stopped || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) next.release().catch(() => {});
        else lock = next;
      } catch {
        // Not allowed right now; nothing to do.
      } finally {
        requesting = false;
      }
      if (askedAgain) {
        askedAgain = false;
        acquire();
      }
    }

    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
