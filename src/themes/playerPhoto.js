// The picture to show in a player's photo circle. Their own photo (uploaded
// or from Google) wins. With no photo, a seasonal theme may lend a stand-in
// (Halloween: a pixel monster, also in place of Google's plain first-initial
// circle); otherwise null, the blank circle. Pass the raw stored photo for
// anything that's saved, never this.
import { activeTheme } from "./activeTheme.js";
import { halloweenAvatarFor } from "./halloween/avatars.js";
import { isGoogleLetterPhoto } from "./halloween/googleLetterPhotos.js";

export function playerPhoto(photoUrl, playerId, theme = activeTheme, isLetterPhoto = isGoogleLetterPhoto) {
  if (theme === "halloween" && playerId && (!photoUrl || isLetterPhoto(photoUrl))) return halloweenAvatarFor(playerId);
  return photoUrl || null;
}
