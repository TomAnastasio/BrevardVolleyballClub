// One-off seeding script for realistic demo data on the staging Supabase
// project -- run with `node e2e/seedStagingGames.js`. Gives staging a
// populated leaderboard/profile/history to test against by hand:
//   - 16 ranked players: 6 with 20 ranked games, 5 with 12, 5 with 5, each
//     with a hidden "skill" so records and Elo actually spread out across
//     every badge tier. Some also have casual games on top.
//   - 4 casual-only players (games, but none ranked -> unranked).
//   - 4 players with no games at all (unranked).
// All 2v2 beach, spread over the past ~3 months.
//
// Same access path as seedStaging.js: the admin test bot's own session
// (anon key + password auth, never the service-role key), inserting games
// exactly like the app's admin "Log a past game" flow does (insert, then
// admin_update_beach_game_players to set the real 4 players and replay
// Elo -- see logPastGame in useGameHistory.js).
//
// Safe to re-run: profiles are only created if missing, and games are only
// seeded if none of these players have any games yet. Nothing here deletes
// anything. Refuses to run against anything but the staging project.
import { getAdminSession } from "./signInAsTestUser.js";

const STAGING_REF = "cbgismbfbfvovxhvhtor";

// [name, ranked games target, skill]. Names deliberately avoid containing
// the e2e fixtures' names (Alice/Bob/Carla/Dana/TestBot...), since specs
// pick players by substring match.
const RANKED = [
  ["Maya Torres", 20, 0.9],
  ["Jordan Reyes", 20, 0.75],
  ["Sam Whitaker", 20, 0.6],
  ["Riley Chen", 20, 0.5],
  ["Owen Park", 20, 0.35],
  ["Priya Nair", 20, 0.2],
  ["Leo Martins", 12, 0.8],
  ["Tessa Quinn", 12, 0.55],
  ["Marcus Hale", 12, 0.45],
  ["Nina Patel", 12, 0.3],
  ["Gabe Foster", 12, 0.15],
  ["Isla Moreno", 5, 0.7],
  ["Theo Grant", 5, 0.5],
  ["Zoe Kim", 5, 0.4],
  ["Eli Brooks", 5, 0.25],
  ["Hannah Lowe", 5, 0.1],
];
const CASUAL_ONLY = ["Lucas Ford", "Mia Santos", "Ethan Ward", "Ruby Lane"];
const NO_GAMES = ["Felix Stone", "Grace Holt", "Ivy Marsh", "Jack Rowe"];
const CASUAL_GAMES = 16;

