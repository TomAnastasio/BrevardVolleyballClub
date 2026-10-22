const TOURNAMENT_PARAM = "t";
const PENDING_KEY = "bvc-pending-tournament";
const PENDING_TTL_MS = 10 * 60 * 1000;

// Shareable public link to one tournament's live page, e.g.
// brevardvolleyballclub.com/?t=<id>. Unlike `?join`, the param stays in the
// address bar while the page is open so a reload or a shared link keeps
// working.
export function buildTournamentUrl(origin, id, basePath = "/") {
  return `${origin}${basePath}?${TOURNAMENT_PARAM}=${encodeURIComponent(id)}`;
}

export function readTournamentParam(search) {
  const value = new URLSearchParams(search).get(TOURNAMENT_PARAM);
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export function setTournamentParam(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(TOURNAMENT_PARAM, id);
  else url.searchParams.delete(TOURNAMENT_PARAM);
  window.history.replaceState(window.history.state, "", url);
}

// The Google sign-in redirect returns to the site root without `?t`, so
// remember which tournament the player was on (same sessionStorage + TTL
// breadcrumb approach as pendingGameTracking.js).
export function setPendingTournament(id) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ id, expiresAt: Date.now() + PENDING_TTL_MS }));
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
}

export function consumePendingTournament() {
  let raw = null;
  try {
    raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch (e) {
    return null;
  }
  try {
    const pending = JSON.parse(raw);
    return pending && typeof pending.id === "string" && Date.now() < pending.expiresAt ? pending.id : null;
  } catch (e) {
    return null;
  }
}
