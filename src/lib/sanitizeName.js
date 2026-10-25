export function sanitizeName(text, fallback) {
  let cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) cleaned = fallback;
  if (cleaned.length > 24) cleaned = cleaned.slice(0, 24);
  return cleaned;
}

// What a profile with no name is called. The database gives every profile
// a name (migration 20261025030000 uses this same placeholder), so this is
// only a safety net for screens that must never be blocked by a blank one.
export const NAMELESS_PLAYER = "New player";
export const nameOrPlaceholder = (name) => (name && name.trim() ? name : NAMELESS_PLAYER);
