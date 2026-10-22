// Pure scheduling/standings logic for "Queen of the Court" tournaments:
// individual players, rotating partners, round-robin pools. No Supabase here
// so all of it is unit-testable (queenOfCourt.test.js).
//
// Rules confirmed by the organizer for Queen of Paradise (2026-10-22):
// - Pools of 4 or 5, snake-seeded within a division by AVP ranking, then
//   TruVolley score, then Elo.
// - Pool games: pools of 4 play 3 games to 28 (cap 30), pools of 5 play 4
//   games to 21 (cap 23), all win by 2.
// - Pool ranking: games won, then fewest points scored against. Still tied:
//   a head-to-head mini game to 15 on the sand (not tracked in the app).
// - Round 2 re-pools each division into Gold/Silver/Bronze/Copper (see
//   planRound2); round 1 results don't carry over.
// - Each round 2 pool's top 2 play a final (best 2-of-3 sets to 21, no cap)
//   with a partner of their choice from the division. Only Gold's final
//   decides the Queen.

// Games per player in a pool of n: as many distinct partners as possible
// (at most n-1), while every player plays the same number of games. Each
// game uses 4 player-slots, so n * games must be a multiple of 4.
// n=4 -> 3, n=5 -> 4, n=6 -> 4, n=7 -> 4, n=8 -> 7, n=9 -> 8.
export function gamesPerPlayer(n) {
  for (let g = n - 1; g > 0; g--) {
    if ((n * g) % 4 === 0) return g;
  }
  return 0;
}

export const MIN_POOL_SIZE = 4;
export const MAX_POOL_SIZE = 9;

// Game rules by pool size. Other sizes (only used when a division can't be
// split into 4s and 5s) fall back to the tournament's own rules.
export const POOL_RULES = {
  4: { winScore: 28, winByTwo: true, pointCap: 30 },
  5: { winScore: 21, winByTwo: true, pointCap: 23 },
};

export function poolRules(size, fallback) {
  return POOL_RULES[size] || fallback;
}

// Finals: a match of up to 3 sets, or one set if both teams agree.
const SET_TO_21 = { winScore: 21, winByTwo: true, pointCap: null };
export const FINAL_FORMATS = {
  best_of_3: { label: "Best 2 of 3 (21, 21, 15)", sets: [SET_TO_21, SET_TO_21, { ...SET_TO_21, winScore: 15 }] },
  best_of_3_all_21: { label: "Best 2 of 3 (all to 21)", sets: [SET_TO_21, SET_TO_21, SET_TO_21] },
  one_set: { label: "One set to 21", sets: [SET_TO_21] },
};

export function rulesLabel({ winScore, winByTwo, pointCap }) {
  return `to ${winScore}${winByTwo ? ", win by 2" : ""}${pointCap ? `, cap ${pointCap}` : ", no cap"}`;
}

// The fixed play order for a pool of n players, as indexes into the pool's
// player list: [[a1, a2], [b1, b2]] per game. Every player plays
// gamesPerPlayer(n) games, never with the same partner twice, and (because
// the search always extends with whoever has played least) games-played
// stays within one of each other at every point in the order, so nobody
// sits out long stretches.
export function buildPoolSchedule(n) {
  if (!Number.isInteger(n) || n < MIN_POOL_SIZE || n > MAX_POOL_SIZE) {
    throw new Error(`Pools must have ${MIN_POOL_SIZE}–${MAX_POOL_SIZE} players (got ${n}).`);
  }
  const g = gamesPerPlayer(n);
  const totalGames = (n * g) / 4;
  const counts = new Array(n).fill(0);
  const partnered = new Set();
  const lastPlayed = new Array(n).fill(-1);
  const games = [];
  const pairKey = (x, y) => (x < y ? `${x}-${y}` : `${y}-${x}`);
  let steps = 0;

  function candidates() {
    const min = Math.min(...counts);
    // Prefer players who've played least, then whoever has rested longest.
    const pool = [...Array(n).keys()]
      .filter((p) => counts[p] < g && counts[p] <= min + 1)
      .sort((x, y) => counts[x] - counts[y] || lastPlayed[x] - lastPlayed[y] || x - y);
    const out = [];
    for (let i = 0; i < pool.length; i++)
      for (let j = i + 1; j < pool.length; j++)
        for (let k = j + 1; k < pool.length; k++)
          for (let l = k + 1; l < pool.length; l++) {
            const four = [pool[i], pool[j], pool[k], pool[l]];
            // Everyone at the minimum count must be included when possible.
            const atMin = pool.filter((p) => counts[p] === min);
            if (atMin.length >= 4 && four.some((p) => counts[p] !== min)) continue;
            if (atMin.length < 4 && atMin.some((p) => !four.includes(p))) continue;
            const [a, b, c, d] = four;
            for (const [[p1, p2], [q1, q2]] of [
              [[a, b], [c, d]],
              [[a, c], [b, d]],
              [[a, d], [b, c]],
            ]) {
              if (!partnered.has(pairKey(p1, p2)) && !partnered.has(pairKey(q1, q2))) {
                out.push([[p1, p2], [q1, q2]]);
              }
            }
          }
    return out;
  }

  function search() {
    if (games.length === totalGames) return true;
    if (++steps > 200000) return false;
    for (const game of candidates()) {
      const players = game.flat();
      const prevLast = players.map((p) => lastPlayed[p]);
      players.forEach((p) => {
        counts[p]++;
        lastPlayed[p] = games.length;
      });
      partnered.add(pairKey(...game[0]));
      partnered.add(pairKey(...game[1]));
      games.push(game);
      if (search()) return true;
      games.pop();
      partnered.delete(pairKey(...game[0]));
      partnered.delete(pairKey(...game[1]));
      players.forEach((p, i) => {
        counts[p]--;
        lastPlayed[p] = prevLast[i];
      });
    }
    return false;
  }

  if (!search()) throw new Error(`Couldn't build a schedule for a pool of ${n}.`);
  return games;
}

