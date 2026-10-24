// Scenario tests for the tokens/items/pulls migration, run against every real
// migration in a throwaway Postgres (PGlite). usage: node tokens.test.mjs [EXTRA_MIGRATION.sql]
import { freshDb } from "./harness.mjs";

const MIG = process.argv[2];
let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log("FAIL:", what); } };
const eq = (a, b, what) => ok(JSON.stringify(a) === JSON.stringify(b), `${what}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

const db = await freshDb({ extra: MIG ? [MIG] : [] });
const one = async (sql, p = []) => (await db.query(sql, p)).rows[0];
const all = async (sql, p = []) => (await db.query(sql, p)).rows;

// Run SQL as a signed-in player (RLS on, auth.uid() = uid), like a PostgREST call.
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

let n = 0;
async function user(name, admin = false) {
  const { id } = await one("insert into auth.users (raw_user_meta_data) values ($1) returning id", [{ full_name: name }]);
  if (admin) await db.query("update profiles set is_admin = true where id = $1", [id]);
  return id;
}
const manual = async (name) => (await one("insert into profiles (display_name, is_manual) values ($1, true) returning id", [name])).id;
const balance = async (uid) => (await as(uid, "select my_tokens() as t"))[0].t.balance;

// Saves a game the way the app does, as `submitter`. Then backdates it to `at`
// (default: 2 minutes ago, i.e. settled) as the database owner.
async function saveGame(submitter, { a, b, mode = "ranked", format = "beach", teamSize = null, players = [], a1 = null, at = null }) {
  const [g] = await as(submitter, `insert into games (user_id, name_a, name_b, score_a, score_b, mode, played_date, played_time, format, team_size)
    values ($1, 'A', 'B', $2, $3, $4, '2026-10-24', '10:00', $5, $6) returning id`, [submitter, a, b, mode, format, teamSize]);
  if (players.length) {
    const vals = players.map((p, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`).join(", ");
    await as(submitter, `insert into game_players (game_id, user_id, slot, team) values ${vals}`, [g.id, ...players.flatMap((p) => [p.id, p.slot ?? null, p.team ?? null])]);
  }
  if (a1 && a1 !== submitter) await as(submitter, "select assign_beach_game_a1($1, $2)", [g.id, a1]);
  await db.query("update games set created_at = $2 where id = $1", [g.id, at ?? new Date(Date.now() - 120000).toISOString()]);
  return g.id;
}

// Counting starts well before the test games so we can place them on any day.
await db.query("update token_settings set started_at = '2026-10-01T00:00:00Z'");

// ------------------------------------------------------------ earning
const [s, p1, p2, p3, p4] = [await user("Sub"), await user("P1"), await user("P2"), await user("P3"), await user("P4")];

{ // 2v2 beach where the submitter isn't playing and P1 is Player 1
  const g = await saveGame(s, { a: 21, b: 15, players: [{ id: p2, slot: "a2" }, { id: p3, slot: "b1" }, { id: p4, slot: "b2" }], a1: p1 });
  eq(await balance(p1), 2, "2v2 winner (Player 1, reassigned) gets 2");
  eq(await balance(p2), 2, "2v2 winner (A2) gets 2");
  eq(await balance(p3), 1, "2v2 loser gets 1");
  eq(await balance(s), 0, "submitter who wasn't playing gets nothing");
  eq(await balance(p1), 2, "asking again doesn't pay twice");
  await balance(p4); // tokens are counted when a player next opens the app
  eq((await one("select count(*)::int n from token_earnings where game_id = $1", [g])).n, 4, "one record per player");
}
{ // not settled yet: saved just now
  const g = await saveGame(s, { a: 10, b: 21, players: [{ id: p2, slot: "a2" }, { id: p3, slot: "b1" }, { id: p4, slot: "b2" }], at: new Date().toISOString() });
  eq(await balance(p3), 1, "a game under a minute old isn't paid yet");
  await db.query("update games set created_at = now() - interval '61 seconds' where id = $1", [g]);
  eq(await balance(p3), 3, "it pays once it's a minute old");
  eq(await balance(s), 1, "submitter as Player 1 (lost) gets 1");
}
{ // casual, tie, indoor, squad beach
  await saveGame(s, { a: 21, b: 10, mode: "casual", players: [{ id: p2, slot: "a2" }, { id: p3, slot: "b1" }, { id: p4, slot: "b2" }], a1: p1 });
  eq(await balance(p1), 2, "casual games pay nothing");
  const before = await balance(p4);
  await saveGame(s, { a: 15, b: 15, players: [{ id: p2, slot: "a2" }, { id: p3, slot: "b1" }, { id: p4, slot: "b2" }], a1: p1 });
  eq(await balance(p4) - before, 1, "a tie pays 1");
  const i0 = [await balance(p1), await balance(p2)];
  await saveGame(s, { a: 25, b: 20, format: "indoor", players: [{ id: p1, team: "a" }, { id: p3, team: "a" }, { id: p2, team: "b" }, { id: p4, team: "b" }] });
  eq([await balance(p1) - i0[0], await balance(p2) - i0[1]], [2, 1], "indoor pays by team");
  const q0 = await balance(s);
  await saveGame(s, { a: 5, b: 21, teamSize: 3, players: [{ id: p1, team: "a" }, { id: p2, team: "a" }, { id: p3, team: "a" }, { id: p4, team: "b" }] });
  eq(await balance(s) - q0, 0, "squad beach: the submitter isn't treated as Player 1");
}

