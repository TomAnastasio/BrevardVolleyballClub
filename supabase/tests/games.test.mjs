// Scenarios for 20261025040000_record_game_in_one_step.sql: saving a game in
// one step with the right Player 1, safe retries, and locked Elo updates.
// usage: node games.test.mjs
import { randomUUID } from "crypto";
import { freshDb } from "./harness.mjs";

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log("FAIL:", what); } };
const eq = (a, b, what) => ok(JSON.stringify(a) === JSON.stringify(b), `${what}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

const db = await freshDb();
const one = async (sql, p = []) => (await db.query(sql, p)).rows[0];
const all = async (sql, p = []) => (await db.query(sql, p)).rows;

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

const user = async (name, admin = false) => {
  const { id } = await one("insert into auth.users (raw_user_meta_data) values ($1) returning id", [{ full_name: name }]);
  if (admin) await db.query("update profiles set is_admin = true where id = $1", [id]);
  return id;
};
const manual = async (name) => (await one("insert into profiles (display_name, is_manual) values ($1, true) returning id", [name])).id;

// The app's call, as named arguments like supabase.rpc() sends them.
const RECORD = `select record_game(
  p_game_id => $1, p_name_a => $2, p_name_b => $3, p_score_a => $4, p_score_b => $5,
  p_mode => $6, p_format => $7, p_team_size => $8, p_played_date => $9, p_played_time => $10,
  p_a1 => $11, p_a2 => $12, p_b1 => $13, p_b2 => $14, p_team_a => $15, p_team_b => $16) as id`;
function args(g) {
  return [
    g.id ?? randomUUID(), g.nameA ?? "Team A", g.nameB ?? "Team B", g.a ?? 21, g.b ?? 15,
    g.mode ?? "ranked", g.format ?? "beach", g.teamSize ?? null, g.date ?? "2026-10-25", g.time ?? "10:00",
    g.a1 ?? null, g.a2 ?? null, g.b1 ?? null, g.b2 ?? null, g.teamA ?? null, g.teamB ?? null,
  ];
}
const record = async (uid, g) => (await as(uid, RECORD, args(g)))[0].id;

const elo = async (id) => (await one("select elo_rating r, elo_games_played n from profiles where id = $1", [id]));
const historyFor = async (game) => (await all("select user_id, delta from elo_history where game_id = $1 order by user_id", [game]));
const gamesCount = async () => (await one("select count(*)::int n from games")).n;

const admin = await user("Admin", true);
const [sub, p1, p2, p3, p4, p5, p6, p7, p8] = await Promise.all(
  ["Submitter", "Paula", "Quinn", "Rae", "Sam", "Tess", "Uma", "Vic", "Wes"].map((n) => user(n)),
);
const ghost = await manual("Ghost");

// ------------------------------------------------------------ 2v2: Player 1 is not the submitter
{
  // Submitter is in B1, someone else is Player 1 (the 2026-10-23 bug).
  const id = await record(sub, { a1: p1, a2: p2, b1: sub, b2: p3, nameA: "Paula & Quinn", nameB: "Submitter & Rae" });
  const g = await one("select * from games where id = $1", [id]);
  eq(g.user_id, p1, "Player 1 is stored as games.user_id");
  eq(g.submitted_by, sub, "the submitter is recorded separately");
  eq(g.submitted_by_name, "Submitter", "submitted_by_name comes from the caller's profile");
  ok(Math.abs(Date.now() - new Date(g.created_at).getTime()) < 60000, "created_at set by the server");
  const h = await historyFor(id);
  eq(h.length, 4, "four rating changes, one per player");
  eq(new Set(h.map((r) => r.user_id)).size, 4, "nobody rated twice");
  eq((await elo(p1)), { r: 1520, n: 1 }, "real Player 1 rated as a winner");
  eq((await elo(sub)), { r: 1480, n: 1 }, "submitter rated once, as B1 (a loser)");
}

// ------------------------------------------------------------ 2v2: submitter not playing
{
  const before = await elo(sub);
  const id = await record(sub, { a1: p4, a2: p5, b1: p6, b2: p7, a: 19, b: 21 });
  eq((await one("select user_id from games where id = $1", [id])).user_id, p4, "Player 1 is p4");
  eq(await elo(sub), before, "submitter who isn't playing isn't rated");
  eq((await historyFor(id)).length, 4, "the four players are rated");
  eq((await elo(p6)).r, 1520, "B side won");
  const links = await all("select user_id, slot from game_players where game_id = $1 order by slot", [id]);
  eq(links.map((l) => l.slot), ["a2", "b1", "b2"], "slot rows for A2/B1/B2");
}

// ------------------------------------------------------------ the rating matches a full replay
{
  const ratings = await all("select id, elo_rating from profiles order by id");
  await as(admin, "select recompute_all_elo()");
  eq(await all("select id, elo_rating from profiles order by id"), ratings, "rating straight from the save equals an admin Recompute (no replay needed)");
}

// ------------------------------------------------------------ retries
{
  const gid = randomUUID();
  const g = { id: gid, a1: sub, a2: p1, b1: p2, b2: p3 };
  eq(await record(sub, g), gid, "first save returns the phone's id");
  const ratings = await all("select id, elo_rating, elo_games_played from profiles order by id");
  const count = await gamesCount();
  eq(await record(sub, g), gid, "retry returns the same id");
  eq(await record(sub, { ...g, a: 30, b: 28 }), gid, "retry with a changed body still returns the saved game");
  eq(await gamesCount(), count, "no duplicate game");
  eq((await one("select score_a from games where id = $1", [gid])).score_a, 21, "the saved game isn't overwritten by a retry");
  eq((await historyFor(gid)).length, 4, "no second rating");
  eq(await all("select id, elo_rating, elo_games_played from profiles order by id"), ratings, "ratings unchanged by the retry");
  await fails(() => record(p1, g), /already used by another game/, "another account can't claim the same id");

  // tokens: settle the game, retry, settle again -- paid once
  await db.query("update token_settings set started_at = now() - interval '1 day'");
  await db.query("update games set created_at = now() - interval '2 minutes' where id = $1", [gid]);
  const first = (await as(sub, "select my_tokens() t"))[0].t.balance;
  await record(sub, g);
  const second = (await as(sub, "select my_tokens() t"))[0].t.balance;
  ok(first > 0, `the game paid tokens (${first})`);
  eq(second, first, "a retry doesn't pay tokens twice");
  eq((await one("select count(*)::int n from token_earnings where game_id = $1 and player_id = $2", [gid, sub])).n, 1, "one token record for the game");
}

// ------------------------------------------------------------ who may call it
{
  await fails(() => asAnon(RECORD, args({ a1: p1, a2: p2, b1: p3, b2: p4 })), /permission denied/, "anonymous visitor can't save a game");
  const fn = await one("select has_function_privilege('anon', 'record_game(uuid,text,text,integer,integer,text,text,integer,date,text,uuid,uuid,uuid,uuid,uuid[],uuid[])', 'execute') a, has_function_privilege('authenticated', 'record_game(uuid,text,text,integer,integer,text,text,integer,date,text,uuid,uuid,uuid,uuid,uuid[],uuid[])', 'execute') b");
  eq([fn.a, fn.b], [false, true], "anon can't run it, signed-in players can");
  // signed-in role with no user id (shouldn't happen, but auth.uid() is the check)
  await fails(
    () => db.transaction(async (tx) => { await tx.query("set local role authenticated"); return tx.query(RECORD, args({ a1: p1, a2: p2, b1: p3, b2: p4 })); }),
    /sign in/, "no auth.uid() is refused",
  );
}

// ------------------------------------------------------------ validation
{
  const base = { a1: p1, a2: p2, b1: p3, b2: p4 };
  const count = await gamesCount();
  const bad = [
    [{ a: 21, b: 21 }, /tie/, "tie"],
    [{ a: 20, b: 18 }, /at least 21 points/, "beach winner below 21"],
    [{ a: 22, b: 21 }, /2-point lead/, "1-point lead"],
    [{ a: -1, b: 21 }, /0 or more/, "negative score"],
    [{ mode: "friendly" }, /mode/, "unknown mode"],
    [{ format: "grass" }, /format/, "unknown format"],
    [{ teamSize: 5 }, /team size/, "team size 5"],
    [{ format: "indoor", teamSize: 3, a: 25, b: 20 }, /team size/, "indoor with a team size"],
    [{ ...base, b2: p1 }, /twice/, "same player twice"],
    [{ ...base, b2: randomUUID() }, /known profile/, "unknown profile"],
    [{ ...base, a1: null }, /all four players/, "ranked game missing Player 1"],
    [{ nameA: "x".repeat(101) }, /100 characters/, "team name too long"],
    [{ nameA: "   " }, /names are missing/, "blank team name"],
    [{ time: "25:00" }, /malformed/, "bad time"],
    [{ format: "indoor", a: 25, b: 20 }, /slots are only for 2v2/, "indoor with 2v2 slots"],
    [{ teamA: [p5], teamB: [p6] }, /team lists are only/, "2v2 with team lists"],
    [{ format: "indoor", a: 24, b: 22, a1: null, a2: null, b1: null, b2: null, teamA: [p1], teamB: [p2] }, /at least 25 points/, "indoor winner below 25"],
    [{ teamSize: 3, a1: null, a2: null, b1: null, b2: null, teamA: [p1, p2, p3], teamB: [p4, p5] }, /exactly 3/, "3v3 short a player"],
    [{ format: "indoor", a: 25, b: 20, a1: null, a2: null, b1: null, b2: null, teamA: [], teamB: [p2] }, /1 to 15/, "indoor side with nobody"],
    [{ format: "indoor", a: 25, b: 20, a1: null, a2: null, b1: null, b2: null, teamA: [p1, p2], teamB: [p2, p3] }, /twice/, "indoor player on both sides"],
  ];
  for (const [g, re, what] of bad) await fails(() => record(sub, { ...base, ...g }), re, `refused: ${what}`);
  await fails(() => as(sub, RECORD, args(base).map((v, i) => (i === 0 ? null : v))), /id is missing/, "refused: no game id");
  eq(await gamesCount(), count, "nothing saved by any refused call");
}

// ------------------------------------------------------------ squad and indoor
{
  const id = await record(sub, { teamSize: 3, teamA: [p3, p1, p2], teamB: [p4, p5, ghost], nameA: "ignored", a: 21, b: 10 });
  const g = await one("select * from games where id = $1", [id]);
  eq([g.user_id, g.team_size, g.format], [sub, 3, "beach"], "3v3: user_id stays the submitter");
  eq([g.name_a, g.name_b], ["Rae, Paula, Quinn", "Sam, Tess, Ghost"], "3v3: names built from profiles in the order picked");
  eq((await historyFor(id)).length, 6, "3v3: all six rated once (placeholder included)");

  const before = await elo(sub);
  const ind = await record(sub, { format: "indoor", teamA: [p1, p2, p3, p4], teamB: [p5, p6, p7, p8], a: 23, b: 25 });
  eq((await historyFor(ind)).length, 8, "indoor: all eight rated once");
  eq(await elo(sub), before, "indoor: submitter not playing isn't rated");
  eq((await one("select count(*)::int n from game_players where game_id = $1 and team = 'b'", [ind])).n, 4, "indoor: team rows saved");

  const big = Array.from({ length: 15 }, (_, i) => i);
  const roster = await Promise.all(big.map((i) => manual(`Long Player Name Number ${i} ${"x".repeat(40)}`)));
  const roster2 = await Promise.all(big.map((i) => manual(`Other Side ${i}`)));
  const huge = await record(sub, { format: "indoor", mode: "casual", teamA: roster, teamB: roster2, a: 25, b: 3 });
  ok((await one("select char_length(name_a) n from games where id = $1", [huge])).n > 1000, "indoor: a 15-player roster of long names still saves");
}

// ------------------------------------------------------------ casual
{
  const id = await record(sub, { mode: "casual", a1: p1, a2: p2, b1: p3, b2: p4 });
  eq((await historyFor(id)).length, 0, "casual 2v2 isn't rated");
  // a player typed in by name (older copies of the app) leaves a slot empty
  const typed = await record(sub, { mode: "casual", a1: null, a2: p2, b1: null, b2: p4, nameA: "Submitter & Quinn", nameB: "Guest & Sam" });
  const g = await one("select user_id from games where id = $1", [typed]);
  eq(g.user_id, sub, "casual with no Player 1 picked falls back to the submitter");
  eq((await all("select slot from game_players where game_id = $1 order by slot", [typed])).map((r) => r.slot), ["a2", "b2"], "only picked players linked");
  const sq = await record(sub, { mode: "casual", teamSize: 4, teamA: [p1, p2, p3, p4], teamB: [p5, p6, p7, p8] });
  eq((await historyFor(sq)).length, 0, "casual 4v4 isn't rated");
}

// ------------------------------------------------------------ back-to-back games build on each other
{
  // The row locks can't be raced in a single-connection test database, but
  // the second of two games sharing players must read the first one's result.
  await db.query("update profiles set elo_rating = 1500, elo_games_played = 0");
  await db.query("delete from elo_history");
  await record(sub, { a1: p1, a2: p2, b1: p3, b2: p4 });
  await record(sub, { a1: p1, a2: p3, b1: p2, b2: p4 });
  eq((await elo(p1)).r, 1540, "p1 won twice: +20 then +20");
  eq((await elo(p4)).r, 1460, "p4 lost twice");
  eq((await elo(p1)).n, 2, "two games counted");
  for (const fn of ["handle_game_players_insert", "handle_indoor_game_players_insert"]) {
    const src = (await one("select prosrc from pg_proc where proname = $1", [fn])).prosrc;
    ok(/order by id\s+for no key update/.test(src), `${fn} locks the players' rows in id order, without clashing with foreign-key locks`);
  }
}