// How many pools a division of `count` players splits into. Pools are only
// 4s and 5s whenever that's possible (the organizer's rule); `targetSize`
// (4 or 5) picks between valid options, e.g. 20 -> four 5s or five 4s.
// Counts that can't be made of 4s and 5s (6, 7, 11) fall back to a larger
// pool. Returns 0 when there are too few players for even one pool.
export function poolCountFor(count, targetSize) {
  if (count < MIN_POOL_SIZE) return 0;
  const fits = [];
  for (let p = 1; p * MIN_POOL_SIZE <= count; p++) if (count <= p * 5) fits.push(p);
  if (fits.length) {
    const ideal = count / targetSize;
    return fits.reduce((best, p) => (Math.abs(p - ideal) < Math.abs(best - ideal) ? p : best));
  }
  let pools = Math.max(1, Math.round(count / targetSize));
  while (pools > 1 && Math.floor(count / pools) < MIN_POOL_SIZE) pools--;
  while (Math.ceil(count / pools) > MAX_POOL_SIZE) pools++;
  return pools;
}

// Seeding order: AVP rank (lower is better), then TruVolley score, then Elo
// (both higher is better). Anyone with an AVP rank is above everyone
// without one, and so on down; players with none of the three go last.
export function compareSeeds(a, b) {
  const has = (v) => v !== null && v !== undefined;
  for (const [key, lowerIsBetter] of [
    ["avp", true],
    ["truvolley", false],
    ["elo", false],
  ]) {
    if (has(a[key]) !== has(b[key])) return has(a[key]) ? -1 : 1;
    if (has(a[key]) && a[key] !== b[key]) return lowerIsBetter ? a[key] - b[key] : b[key] - a[key];
  }
  return a.name.localeCompare(b.name);
}

// 'ranked' snake-seeds by compareSeeds so pools are even (1st, 2nd, 3rd...
// go to pools A, B, C, then back C, B, A); 'random' shuffles. Players are
// { name, avp, truvolley, elo }. `random` is injectable for tests.
export function splitIntoPools(players, { targetSize = 5, method = "ranked", random = Math.random } = {}) {
  const count = poolCountFor(players.length, targetSize);
  if (count === 0) return [];
  let ordered;
  if (method === "random") {
    ordered = [...players];
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
  } else {
    ordered = [...players].sort(compareSeeds);
  }
  const pools = Array.from({ length: count }, () => []);
  ordered.forEach((p, i) => {
    const lap = Math.floor(i / count);
    const pos = i % count;
    pools[lap % 2 === 0 ? pos : count - 1 - pos].push(p);
  });
  return pools;
}

export function poolLabel(index) {
  return String.fromCharCode(65 + index);
}

