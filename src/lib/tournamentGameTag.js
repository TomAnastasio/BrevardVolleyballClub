// A tournament game is a regular `games` row; the only link back to its
// tournament is tournament_matches.game_id (migration 20261022180000). This
// embed, added to a `games` select, pulls in just enough to label the game.
// tournament_matches is only readable once its tournament is published, so
// a draft tournament's games simply come back untagged for non-admins.
export const TOURNAMENT_MATCH_EMBED =
  "tournament_matches(stage, round, tournament:tournaments(id, name), division:tournament_divisions(pools:tournament_pools(round)))";

// Owner's call (2026-10-22): the stage, not the pool. "Pool play" alone
// when the division only had one round of pools; "Pool play · Round N"
// once it had a second; finals by their level.
export function tournamentStageLabel(stage, round, multiRound) {
  if (stage === "final") return "Final";
  return multiRound ? `Pool play · Round ${round}` : "Pool play";
}

// `{ tournamentId, name, label }` for a games row fetched with
// TOURNAMENT_MATCH_EMBED, or null for a non-tournament game.
export function tournamentTagFor(row) {
  const embedded = row?.tournament_matches;
  // game_id is unique, so PostgREST returns one object, but tolerate a list.
  const match = Array.isArray(embedded) ? embedded[0] : embedded;
  if (!match?.tournament) return null;
  const multiRound = (match.division?.pools || []).some((p) => p.round > 1);
  return {
    tournamentId: match.tournament.id,
    name: match.tournament.name,
    label: tournamentStageLabel(match.stage, match.round, multiRound),
  };
}
