const PENDING_RANKED_GAME_KEY = "bvc-pending-ranked-game";
const PENDING_RANKED_GAME_TTL_MS = 5 * 60 * 1000;

function readRaw() {
  try {
    return sessionStorage.getItem(PENDING_RANKED_GAME_KEY);
  } catch (e) {
    return null;
  }
}

function parseIfFresh(raw) {
  if (!raw) return null;
  let pending;
  try {
    pending = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (!pending || typeof pending.expiresAt !== "number") return null;
  if (Date.now() >= pending.expiresAt) return null;
  return pending;
}

// Written right before the Google OAuth redirect so the app can find its way
// back to the in-progress ranked game setup once the full-page round trip
// remounts everything from scratch.
export function setPendingRankedGame(format) {
  try {
    sessionStorage.setItem(
      PENDING_RANKED_GAME_KEY,
      JSON.stringify({ format, expiresAt: Date.now() + PENDING_RANKED_GAME_TTL_MS }),
    );
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
}

// Non-destructive check used at app boot to decide which top-level view to
// render, before anything is ready to actually consume the breadcrumb.
export function hasPendingRankedGame() {
  return parseIfFresh(readRaw()) !== null;
}

// Destructive read used once the game tracking screen is mounted and able to
// act on the breadcrumb.
export function consumePendingRankedGame() {
  const raw = readRaw();
  try {
    sessionStorage.removeItem(PENDING_RANKED_GAME_KEY);
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
  return parseIfFresh(raw);
}
