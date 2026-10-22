// Everyone on one side of a game, for the game details screen: linked
// players first (they have an `id`, so they can open a profile), then, for
// 2v2 beach only, any names that were typed in rather than picked from
// player search. Those only exist inside the team name ("Alex & Sam"),
// never as game_players rows, so they come back with `id: null`. Indoor and
// squad beach rosters are always linked players.
export function rosterForSide(game, side) {
  const linked = (side === "a" ? game.teamAPlayers : game.teamBPlayers) || [];
  const is2v2Beach = game.format !== "indoor" && !game.teamSize;
  if (!is2v2Beach || linked.length >= 2) return linked;

  const teamName = (side === "a" ? game.nameA : game.nameB) || "";
  const remaining = linked.map((p) => p.name.trim().toLowerCase());
  const typed = [];
  for (const raw of teamName.split(" & ")) {
    const name = raw.trim();
    if (!name) continue;
    const i = remaining.indexOf(name.toLowerCase());
    if (i >= 0) remaining.splice(i, 1);
    else typed.push({ id: null, name, avatarUrl: null });
  }
  return [...linked, ...typed.slice(0, 2 - linked.length)];
}

// "Sun, Oct 18, 2026 · 6:42 PM" from the stored local "YYYY-MM-DD" and
// "HH:MM" (time optional; past games logged by an admin all say 12:00).
export function formatPlayedAt(date, time) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "").split(":").map(Number);
  const hasTime = Number.isFinite(hh) && Number.isFinite(mm);
  const when = new Date(y, m - 1, d, hasTime ? hh : 0, hasTime ? mm : 0);
  const day = when.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  if (!hasTime) return day;
  return `${day} · ${when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