// Per-player record from a pool's scored games. `matches` are
// { a1, a2, b1, b2, scoreA, scoreB } with scoreA/scoreB null until scored.
export function computeStandings(playerIds, matches) {
  const rows = new Map(
    playerIds.map((id) => [id, { id, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]),
  );
  for (const m of matches) {
    if (m.scoreA == null || m.scoreB == null) continue;
    const sides = [
      [[m.a1, m.a2], m.scoreA, m.scoreB],
      [[m.b1, m.b2], m.scoreB, m.scoreA],
    ];
    for (const [ids, own, opp] of sides) {
      for (const id of ids) {
        const r = rows.get(id);
        if (!r) continue;
        r.played++;
        r.pointsFor += own;
        r.pointsAgainst += opp;
        if (own > opp) r.wins++;
        else r.losses++;
      }
    }
  }
  return [...rows.values()].map((r) => ({ ...r, diff: r.pointsFor - r.pointsAgainst }));
}

// Pool ranking: games won, then fewest points scored against. Players still
// tied share a place (they settle it with a mini game to 15).
export function compareStandings(a, b) {
  return b.wins - a.wins || a.pointsAgainst - b.pointsAgainst;
}

export function rankStandings(rows) {
  const sorted = [...rows].sort(compareStandings);
  let place = 0;
  return sorted.map((r, i) => {
    if (i === 0 || compareStandings(sorted[i - 1], r) !== 0) place = i + 1;
    return { ...r, place };
  });
}

// Players sharing a place once every game in the pool is scored:
// [{ place, ids }]. These are the ties a mini game to 15 decides.
export function unresolvedTies(standings, matches) {
  if (!matches.length || matches.some((m) => m.scoreA == null || m.scoreB == null)) return [];
  const byPlace = new Map();
  for (const r of standings) byPlace.set(r.place, [...(byPlace.get(r.place) || []), r.id]);
  return [...byPlace.entries()].filter(([, ids]) => ids.length > 1).map(([place, ids]) => ({ place, ids }));
}

export const TIER_NAMES = ["Gold", "Silver", "Bronze", "Copper"];

export function tierName(index) {
  return TIER_NAMES[index] || `Tier ${index + 1}`;
}

// Comparing players across pools ("rank all players"): per-game rates, so
// a pool of 5 (4 games each) and a pool of 4 (3 games) compare fairly.
// With equal pools this orders exactly like compareStandings.
function compareOverall(a, b) {
  const rate = (r, k) => (r.played ? r[k] / r.played : 0);
  return rate(b, "wins") - rate(a, "wins") || rate(a, "pointsAgainst") - rate(b, "pointsAgainst");
}

// Round 2 for a division, from its ranked round-1 pools ([{ standings }]).
// One round 2 pool per round 1 pool, named Gold, Silver, Bronze, Copper.
// The organizer's rules:
//   2 pools of 4  -> top 2 of each pool to Gold, bottom 2 to Silver
//   4 pools       -> 1st of each pool to Gold, 2nd Silver, 3rd Bronze, 4th Copper
//   2 pools of 5, 3 pools -> rank all players together, split top to bottom
// i.e. by place within each pool whenever every pool can send the same
// number of players to each tier, otherwise everyone ranked together.
// Returns { method, tiers: [[standingsRow]], ties: [{ tier, ids }] }, where
// ties are players tied across a tier boundary (decided by a mini game),
// or null with fewer than 2 pools.
export function planRound2(pools) {
  if (pools.length < 2) return null;
  const tierCount = pools.length;
  const poolSize = pools[0].standings.length;
  const perPool = poolSize / tierCount;
  const byPlace = pools.every((p) => p.standings.length === poolSize) && Number.isInteger(perPool);

  const tiers = [];
  const ties = [];
  if (byPlace) {
    for (let t = 0; t < tierCount; t++) {
      tiers.push(pools.flatMap((p) => p.standings.slice(t * perPool, (t + 1) * perPool)));
    }
    for (let t = 0; t < tierCount - 1; t++) {
      for (const p of pools) {
        const last = p.standings[(t + 1) * perPool - 1];
        if (compareStandings(last, p.standings[(t + 1) * perPool]) === 0) {
          ties.push({ tier: t, ids: p.standings.filter((r) => compareStandings(r, last) === 0).map((r) => r.id) });
        }
      }
    }
  } else {
    const all = pools.flatMap((p) => p.standings).sort(compareOverall);
    const sizes = Array.from(
      { length: tierCount },
      (_, i) => Math.floor(all.length / tierCount) + (i < all.length % tierCount ? 1 : 0),
    );
    let edge = 0;
    sizes.forEach((size, t) => {
      tiers.push(all.slice(edge, edge + size));
      edge += size;
      const last = all[edge - 1];
      if (t < tierCount - 1 && compareOverall(last, all[edge]) === 0) {
        ties.push({ tier: t, ids: all.filter((r) => compareOverall(r, last) === 0).map((r) => r.id) });
      }
    });
  }
  return { method: byPlace ? "place" : "overall", tiers, ties };
}

// A final's sets (matches between the same two teams, in set order): sets
// won by each side, the match winner ("a"/"b"/null), and which sets aren't
// needed because one side has already won the match.
export function finalSeries(sets) {
  const needed = Math.floor(sets.length / 2) + 1;
  let winsA = 0;
  let winsB = 0;
  const rows = sets.map((m) => {
    const decided = winsA >= needed || winsB >= needed;
    if (!decided && m.scoreA != null && m.scoreB != null) {
      if (m.scoreA > m.scoreB) winsA++;
      else winsB++;
    }
    return { match: m, notNeeded: decided && m.scoreA == null };
  });
  const winner = winsA >= needed ? "a" : winsB >= needed ? "b" : null;
  return { sets: rows, winsA, winsB, winner };
}

// Whether a live score has reached a winning state under the tournament's
// rules (target score, win-by-two, optional hard cap).
export function isGameOver(a, b, { winScore = 21, winByTwo = true, pointCap = null } = {}) {
  const hi = Math.max(a, b);
  const lead = Math.abs(a - b);
  if (a === b) return false;
  if (pointCap && hi >= pointCap) return true;
  if (hi < winScore) return false;
  return winByTwo ? lead >= 2 : true;
}
