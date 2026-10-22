const JOIN_PARAM = "join";
const JUST_JOINED_KEY = "bvc-just-joined";
const JUST_JOINED_TTL_MS = 5 * 60 * 1000;

// The URL the admin's "Sign-Up QR Code" screen encodes. Scanning it opens the
// app with `?join=1`, which sends a signed-out visitor straight to Google
// sign-in — and first sign-in is what creates their player profile (the
// `handle_new_user` trigger on auth.users), so no extra sign-up step exists.
export function buildJoinUrl(origin, basePath = "/") {
  return `${origin}${basePath}?${JOIN_PARAM}=1`;
}

export function isJoinRequested(search) {
  return new URLSearchParams(search).has(JOIN_PARAM);
}

// Strips `?join` from the address bar so a later reload or bookmark doesn't
// re-trigger the sign-in redirect.
export function clearJoinParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete(JOIN_PARAM);
  window.history.replaceState(window.history.state, "", url);
}

// Breadcrumb written right before the Google redirect so that, once the
// full-page OAuth round trip remounts the app, it lands on the welcome
// screen instead of the landing page. Same sessionStorage + TTL approach as
// pendingGameTracking.js.
export function setJustJoined() {
  try {
    sessionStorage.setItem(JUST_JOINED_KEY, JSON.stringify({ expiresAt: Date.now() + JUST_JOINED_TTL_MS }));
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
}

// Destructive read used once at app boot.
export function consumeJustJoined() {
  let raw = null;
  try {
    raw = sessionStorage.getItem(JUST_JOINED_KEY);
    sessionStorage.removeItem(JUST_JOINED_KEY);
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
