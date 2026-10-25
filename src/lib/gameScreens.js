// Game-tracking screens (GameTrackingShell.jsx): where "‹ Back" goes from
// each one.
const BACK_MAP = {
  signin: "menu",
  entry: "menu",
  format: "entry",
  "beach-size": "format",
  new: "mode",
  active: "menu",
  history: "menu",
  "final-score": "new",
};

// "mode" depends on whether the beach team-size step was shown.
export function previousScreen(screen, pendingFormat) {
  if (screen === "mode") return pendingFormat === "beach" ? "beach-size" : "format";
  return BACK_MAP[screen] || "menu";
}

// How many Back presses from the game menu, so the phone's Back button
// walks the same path (src/lib/backNavigation.js).
export function screenDepth(screen, pendingFormat) {
  let depth = 0;
  for (let s = screen; s !== "menu" && depth < 20; s = previousScreen(s, pendingFormat)) depth += 1;
  return depth;
}
