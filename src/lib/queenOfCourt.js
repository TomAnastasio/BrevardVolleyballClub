// Pure scheduling/standings logic for "Queen of the Court" tournaments:
// individual players, rotating partners, round-robin pools. No Supabase here
// so all of it is unit-testable (queenOfCourt.test.js).
//
// PROVISIONAL (pending the organizer's answers, see TODO.md "Tournaments"):
// how players are seeded into pools, the pool size, and the standings
// tiebreak order. Each is isolated in one function/constant below so the
// answers are a small, local change.

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

// How many pools a division of `count` players splits into, aiming for
// pools of `targetSize` but never below MIN_POOL_SIZE or above
// MAX_POOL_SIZE. Returns 0 when there are too few players for even one pool.
export function poolCountFor(count, targetSize) {
  if (count < MIN_POOL_SIZE) return 0;
  let pools = Math.max(1, Math.round(count / targetSize));
  while (pools > 1 && Math.floor(count / pools) < MIN_POOL_SIZE) pools--;
  while (Math.ceil(count / pools) > MAX_POOL_SIZE) pools++;
  return pools;
}

// PROVISIONAL seeding: 'elo' snake-seeds by rating so pools are even
// (1st, 2nd, 3rd... go to pools A, B, C, then back C, B, A); 'random'
// shuffles. `random` is injectable for tests.
export function splitIntoPools(players, { targetSize = 4, method = "elo", random = Math.random } = {}) {
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
    ordered = [...players].sort((a, b) => (b.elo ?? 1500) - (a.elo ?? 1500) || a.name.localeCompare(b.name));
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

// PROVISIONAL ranking: wins, then point differential, then points scored.
// Players still tied share a place.
export function compareStandings(a, b) {
  return b.wins - a.wins || b.diff - a.diff || b.pointsFor - a.pointsFor;
}

export function rankStandings(rows) {
  const sorted = [...rows].sort(compareStandings);
  let place = 0;
  return sorted.map((r, i) => {
    if (i === 0 || compareStandings(sorted[i - 1], r) !== 0) place = i + 1;
    return { ...r, place };
  });
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
