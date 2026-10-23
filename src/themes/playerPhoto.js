// The picture to show in a player's photo circle. Their own photo (uploaded
// or from Google) always wins. With no photo, a seasonal theme may lend a
// stand-in (Halloween: a pixel monster); otherwise null, the blank circle.
// Pass the raw stored photo for anything that's saved, never this.
import { activeTheme } from "./activeTheme.js";
import { halloweenAvatarFor } from "./halloween/avatars.js";

export function playerPhoto(photoUrl, playerId, theme = activeTheme) {
  if (photoUrl) return photoUrl;
  if (theme === "halloween" && playerId) return halloweenAvatarFor(playerId);
  return null;
}
