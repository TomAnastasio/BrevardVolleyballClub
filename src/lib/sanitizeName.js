// Longest player name the app lets anyone type: the scoreboard's editable
// names, the new-game player fields and admin renames all stop here. A
// 2v2 team name is two of these joined with " & ", well inside the 100
// characters record_game accepts (migration 20261025040000).
export const MAX_NAME_LENGTH = 24;

export function sanitizeName(text, fallback) {
  let cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) cleaned = fallback;
  if (cleaned.length > MAX_NAME_LENGTH) cleaned = cleaned.slice(0, MAX_NAME_LENGTH);
  return cleaned;
}

// What a profile with no name is called. The database gives every profile
// a name (migration 20261025030000 uses this same placeholder), so this is
// only a safety net for screens that must never be blocked by a blank one.
export const NAMELESS_PLAYER = "New player";
export const nameOrPlaceholder = (name) => (name && name.trim() ? name : NAMELESS_PLAYER);
