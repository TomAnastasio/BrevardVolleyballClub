export const STATUS_LABELS = {
  draft: "Draft (admins only)",
  published: "Pools posted",
  live: "Live now",
  complete: "Final results",
};

export const TITLE_LABELS = { queen: "👑 Queen", princess: "👸 Princess" };

// event_date is a plain "YYYY-MM-DD" date; parse it as local, not UTC, so
// it doesn't display as the day before in Florida.
export function formatEventDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function playerName(profilesById, id) {
  return profilesById.get(id)?.display_name || "Unknown player";
}

export function teamNames(profilesById, ids) {
  return ids.map((id) => playerName(profilesById, id)).join(" & ");
}

export function placeLabel(place) {
  const s = ["th", "st", "nd", "rd"];
  const v = place % 100;
  return place + (s[(v - 20) % 10] || s[v] || s[0]);
}
