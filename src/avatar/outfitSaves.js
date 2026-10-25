// Outfit changes the Locker has shown but the database may not have caught
// up with yet. Each save is { id, change, userId, confirmedFrom }: change(outfit)
// gives the outfit with that change made; confirmedFrom is unset while the
// save is in flight and, once it succeeds, the number of the first outfit
// fetch that started after it (so that fetch already includes it).
//
// What's on screen is always the last fetched outfit with every save still
// listed applied on top, in tap order. That way a fetch that lands late
// can't flash an older outfit, and a failed save is simply dropped from the
// list, undoing just that change and leaving later taps in place.

export const applySaves = (outfit, saves) => saves.reduce((o, s) => s.change(o), outfit);

export const addSave = (saves, id, change, userId) => [...saves, { id, change, userId, confirmedFrom: null }];

export const confirmSave = (saves, id, confirmedFrom) => saves.map((s) => (s.id === id ? { ...s, confirmedFrom } : s));

export const dropSave = (saves, id) => saves.filter((s) => s.id !== id);

// Fetch number `seq` has landed: saves it already includes aren't needed.
export function settleSaves(saves, seq) {
  const left = saves.filter((s) => s.confirmedFrom == null || s.confirmedFrom > seq);
  return left.length === saves.length ? saves : left;
}