// Deterministic so a fresh staging project gets the same data every time.
let seed = 20261022;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const shuffle = (arr) => arr.map((v) => [rand(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

// Beach to 21, win by 2. Stronger pair wins more often, not always.
function playScores(teamA, teamB, skill) {
  const avg = (t) => (skill.get(t[0]) + skill.get(t[1])) / 2;
  const aWins = rand() < 0.5 + (avg(teamA) - avg(teamB)) * 0.8;
  const deuce = rand() < 0.15;
  const win = deuce ? 22 + Math.floor(rand() * 3) : 21;
  const lose = deuce ? win - 2 : 10 + Math.floor(rand() * 10);
  return aWins ? [win, lose] : [lose, win];
}

// Pick the 4 players with the most ranked games still to play (random
// tiebreak), until fewer than 4 have any left.
function rankedMatchups(skill) {
  const remaining = new Map(RANKED.map(([name, n]) => [name, n]));
  const games = [];
  for (;;) {
    const open = shuffle([...remaining].filter(([, n]) => n > 0)).sort((a, b) => b[1] - a[1]);
    if (open.length < 4) break;
    const four = shuffle(open.slice(0, 4).map(([name]) => name));
    four.forEach((name) => remaining.set(name, remaining.get(name) - 1));
    games.push({ mode: "ranked", teamA: four.slice(0, 2), teamB: four.slice(2), scores: playScores(four.slice(0, 2), four.slice(2), skill) });
  }
  return games;
}

// Every casual game has at least one casual-only player, sometimes mixed
// with ranked players so their Overall and Ranked records differ.
function casualMatchups(skill) {
  const games = [];
  for (let i = 0; i < CASUAL_GAMES; i++) {
    const pool = i % 2 === 0 ? CASUAL_ONLY : [...CASUAL_ONLY.slice(0, 2), ...RANKED.slice(0, 8).map(([name]) => name)];
    const four = shuffle(pool).slice(0, 4);
    if (!four.some((n) => CASUAL_ONLY.includes(n))) four[0] = CASUAL_ONLY[i % CASUAL_ONLY.length];
    games.push({ mode: "casual", teamA: four.slice(0, 2), teamB: four.slice(2), scores: playScores(four.slice(0, 2), four.slice(2), skill) });
  }
  return games;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url?.includes(STAGING_REF)) throw new Error(`seedStagingGames: refusing to run -- VITE_SUPABASE_URL isn't the staging project (${STAGING_REF}).`);

  const session = await getAdminSession();
  const headers = { apikey: anonKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  const rest = async (path, { method = "GET", body, prefer } = {}) => {
    const res = await fetch(`${url}/rest/v1/${path}`, { method, headers: prefer ? { ...headers, Prefer: prefer } : headers, body: body && JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };

  const allNames = [...RANKED.map(([name]) => name), ...CASUAL_ONLY, ...NO_GAMES];
  const existing = await rest("profiles?select=id,display_name&is_manual=eq.true");
  const ids = new Map(existing.filter((p) => allNames.includes(p.display_name)).map((p) => [p.display_name, p.id]));
  const missing = allNames.filter((name) => !ids.has(name));
  if (missing.length) {
    const created = await rest("profiles", { method: "POST", body: missing.map((display_name) => ({ display_name, is_manual: true, approved: true })), prefer: "return=representation" });
    created.forEach((p) => ids.set(p.display_name, p.id));
    console.log("Seeded profiles:", missing.join(", "));
  }

  const inList = allNames.map((n) => `"${n}"`).join(",");
  const already = await rest(`games?select=id&submitted_by_name=in.(${encodeURIComponent(inList)})&limit=1`);
  if (already.length) {
    console.log("Games already seeded -- nothing to do.");
    return;
  }

  const skill = new Map([...RANKED.map(([name, , s]) => [name, s]), ...CASUAL_ONLY.map((name) => [name, 0.5])]);
  const ranked = rankedMatchups(skill);
  const casual = casualMatchups(skill);

  // Interleave casual games among the ranked ones, then date them oldest
  // first, a game or two a day going back ~3 months.
  const all = [...ranked];
  casual.forEach((g, i) => all.splice(Math.floor(((i + 1) * all.length) / (casual.length + 1)) + i, 0, g));
  const start = new Date(Date.UTC(2026, 6, 20));

  for (const [i, g] of all.entries()) {
    const day = new Date(start.getTime() + Math.floor(i * 1.3) * 86400000);
    const [a1, a2] = g.teamA;
    const [b1, b2] = g.teamB;
    const [inserted] = await rest("games", {
      method: "POST",
      prefer: "return=representation",
      body: {
        name_a: `${a1} & ${a2}`,
        name_b: `${b1} & ${b2}`,
        score_a: g.scores[0],
        score_b: g.scores[1],
        mode: g.mode,
        format: "beach",
        played_date: day.toISOString().slice(0, 10),
        played_time: `${String(8 + (i % 10)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
        user_id: session.user.id,
        submitted_by_name: a1,
      },
    });
    await rest("rpc/admin_update_beach_game_players", {
      method: "POST",
      body: { p_game_id: inserted.id, p_a1_user_id: ids.get(a1), p_a2_user_id: ids.get(a2), p_b1_user_id: ids.get(b1), p_b2_user_id: ids.get(b2) },
    });
  }
  console.log(`Seeded ${ranked.length} ranked and ${casual.length} casual games.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
