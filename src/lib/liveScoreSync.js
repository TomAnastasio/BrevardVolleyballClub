// Whether another phone changed a tournament game's live score after this
// phone's last tap (TournamentScoreScreen.jsx): the server's score was
// updated later than `tappedAt` (ms), and isn't `known`, the last score
// this phone itself sent or saw there. The `known` check means this
// phone's own pushes never count, however wrong its clock is.
export function updatedElsewhere({ known, tappedAt }, a, b, updatedAt) {
  if (known && known.a === a && known.b === b) return false;
  return Boolean(updatedAt) && Date.parse(updatedAt) > (tappedAt || 0);
}