// ------------------------------------------------------------ daily cap and days
{
  const [x, y, z, w] = [await user("X"), await user("Y"), await user("Z"), await user("W")];
  const win = (at) => saveGame(x, { a: 21, b: 1, players: [{ id: y, slot: "a2" }, { id: z, slot: "b1" }, { id: w, slot: "b2" }], at });
  // Oct 20 is daylight time: Eastern midnight is 04:00 UTC.
  for (let k = 0; k < 7; k++) await win(`2026-10-20T14:0${k}:00Z`);
  eq(await balance(x), 10, "7 wins in a day are capped at 10");
  eq((await all("select tokens from token_earnings where player_id = $1 order by created_at", [x])).map((r) => r.tokens), [2, 2, 2, 2, 2, 0, 0], "paid in save order, then 0");
  await win("2026-10-21T03:59:00Z"); // 11:59pm Eastern on the 20th
  eq(await balance(x), 10, "11:59pm Eastern still counts as the full day");
  await win("2026-10-21T04:01:00Z"); // 12:01am Eastern on the 21st
  eq(await balance(x), 12, "12:01am Eastern is a new day");
  // a capped day can end on an odd number: 4 wins + 1 loss + 1 win = 2+2+2+2+1, then 1 of 2
  const [x2, y2, z2, w2] = [await user("X2"), await user("Y2"), await user("Z2"), await user("W2")];
  for (let k = 0; k < 4; k++) await saveGame(x2, { a: 21, b: 1, players: [{ id: y2, slot: "a2" }, { id: z2, slot: "b1" }, { id: w2, slot: "b2" }], at: `2026-10-22T15:0${k}:00Z` });
  await saveGame(x2, { a: 1, b: 21, players: [{ id: y2, slot: "a2" }, { id: z2, slot: "b1" }, { id: w2, slot: "b2" }], at: "2026-10-22T15:10:00Z" });
  await saveGame(x2, { a: 21, b: 1, players: [{ id: y2, slot: "a2" }, { id: z2, slot: "b1" }, { id: w2, slot: "b2" }], at: "2026-10-22T15:20:00Z" });
  eq(await balance(x2), 10, "partial payment fills the day to exactly 10");
  eq((await one("select e.reason from token_earnings e join games g on g.id = e.game_id where e.player_id = $1 order by g.created_at desc limit 1", [x2])).reason, "daily_cap", "marked as capped");
}

// ------------------------------------------------------------ who doesn't earn
{
  const [a, b2, c] = [await user("A"), await user("B"), await user("C")];
  const m = await manual("Placeholder");
  await saveGame(a, { a: 21, b: 3, players: [{ id: m, slot: "a2" }, { id: b2, slot: "b1" }, { id: c, slot: "b2" }] });
  eq(await one("select count(*)::int n from token_balances where player_id = $1", [m]), { n: 0 }, "placeholders never get a balance");
  eq(await one("select count(*)::int n from token_earnings where player_id = $1", [m]), { n: 0 }, "placeholders never earn");
  // back pay: a game saved before counting started
  await db.query("update token_settings set started_at = '2026-10-23T00:00:00Z'");
  const [d, e, f, h] = [await user("D"), await user("E"), await user("F"), await user("H")];
  await saveGame(d, { a: 21, b: 3, players: [{ id: e, slot: "a2" }, { id: f, slot: "b1" }, { id: h, slot: "b2" }], at: "2026-10-22T12:00:00Z" });
  eq(await balance(d), 0, "games before launch never pay");
  await db.query("update token_settings set started_at = '2026-10-01T00:00:00Z'");
}

