import { buildPoolSchedule, MAX_POOL_SIZE, MIN_POOL_SIZE, poolRules, rulesLabel } from "./queenOfCourt.js";

// Pure helpers for changing who's in a tournament once pools exist. The
// model is what buildTournamentModel (src/hooks/useTournament.js) returns.

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const inMatch = (m, profileId) => [m.a1, m.a2, m.b1, m.b2].includes(profileId);
// Same test the database uses before it will rebuild a pool's schedule.
const started = (m) => m.status === "final" || m.liveA + m.liveB > 0;

// What removing `entrant` will do, for the confirm box, and the fresh
// schedules to send with it (admin_remove_tournament_entrant):
// - a pool where nothing is scored or started yet is rebuilt for the
//   players left, if they're still a valid pool size;
// - otherwise only their unscored games go; scored games stay.
// Returns { lines: [sentence], rebuiltPools: { poolId: [game] } }, or
// { blocked: reason } when they can't be removed.
export function planEntrantRemoval(model, entrant, name) {
  const t = model.tournament;
  const fallbackRules = { winScore: t.win_score, winByTwo: t.win_by_two, pointCap: t.point_cap };
  const pid = entrant.profile_id;

  // Same rule as the database: a final under way keeps its players.
  const startedFinal = model.matches.find((m) => m.stage === "final" && m.status === "final" && inMatch(m, pid));
  if (startedFinal) {
    return {
      blocked: `${name} is in a final that already has a scored set, so they can't be removed. Undo that set's score on the live page first, or leave them in.`,
      lines: [],
      rebuiltPools: {},
    };
  }

  const lines = [];
  const rebuiltPools = {};
  const handled = new Set();

  const pools = model.divisions.flatMap((d) => d.pools).filter((p) => p.players.some((e) => e.id === entrant.id));
  for (const pool of pools) {
    const left = pool.players.filter((e) => e.id !== entrant.id);
    const theirs = pool.matches.filter((m) => inMatch(m, pid));
    const scored = theirs.filter((m) => m.status === "final").length;
    pool.matches.forEach((m) => handled.add(m.id));

    if (!pool.matches.some(started) && left.length >= MIN_POOL_SIZE && left.length <= MAX_POOL_SIZE) {
      const rules = poolRules(left.length, fallbackRules);
      rebuiltPools[pool.id] = buildPoolSchedule(left.length).map(([[a1, a2], [b1, b2]]) => ({
        a1: left[a1].profile_id,
        a2: left[a2].profile_id,
        b1: left[b1].profile_id,
        b2: left[b2].profile_id,
        win_score: rules.winScore,
        win_by_two: rules.winByTwo,
        point_cap: rules.pointCap,
      }));
      lines.push(
        `${pool.title} gets a new schedule for the ${left.length} players left: ${plural(rebuiltPools[pool.id].length, "game")} ${rulesLabel(rules)}.`,
      );
      continue;
    }

    const unplayed = theirs.length - scored;
    lines.push(
      unplayed
        ? `Removes their ${plural(unplayed, "unplayed game")} from ${pool.title}; the other games keep their numbers.`
        : `Takes them out of ${pool.title}.`,
    );
    if (scored) {
      lines.push(
        `Their ${plural(scored, "scored game")} in ${pool.title} ${scored === 1 ? "stays" : "stay"} (real results, rated for Elo). With uneven games, ${pool.title} ranks by win rate.`,
      );
    }
    if (left.length < MIN_POOL_SIZE && !pool.matches.some((m) => m.status === "final")) {
      lines.push(`${pool.title} is left with ${left.length} players, too few to play: rebuild pools afterward.`);
    }
  }

  // Games outside their pools: finals they're in (as a finalist or partner).
  const elsewhere = model.matches.filter((m) => !handled.has(m.id) && m.status !== "final" && inMatch(m, pid));
  if (elsewhere.length) {
    const finals = elsewhere.filter((m) => m.stage === "final").length;
    const other = elsewhere.length - finals;
    if (finals) lines.push(`Removes ${plural(finals, "unplayed final set")} they're in; set the final up again on Finals.`);
    if (other) lines.push(`Removes ${plural(other, "other unplayed game")} they're in.`);
  }

  if (!lines.length) lines.push(`${name} isn't in any pool or game yet.`);
  return { lines, rebuiltPools };
}

// Schedule mistakes to fix before (or while) playing: unscored games that
// list someone who isn't in the pool, and pools with players but no games.
// Scored games are left out: a removed player's or a substitute's scored
// game is real history, not a mistake.
export function scheduleProblems(model) {
  const problems = [];
  for (const d of model.divisions) {
    for (const pool of d.pools) {
      const inPool = new Set(pool.players.map((e) => e.profile_id));
      const strays = pool.matches.filter(
        (m) => m.status !== "final" && [m.a1, m.a2, m.b1, m.b2].some((id) => !inPool.has(id)),
      ).length;
      if (strays) {
        problems.push(
          `${d.name}, ${pool.title}: ${plural(strays, "unplayed game")} ${strays === 1 ? "lists" : "list"} someone who isn't in the pool. Rebuild this pool.`,
        );
      }
      if (pool.players.length && !pool.matches.length) {
        problems.push(`${d.name}, ${pool.title}: ${plural(pool.players.length, "player")} but no games. Rebuild this pool.`);
      }
    }
  }
  return problems;
}
