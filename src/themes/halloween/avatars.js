// Halloween stand-in profile pictures: 100 pixel-art monsters (10 archetypes
// x 10 goofy variants, drawn by avatars/generate.mjs). Only players with no
// photo of their own get one, and only on screen while the theme is on;
// nothing is saved to anyone's profile. See src/themes/playerPhoto.js.
const files = import.meta.glob("./avatars/*.svg", { eager: true, query: "?url", import: "default" });
export const HALLOWEEN_AVATARS = Object.keys(files)
  .sort()
  .map((path) => files[path]);

// Same player, same monster on every screen and every visit: the pick is a
// hash of their profile id, so it looks random across players but never
// changes for one.
export function halloweenAvatarIndex(playerId) {
  let h = 2166136261;
  for (const ch of String(playerId)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % HALLOWEEN_AVATARS.length;
}

export function halloweenAvatarFor(playerId) {
  return HALLOWEEN_AVATARS[halloweenAvatarIndex(playerId)];
}