// ------------------------------------------------------------ edits, deletes, merges, tournaments
{
  const admin = await user("Admin", true);
  const [a, b, c, d, e] = [await user("Ea"), await user("Eb"), await user("Ec"), await user("Ed"), await user("Ee")];
  const g = await saveGame(a, { a: 21, b: 9, players: [{ id: b, slot: "a2" }, { id: c, slot: "b1" }, { id: d, slot: "b2" }] });
  eq([await balance(a), await balance(d)], [2, 1], "before the edit");
  await as(admin, "select admin_update_beach_game_players($1, $2, $3, $4, $5)", [g, a, b, c, e]); // swap d out for e
  eq(await balance(e), 1, "a player added later by an admin is paid");
  eq(await balance(d), 1, "the player removed keeps their token");
  eq(await balance(b), 2, "re-saved players aren't paid twice");
  await as(admin, "select admin_delete_game($1)", [g]);
  eq([await balance(a), await balance(e)], [2, 1], "deleting the game takes nothing back");

  // merge: a placeholder's ranked games move to a real account and never pay
  const m = await manual("Old placeholder");
  const [k, o1, o2, o3] = [await user("Keeper"), await user("O1"), await user("O2"), await user("O3")];
  const gm = await saveGame(o1, { a: 21, b: 9, players: [{ id: m, slot: "a2" }, { id: o2, slot: "b1" }, { id: o3, slot: "b2" }] });
  const gm2 = await saveGame(admin, { a: 21, b: 9, players: [{ id: o1, slot: "a2" }, { id: o2, slot: "b1" }, { id: o3, slot: "b2" }] });
  await db.query("update games set user_id = $2 where id = $1", [gm2, m]); // a game where the placeholder is Player 1 (as an admin edit can make)
  await db.query("delete from token_earnings where game_id = $1", [gm2]);
  await as(admin, "select merge_profiles($1, $2)", [k, m]);
  eq(await balance(k), 0, "games brought in by a merge never pay");
  eq((await all("select reason from token_earnings where player_id = $1 order by reason", [k])).map((r) => r.reason), ["merged", "merged"], "both moved games are marked");
  const own = await saveGame(k, { a: 21, b: 9, players: [{ id: o1, slot: "a2" }, { id: o2, slot: "b1" }, { id: o3, slot: "b2" }] });
  eq(await balance(k), 2, "the merged account still earns from new games");
  eq(await one("select count(*)::int n from token_merge_moves"), { n: 0 }, "merge scratch rows are cleared");
  // an admin edit (not a merge) that swaps a placeholder for a real player does pay
  const m2 = await manual("Typo");
  const ge = await saveGame(o1, { a: 21, b: 9, players: [{ id: m2, slot: "a2" }, { id: o2, slot: "b1" }, { id: o3, slot: "b2" }] });
  const r0 = await balance(e);
  await as(admin, "select admin_update_beach_game_players($1, $2, $3, $4, $5)", [ge, o1, e, o2, o3]);
  eq(await balance(e) - r0, 2, "an admin edit replacing a placeholder pays the real player");
  void own;

  // tournament score entry
  const [t1, t2, t3, t4] = [await user("T1"), await user("T2"), await user("T3"), await user("T4")];
  const { id: tid } = await one("insert into tournaments (name, event_date, status) values ('Queen', '2026-10-31', 'live') returning id");
  const { id: div } = await one("insert into tournament_divisions (tournament_id, name) values ($1, 'Open') returning id", [tid]);
  const { id: mid } = await one("insert into tournament_matches (tournament_id, division_id, stage, sequence, a1, a2, b1, b2) values ($1, $2, 'final', 1, $3, $4, $5, $6) returning id", [tid, div, t1, t2, t3, t4]);
  const [{ gid }] = await as(t1, "select submit_tournament_match_score($1, 21, 17) as gid", [mid]);
  await db.query("update games set created_at = now() - interval '2 minutes' where id = $1", [gid]);
  eq([await balance(t1), await balance(t2), await balance(t3), await balance(t4)], [2, 2, 1, 1], "tournament games pay like any 2v2 game");
}

