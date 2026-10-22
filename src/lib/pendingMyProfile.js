const PENDING_MY_PROFILE_KEY = "bvc-pending-my-profile";
const PENDING_MY_PROFILE_TTL_MS = 5 * 60 * 1000;

// Written right before the Google redirect from the home screen's "Sign in"
// button, so that once the full-page OAuth round trip remounts the app it
// opens the player's own profile instead of the landing page. Same
// sessionStorage + TTL breadcrumb approach as pendingGameTracking.js.
export function setPendingMyProfile() {
  try {
    sessionStorage.setItem(PENDING_MY_PROFILE_KEY, JSON.stringify({ expiresAt: Date.now() + PENDING_MY_PROFILE_TTL_MS }));
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
}

// Destructive read used once at app boot.
export function consumePendingMyProfile() {
  let raw = null;
  try {
    raw = sessionStorage.getItem(PENDING_MY_PROFILE_KEY);
    sessionStorage.removeItem(PENDING_MY_PROFILE_KEY);
  } catch (e) {
    return false;
  }
  try {
    const pending = JSON.parse(raw);
    return Boolean(pending) && typeof pending.expiresAt === "number" && Date.now() < pending.expiresAt;
  } catch (e) {
    return false;
  }
}
