const PENDING_GAME_TRACKING_KEY = "bvc-pending-game-tracking";
const PENDING_GAME_TRACKING_TTL_MS = 5 * 60 * 1000;

function readRaw() {
  try {
    return sessionStorage.getItem(PENDING_GAME_TRACKING_KEY);
  } catch (e) {
    return null;
  }
}

function isFresh(raw) {
  if (!raw) return false;
  let pending;
  try {
    pending = JSON.parse(raw);
  } catch (e) {
    return false;
  }
  return Boolean(pending) && typeof pending.expiresAt === "number" && Date.now() < pending.expiresAt;
}

// Written right before the Google OAuth redirect so the app can find its way
// back to Game Tracking once the full-page round trip remounts everything
// from scratch. No game details to carry anymore — sign-in now happens
// before format/mode/player selection, so there's nothing in progress yet.
export function setPendingGameTracking() {
  try {
    sessionStorage.setItem(
      PENDING_GAME_TRACKING_KEY,
      JSON.stringify({ expiresAt: Date.now() + PENDING_GAME_TRACKING_TTL_MS }),
    );
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
}

// Non-destructive check used at app boot to decide which top-level view to
// render, before anything is ready to actually consume the breadcrumb.
export function hasPendingGameTracking() {
  return isFresh(readRaw());
}

// Destructive read used once the game tracking screen is mounted, so the
// breadcrumb doesn't linger and wrongly redirect a later, unrelated visit
// within the TTL window.
export function consumePendingGameTracking() {
  const raw = readRaw();
  try {
    sessionStorage.removeItem(PENDING_GAME_TRACKING_KEY);
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
  return isFresh(raw);
}