// ------------------------------------------------------------ privacy and permissions
{
  const [a, b] = [await user("Priv A"), await user("Priv B")];
  await db.query("insert into token_balances (player_id, balance) values ($1, 5) on conflict (player_id) do update set balance = 5", [b]);
  eq((await as(a, "select * from token_balances where player_id = $1", [b])).length, 0, "can't see someone else's balance");
  eq((await as(b, "select balance from token_balances where player_id = $1", [b]))[0]?.balance, 5, "can see your own");
  try { await as(b, "update token_balances set balance = 999 where player_id = $1", [b]); } catch { /* refused outright is fine too */ }
  eq((await one("select balance from token_balances where player_id = $1", [b])).balance, 5, "players can not edit their own balance");
  await fails(() => as(a, "insert into token_balances (player_id, balance) values ($1, 50)", [a]), /row-level security|duplicate/, "players can't insert a balance");
  await fails(() => as(a, "insert into player_items (player_id, item_key) values ($1, 'head/devil-horns/rare/bighorn-curls')", [a]), /row-level security/, "players can't give themselves items");
  await fails(() => as(a, "select settle_tokens($1)", [a]), /permission denied/, "settle isn't callable from the app");
  await fails(() => asAnon("select brew()"), /permission denied/, "signed-out visitors can't brew");
  await fails(() => asAnon("select my_tokens()"), /permission denied/, "signed-out visitors can't read tokens");
  ok((await asAnon("select count(*)::int n from cosmetic_items"))[0].n === 479, "anyone can read the catalog");
  ok((await asAnon("select count(*)::int n from player_outfits"))[0].n >= 0, "anyone can read outfits");
}

// ------------------------------------------------------------ brewing
{
  const a = await user("Brewer");
  await fails(() => as(a, "select brew()"), /need a token/, "no tokens, no brew");
  await db.query("insert into token_balances (player_id, balance) values ($1, 3) on conflict (player_id) do update set balance = 3", [a]);
  const [{ r }] = await as(a, "select brew() as r");
  ok(r.key && r.balance === 2, "a brew returns the item and the new balance");
  eq((await one("select balance, spent from token_balances where player_id = $1", [a])), { balance: 2, spent: 1 }, "it spends exactly one token");
  eq((await as(a, "select item_key from player_items"))[0].item_key, r.key, "the item is now owned");
  eq((await as(a, "select count(*)::int n from pulls"))[0].n, 1, "the pull is logged");

  // brew everything: never a duplicate, then nothing left
  await db.query("update token_balances set balance = 600 where player_id = $1", [a]);
  for (let k = 0; k < 478; k++) await as(a, "select brew()");
  eq(await one("select count(*)::int n, count(distinct item_key)::int d from player_items where player_id = $1", [a]), { n: 479, d: 479 }, "479 brews = every item once, no duplicates");
  await fails(() => as(a, "select brew()"), /nothing left/, "nothing left to brew");
  eq((await one("select balance from token_balances where player_id = $1", [a])).balance, 600 - 478, "478 brews spent 478, the failed one nothing");

  // Halloween items stop dropping after November
  const b = await user("Late brewer");
  await db.query("insert into token_balances (player_id, balance) values ($1, 5) on conflict (player_id) do update set balance = 5", [b]);
  await db.query("update cosmetic_items set available_until = now() - interval '1 second'");
  await fails(() => as(b, "select brew()"), /nothing left/, "retired items don't drop");
  eq((await one("select count(*)::int n from player_items where player_id = $1", [a])).n, 479, "owners keep retired items");
  await db.query("update cosmetic_items set available_until = '2026-12-01 00:00:00-05'");
  eq((await one("select to_char(available_until at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI') t from cosmetic_items limit 1")).t, "2026-12-01 00:00", "retirement is midnight Eastern going into Dec 1");
}

