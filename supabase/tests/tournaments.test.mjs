// Scenarios for 20261025050000_tournament_entrant_fixes.sql: importing
// registrations, removing a player, and Edit Game on a tournament game.
// usage: node tournaments.test.mjs
import { freshDb } from "./harness.mjs";
import { buildPoolSchedule, poolRules } from "../../src/lib/queenOfCourt.js";

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log("FAIL:", what); } };
const eq = (a, b, what) => ok(JSON.stringify(a) === JSON.stringify(b), `${what}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

const db = await freshDb();
const one = async (sql, p = []) => (await db.query(sql, p)).rows[0];
const all = async (sql, p = []) => (await db.query(sql, p)).rows;
const count = async (sql, p = []) => (await one(`select count(*)::int n from (${sql}) x`, p)).n;

async function as(uid, sql, p = []) {
  return db.transaction(async (tx) => {
    await tx.query("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)", [uid]);
    return (await tx.query(sql, p)).rows;
  });
}
async function asAnon(sql, p = []) {
  return db.transaction(async (tx) => {
    await tx.query("set local role anon");
    return (await tx.query(sql, p)).rows;
  });
}
const fails = async (fn, re, what) => {
  try { await fn(); ok(false, `${what} (expected an error)`); }
  catch (e) { ok(re.test(e.message), `${what}: error was "${e.message}"`); }
};

async function user(name, admin = false) {
  const { id } = await one("insert into auth.users (raw_user_meta_data) values ($1) returning id", [{ full_name: name }]);
  if (admin) await db.query("update profiles set is_admin = true where id = $1", [id]);
  await db.query("update profiles set display_name = $2 where id = $1", [id, name]);
  return id;
}
const manual = async (name) => (await one("insert into profiles (display_name, is_manual) values ($1, true) returning id", [name])).id;
const profileCount = () => count("select 1 from profiles");

const admin = await user("Admin", true);
const player = await user("Player");
const tournament = async (name, status = "draft") =>
  (await one("insert into tournaments (name, event_date, status) values ($1, '2026-10-31', $2) returning id", [name, status])).id;
const division = async (t, name = "Open") =>
  (await one("insert into tournament_divisions (tournament_id, name) values ($1, $2) returning id", [t, name])).id;

// ------------------------------------------------------------ import
{
  const imp = (uid, t, rows) => as(uid, "select admin_import_tournament_entrants($1, $2::jsonb) r", [t, JSON.stringify(rows)]).then((r) => r[0].r);
  const T = await tournament("Import Cup");
  const D = await division(T);
  const zoe = await manual("Zoë Ramírez");
  const google = await user("Kim Park");

  await fails(() => imp(player, T, [{ name: "X", division_id: D }]), /admin access required/, "a non-admin can't import");
  await fails(() => asAnon("select admin_import_tournament_entrants($1, '[]')", [T]), /permission denied/, "an anonymous visitor can't import");

  const before = await profileCount();
  const rows = [
    { name: "Kim Park", profile_id: google, division_id: D, email: "kim@example.com" },
    { name: "zoe  ramirez", division_id: D, phone: "321-555-0100", avp_rank: 12, truvolley: "45.5", junior: true },
    { name: "Brand New", division_id: D, email: "new@example.com" },
  ];
  const r1 = await imp(admin, T, rows);
  eq([r1.added, r1.created_profiles, r1.skipped.length], [3, 1, 0], "imports three, creating one profile");
  eq(await profileCount(), before + 1, "only the brand-new player got a profile");
  ok(await count("select 1 from tournament_entrants where tournament_id = $1 and profile_id = $2", [T, zoe]), "a same-name existing profile (different case/accents) is reused");
  eq(await one("select avp_rank, truvolley_score::text t, is_junior from tournament_entrants where profile_id = $1", [zoe]), { avp_rank: 12, t: "45.50", is_junior: true }, "seeding details saved");
  eq(await count("select 1 from tournament_entrant_contacts c join tournament_entrants e on e.id = c.entrant_id where e.tournament_id = $1", [T]), 3, "contacts saved");

  const r2 = await imp(admin, T, rows);
  eq([r2.added, r2.created_profiles, r2.skipped.map((s) => s.reason)], [0, 0, ["already entered", "already entered", "already entered"]], "re-running the same import changes nothing");
  eq(await profileCount(), before + 1, "and makes no new profiles");

  const r3 = await imp(admin, T, [
    { name: "Twin Name", division_id: D },
    { name: "twin name", division_id: D },
  ]);
  eq([r3.added, r3.created_profiles, r3.skipped.length], [1, 1, 1], "a name listed twice gets one profile and one entry");

  const mid = await profileCount();
  await fails(
    () => imp(admin, T, [
      { name: "Atomic One", division_id: D },
      { name: "Atomic Two", division_id: D },
      { name: "No Division", division_id: null },
    ]),
    /pick a division for No Division/,
    "a bad row stops the import",
  );
  eq(await profileCount(), mid, "and nothing from that import was saved (no stray profiles)");
  eq(await count("select 1 from profiles where display_name like 'Atomic%'"), 0, "not even the rows before it");

  const elsewhere = await division(await tournament("Other Cup"));
  await fails(() => imp(admin, T, [{ name: "Wrong", division_id: elsewhere }]), /pick a division/, "a division from another tournament is refused");

  await manual("Sam Lee");
  await manual("Sam Lee");
  await fails(() => imp(admin, T, [{ name: "Sam Lee", division_id: D }]), /several players are named Sam Lee/, "two same-name players: the admin must pick");
  const r4 = await imp(admin, T, [{ name: "Sam Lee", division_id: D, new_profile: true }]);
  eq([r4.added, r4.created_profiles], [1, 1], "choosing New profile deliberately makes a third Sam Lee");

  await manual("Jo Real");
  const joGoogle = await user("Jo Real");
  await imp(admin, T, [{ name: "Jo Real", division_id: D }]);
  ok(await count("select 1 from tournament_entrants where tournament_id = $1 and profile_id = $2", [T, joGoogle]), "of a manual and a Google profile with the same name, the Google one is used");

  // A deliberate "New profile" row whose reply was lost: the retry must not
  // make another profile and entry.
  await manual("Pat Doe");
  const patRow = [{ name: "Pat Doe", division_id: D, new_profile: true }];
  const p1 = await profileCount();
  eq((await imp(admin, T, patRow)).added, 1, "New profile beside an existing Pat Doe adds a second Pat Doe");
  const p2 = await profileCount();
  const retry = await imp(admin, T, patRow);
  eq([p2 - p1, retry.added, retry.created_profiles, retry.skipped.map((s) => s.reason)], [1, 0, 0, ["already entered"]], "retrying it adds nobody");
  eq(await profileCount(), p2, "and makes no profile");

  // Names over 24 characters are stored shortened; a retry still matches.
  const longName = "Maximiliana Featherstonehaugh-Smythe";
  const p3 = await profileCount();
  eq((await imp(admin, T, [{ name: longName, division_id: D }])).created_profiles, 1, "a long new name gets a profile");
  eq((await one("select display_name from profiles order by created_at desc limit 1")).display_name, longName.slice(0, 24).trim(), "stored as its first 24 characters");
  const longRetry = await imp(admin, T, [{ name: longName, division_id: D }]);
  eq([longRetry.added, longRetry.created_profiles], [0, 0], "retrying a long name adds nobody");
  const longNew = await imp(admin, T, [{ name: longName, division_id: D, new_profile: true }]);
  eq([longNew.added, longNew.created_profiles], [0, 0], "even as a New profile row");
  eq(await profileCount(), p3 + 1, "one profile for the long name in all");
}

// ------------------------------------------------------------ remove a player
const T = await tournament("Remove Cup");
const D = await division(T);
const names = ["Ana", "Bea", "Cat", "Dee", "Eve", "Fay", "Gia", "Hal", "Ivy"];
const ids = {};
for (const n of names) ids[n] = await user(n);
const entrant = {};
for (const n of names) entrant[n] = (await one("insert into tournament_entrants (tournament_id, division_id, profile_id, checked_in) values ($1, $2, $3, true) returning id", [T, D, ids[n]])).id;

async function makePool(label, players, round = 1) {
  const { id } = await one("insert into tournament_pools (tournament_id, division_id, round, label) values ($1, $2, $3, $4) returning id", [T, D, round, label]);
  for (const [i, n] of players.entries()) await db.query("insert into tournament_pool_players (pool_id, entrant_id, seed) values ($1, $2, $3)", [id, entrant[n], i + 1]);
  const rules = poolRules(players.length);
  for (const [s, [[a1, a2], [b1, b2]]] of buildPoolSchedule(players.length).entries()) {
    await db.query(
      "insert into tournament_matches (tournament_id, division_id, pool_id, stage, round, sequence, a1, a2, b1, b2, win_score, win_by_two, point_cap) values ($1, $2, $3, 'pool', $4, $5, $6, $7, $8, $9, $10, $11, $12)",
      [T, D, id, round, s + 1, ids[players[a1]], ids[players[a2]], ids[players[b1]], ids[players[b2]], rules.winScore, rules.winByTwo, rules.pointCap],
    );
  }
  return id;
}
const scheduleFor = (players) => {
  const rules = poolRules(players.length);
  return buildPoolSchedule(players.length).map(([[a1, a2], [b1, b2]]) => ({
    a1: ids[players[a1]], a2: ids[players[a2]], b1: ids[players[b1]], b2: ids[players[b2]],
    win_score: rules.winScore, win_by_two: rules.winByTwo, point_cap: rules.pointCap,
  }));
};
const remove = (uid, e, rebuilt = {}) => as(uid, "select admin_remove_tournament_entrant($1, $2::jsonb) r", [e, JSON.stringify(rebuilt)]).then((r) => r[0].r);
const poolGames = (pool) => all("select sequence, a1, a2, b1, b2, game_id, win_score from tournament_matches where pool_id = $1 and stage = 'pool' order by sequence", [pool]);
const mentions = (games, id) => games.filter((g) => [g.a1, g.a2, g.b1, g.b2].includes(id)).length;

const poolA = await makePool("A", ["Ana", "Bea", "Cat", "Dee", "Eve"]);
const poolB = await makePool("B", ["Fay", "Gia", "Hal", "Ivy"]);
eq((await poolGames(poolA)).length, 5, "pool of 5 starts with 5 games");

await fails(() => remove(player, entrant.Eve), /admin access required/, "a non-admin can't remove a player");
await fails(() => asAnon("select admin_remove_tournament_entrant($1)", [entrant.Eve]), /permission denied/, "an anonymous visitor can't remove a player");

// A bad schedule (still lists Eve) is refused and nothing changes.
await fails(() => remove(admin, entrant.Eve, { [poolA]: scheduleFor(["Ana", "Bea", "Cat", "Eve"]) }), /doesn't match the pool's players/, "a rebuilt schedule using the removed player is refused");
eq((await poolGames(poolA)).length, 5, "and the pool's games are untouched");
ok(await count("select 1 from tournament_entrants where id = $1", [entrant.Eve]), "and the player is still entered");

// No-show before anything is scored: pool rebuilt for the 4 left.
const r1 = await remove(admin, entrant.Eve, { [poolA]: scheduleFor(["Ana", "Bea", "Cat", "Dee"]) });
eq([r1.rebuilt_pools, r1.removed_games], [1, 0], "no-show in an unscored pool: the pool is rebuilt");
const rebuiltA = await poolGames(poolA);
eq([rebuiltA.length, rebuiltA.map((g) => g.win_score)], [3, [28, 28, 28]], "pool A now has a pool-of-4 schedule (3 games to 28)");
eq(mentions(rebuiltA, ids.Eve), 0, "Eve is in none of its games");
eq(await count("select 1 from tournament_pool_players where pool_id = $1", [poolA]), 4, "and isn't in the pool");
eq(await count("select 1 from tournament_entrants where id = $1", [entrant.Eve]), 0, "and isn't entered");

// Remove without rebuilding (pool of 4 -> 3, every game has everyone).
const r2 = await remove(admin, entrant.Ivy);
eq([r2.rebuilt_pools, r2.removed_games], [0, 3], "removing from a pool of 4 without a rebuild removes its 3 games");
eq((await poolGames(poolB)).length, 0, "pool B has no games left");

// Some games scored: the scored game stays, only unplayed games with them go.
await db.query("update tournaments set status = 'live' where id = $1", [T]);
const [{ r: game1 }] = await as(player, "select submit_tournament_match_score($1, 28, 20) r", [(await one("select id from tournament_matches where pool_id = $1 and sequence = 1", [poolA])).id]);
ok(game1, "game 1 of pool A scored");
await fails(() => remove(admin, entrant.Ana, { [poolA]: scheduleFor(["Bea", "Cat", "Dee", "Fay"]) }), /has started/, "rebuilding a pool with a scored game is refused");
eq((await poolGames(poolA)).length, 3, "and changes nothing");
await db.query("update tournament_matches set live_score_a = 3 where pool_id = $1 and sequence = 2", [poolA]);
const r3 = await remove(admin, entrant.Ana);
eq(r3.removed_games, 2, "Ana's two unplayed games are removed");
const afterA = await poolGames(poolA);
eq(afterA.map((g) => [g.sequence, Boolean(g.game_id)]), [[1, true]], "the scored game stays (with Ana in it)");
ok(mentions(afterA, ids.Ana) === 1 && afterA[0].game_id === game1, "it's the same game, still linked");
eq(await count("select 1 from games where id = $1", [game1]), 1, "and the game itself is untouched");

// Finals: someone in a final with a scored set can't be removed (the
// scored set would decide the final alone); an unplayed final just goes.
const finalPool = async (label) => (await one("insert into tournament_pools (tournament_id, division_id, round, label) values ($1, $2, 2, $3) returning id", [T, D, label])).id;
const addFinalSets = async (pool, [a1, a2, b1, b2]) => {
  for (const seq of [1, 2, 3]) {
    await db.query("insert into tournament_matches (tournament_id, division_id, pool_id, stage, round, sequence, a1, a2, b1, b2) values ($1, $2, $3, 'final', 2, $4, $5, $6, $7, $8)", [T, D, pool, seq, ids[a1], ids[a2], ids[b1], ids[b2]]);
  }
};
const poolGold = await finalPool("Gold");
await addFinalSets(poolGold, ["Bea", "Cat", "Dee", "Fay"]);
await as(player, "select submit_tournament_match_score((select id from tournament_matches where pool_id = $1 and sequence = 1), 21, 15)", [poolGold]);
await fails(() => remove(admin, entrant.Fay), /final that already has a scored set/, "a player in a final with a scored set can't be removed");
eq(await count("select 1 from tournament_matches where pool_id = $1 and stage = 'final'", [poolGold]), 3, "and every set of that final is still there");
ok(await count("select 1 from tournament_entrants where id = $1", [entrant.Fay]), "and they're still entered");

const poolSilver = await finalPool("Silver");
await addFinalSets(poolSilver, ["Gia", "Hal", "Bea", "Cat"]);
const r4 = await remove(admin, entrant.Hal);
eq(r4.removed_games, 3, "a finalist in an unplayed final: its 3 sets are removed");
eq(await count("select 1 from tournament_matches where pool_id = $1", [poolSilver]), 0, "so the final can be set up again");
await fails(() => remove(admin, entrant.Hal), /isn't in this tournament/, "removing the same player twice says so");

// ------------------------------------------------------------ Edit Game on a tournament game
{
  const edit = (uid, game, [a1, a2, b1, b2]) => as(uid, "select admin_update_beach_game_players($1, $2, $3, $4, $5)", [game, a1, a2, b1, b2]);
  const m = await one("select * from tournament_matches where game_id = $1", [game1]);
  const submitted = (await one("select submitted_by_name from games where id = $1", [game1])).submitted_by_name;
  eq(submitted, "Player", "a tournament game is submitted by whoever entered the score");
  const sub = await manual("Sub Stitute");

  await fails(() => edit(player, game1, [m.a1, m.a2, m.b1, sub]), /admin access required/, "a non-admin can't edit a game's players");
  await edit(admin, game1, [m.a1, m.a2, m.b1, sub]);
  const after = await one("select a1, a2, b1, b2 from tournament_matches where id = $1", [m.id]);
  eq(after, { a1: m.a1, a2: m.a2, b1: m.b1, b2: sub }, "the scheduled game's players follow the edit");
  eq((await all("select user_id from game_players where game_id = $1 order by slot", [game1])).map((r) => r.user_id), [m.a2, m.b1, sub], "the game's players changed as before");
  eq((await one("select submitted_by_name from games where id = $1", [game1])).submitted_by_name, "Player", "Submitted by is kept");
  ok((await one("select count(*)::int n from elo_history where game_id = $1 and user_id = $2", [game1, sub])).n === 1, "the substitute is rated for the game");

  // Swapping A1 into another slot also works (players stay distinct).
  await edit(admin, game1, [m.b1, sub, m.a1, m.a2]);
  eq(await one("select a1, a2, b1, b2 from tournament_matches where id = $1", [m.id]), { a1: m.b1, a2: sub, b1: m.a1, b2: m.a2 }, "rearranged players are saved to the schedule");
  await fails(() => edit(admin, game1, [m.b1, m.b1, m.a1, m.a2]), /four different people/, "the same player twice is still refused");

  // An ordinary game: Submitted by stays, nothing tournament-related changes.
  const [p1, p2, p3, p4] = [ids.Bea, ids.Cat, ids.Dee, ids.Gia];
  const [{ id: plain }] = await as(p1, "insert into games (user_id, name_a, name_b, score_a, score_b, mode, played_date, played_time, submitted_by_name, format) values ($1, 'A', 'B', 21, 10, 'casual', '2026-10-24', '10:00', 'Bea', 'beach') returning id", [p1]);
  await as(p1, "insert into game_players (game_id, user_id, slot) values ($1, $2, 'a2'), ($1, $3, 'b1'), ($1, $4, 'b2')", [plain, p2, p3, p4]);
  const schedBefore = await all("select id, a1, a2, b1, b2 from tournament_matches order by id");
  await edit(admin, plain, [p2, p1, p3, p4]);
  eq((await one("select submitted_by_name, user_id from games where id = $1", [plain])), { submitted_by_name: "Bea", user_id: p2 }, "an ordinary game keeps Submitted by when Player 1 changes");
  eq(await all("select id, a1, a2, b1, b2 from tournament_matches order by id"), schedBefore, "and no tournament game changes");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
