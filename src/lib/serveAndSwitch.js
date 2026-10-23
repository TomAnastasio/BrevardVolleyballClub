// Point-order helpers for the portrait scoreboard's serve marker and beach
// side-switch reminder. `points` is the order teams scored in ("a"/"b"),
// kept only in the phone's saved scoreboard state — never sent to Supabase.

export const SWITCH_EVERY = 7;

export function addPoint(points, team) {
  return [...points, team];
}

// −1 takes back that team's most recent point, so the order stays in step
// with the score even when the fix isn't for the very last rally.
export function removePoint(points, team) {
  const i = points.lastIndexOf(team);
  if (i === -1) return points;
  return [...points.slice(0, i), ...points.slice(i + 1)];
}

// Rally scoring: whoever won the last rally serves next. Unknown before the
// first point (the coin toss isn't tracked).
export function servingTeam(points) {
  return points.length ? points[points.length - 1] : null;
}

// Beach teams switch sides every 7 combined points.
export function isSwitchPoint(totalPoints) {
  return totalPoints > 0 && totalPoints % SWITCH_EVERY === 0;
}

export function pointsUntilSwitch(totalPoints) {
  return SWITCH_EVERY - (totalPoints % SWITCH_EVERY);
}

// Saved games from before point order was tracked (or junk in storage):
// keep only valid entries, and drop it entirely if it no longer adds up to
// the score, so the serve marker never points at the wrong team.
export function sanitizePoints(points, a, b) {
  if (!Array.isArray(points)) return [];
  const clean = points.filter((p) => p === "a" || p === "b");
  const countA = clean.filter((p) => p === "a").length;
  return countA === a && clean.length - countA === b ? clean : [];
}