// ------------------------------------------------------------ odds
{
  const N = Number(process.env.ODDS_N || 20000);
  const a = await user("Odds");
  await db.query("insert into token_balances (player_id, balance) values ($1, $2) on conflict (player_id) do update set balance = $2", [a, N + 3010]);
  const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (let k = 0; k < N; k++) {
    const [{ r }] = await as(a, "select brew() as r");
    counts[r.tier]++;
    await db.query("delete from player_items where player_id = $1", [a]); // forget it, so every roll is a fresh one
  }
  const pct = Object.fromEntries(Object.entries(counts).map(([t, c]) => [t, +(100 * c / N).toFixed(2)]));
  console.log(`odds over ${N} brews:`, JSON.stringify(pct));
  ok(Math.abs(pct.common - 76) < 1.2 && Math.abs(pct.rare - 20) < 1.2 && Math.abs(pct.epic - 3.8) < 0.5 && Math.abs(pct.legendary - 0.2) < 0.15, "odds match 76/20/3.8/0.2");

  // own every Common: their 76% is shared out, so Rare becomes 20/24 = 83.3%
  await db.query("insert into player_items (player_id, item_key) select $1, key from cosmetic_items where tier = 'common'", [a]);
  const c2 = { common: 0, rare: 0, epic: 0, legendary: 0 };
  const M = 3000;
  for (let k = 0; k < M; k++) {
    const [{ r }] = await as(a, "select brew() as r");
    c2[r.tier]++;
    await db.query("delete from player_items where player_id = $1 and item_key = $2", [a, r.key]);
  }
  console.log(`with every Common owned, over ${M} brews:`, JSON.stringify(Object.fromEntries(Object.entries(c2).map(([t, c]) => [t, +(100 * c / M).toFixed(1)]))));
  ok(c2.common === 0 && Math.abs(100 * c2.rare / M - 83.3) < 3, "a finished tier's odds go to the rest");
}

// ------------------------------------------------------------ outfits
{
  const a = await user("Dresser");
  const [hat, hat2, shirt, mon] = ["head/devil-horns/rare/bighorn-curls", "head/witch-hat/rare/candy-corn", "shirt/skeleton-tee/rare/glow-bones", "transformation/legendary/spider-queen"];
  await fails(() => as(a, "select equip_item($1)", [hat]), /don't own/, "can't wear what you don't own");
  await db.query("insert into player_items (player_id, item_key) values ($1, $2), ($1, $3), ($1, $4), ($1, $5)", [a, hat, hat2, shirt, mon]);
  await as(a, "select equip_item($1)", [hat]);
  await as(a, "select equip_item($1)", [shirt]);
  await as(a, "select equip_item($1)", [mon]);
  eq(await one("select head, shirt, transformation from player_outfits where player_id = $1", [a]), { head: hat, shirt, transformation: mon }, "a transformation covers the outfit, which is kept");
  await as(a, "select equip_item($1)", [hat2]);
  eq(await one("select head, transformation from player_outfits where player_id = $1", [a]), { head: hat2, transformation: null }, "wearing clothing switches the transformation off");
  await as(a, "select equip_item($1)", [mon]);
  await as(a, "select unequip('transformation')");
  eq(await one("select head, shirt, transformation from player_outfits where player_id = $1", [a]), { head: hat2, shirt, transformation: null }, "Back to my outfit");
  await as(a, "select unequip('head')");
  eq((await one("select head from player_outfits where player_id = $1", [a])).head, null, "Plain takes a slot off");
  await fails(() => as(a, "select unequip('hat')"), /Unknown slot/, "bad slot names are refused");
  eq((await as(a, "select count(*)::int n from player_items where seen_at is null"))[0].n, 4, "new items start unseen");
  await as(a, "select mark_items_seen()");
  eq((await as(a, "select count(*)::int n from player_items where seen_at is null"))[0].n, 0, "mark_items_seen clears NEW");
  const other = await user("Viewer");
  eq((await as(other, "select shirt from player_outfits where player_id = $1", [a]))[0]?.shirt, shirt, "other players can see what you're wearing");
  eq((await as(other, "select count(*)::int n from player_items where player_id = $1", [a]))[0].n, 0, "but not what you own");
}

// ------------------------------------------------------------ Elo untouched
{
  const before = await one("select count(*)::int n, coalesce(sum(elo_rating), 0)::int s from profiles");
  const hist = await one("select count(*)::int n from elo_history");
  ok(before.n > 0 && hist.n > 0, "Elo ran normally alongside tokens (sanity)");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