// ------------------------------------------------------------ older copies of the app still save
{
  const { id } = (await as(sub, "insert into games (user_id, name_a, name_b, score_a, score_b, mode, played_date, played_time) values ($1, 'A', 'B', 21, 12, 'ranked', '2026-10-25', '11:00') returning id", [sub]))[0];
  await as(sub, "insert into game_players (game_id, user_id, slot) values ($1, $2, 'a2'), ($1, $3, 'b1'), ($1, $4, 'b2')", [id, p2, p3, p4]);
  await as(sub, "select assign_beach_game_a1($1, $2)", [id, p1]);
  eq((await one("select user_id, submitted_by from games where id = $1", [id])), { user_id: p1, submitted_by: null }, "direct insert + assign_beach_game_a1 still works");
  eq((await historyFor(id)).length, 4, "and is rated");
}

// ------------------------------------------------------------ a late retry can't bring back a deleted game
{
  const gid = randomUUID();
  const g = { id: gid, a1: p1, a2: p2, b1: p3, b2: p4 };
  await record(sub, g);
  const before = await elo(p1);
  await as(admin, "select admin_delete_game($1)", [gid]);
  eq((await one("select count(*)::int n from games where id = $1", [gid])).n, 0, "admin deleted the game");
  ok((await elo(p1)).n === before.n - 1, "deleting a ranked game still replays Elo");
  await fails(() => record(sub, g), /an admin deleted this game/, "a retry after the delete is refused, plainly");
  eq((await one("select count(*)::int n from games where id = $1", [gid])).n, 0, "and the game stays deleted");
  eq((await elo(p1)).n, before.n - 1, "and nobody is re-rated");
  await fails(() => as(sub, "select count(*) from deleted_games"), /permission denied/, "players can't read the deleted-games list");
  await fails(() => as(sub, "insert into deleted_games (game_id) values ($1)", [randomUUID()]), /permission denied|row-level security/, "players can't write to it");
  await fails(() => as(sub, "select admin_delete_game($1)", [randomUUID()]), /admin/, "admin_delete_game still admin-only");
}

// ------------------------------------------------------------ admin edit of a record_game game
{
  const id = await record(sub, { a1: p1, a2: p2, b1: p3, b2: p4 });
  await as(admin, "select admin_update_beach_game_players($1, $2, $3, $4, $5)", [id, p5, p2, p3, p4]);
  eq((await one("select user_id, submitted_by from games where id = $1", [id])), { user_id: p5, submitted_by: sub }, "admin can still change Player 1; submitter kept");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
