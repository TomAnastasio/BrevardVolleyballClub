// Scenarios for 20261025030000_profile_names_and_photo_limits.sql: every
// profile has a name, photo bucket limits, set_my_avatar_url pinned to the
// login's project. usage: node profiles.test.mjs
import fs from "fs";
import { freshDb } from "./harness.mjs";

let pass = 0, fail = 0;
const ok = (c, w) => { if (c) pass++; else { fail++; console.log("FAIL:", w); } };
const eq = (a, b, w) => ok(JSON.stringify(a) === JSON.stringify(b), `${w}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const fails = async (fn, re, w) => { try { await fn(); ok(false, w + " (expected error)"); } catch (e) { ok(re.test(e.message), `${w}: "${e.message}"`); } };

const MIGRATION = "20261025030000_profile_names_and_photo_limits.sql";
const db = await freshDb({ upTo: 20261025000000 });
const one = async (s, p = []) => (await db.query(s, p)).rows[0];
async function as(uid, sql, p = [], iss = null) {
  return db.transaction(async (tx) => {
    await tx.query("set local role authenticated");
    const claims = JSON.stringify({ sub: uid, role: "authenticated", ...(iss ? { iss } : {}) });
    await tx.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true), set_config('request.jwt.claims', $2, true)", [uid, claims]);
    return (await tx.query(sql, p)).rows;
  });
}
const user = async (meta) => (await one("insert into auth.users (raw_user_meta_data) values ($1) returning id", [meta])).id;
const nameOf = async (id) => (await one("select display_name from profiles where id = $1", [id])).display_name;

// ------------------------------------------------------------ before: nameless profiles exist
const named = await user({ full_name: "Named Player" });
const noMeta = await user({});
const blankMeta = await user({ full_name: "   " });
const manualBlank = (await one("insert into profiles (display_name, is_manual, elo_rating, elo_games_played) values ('', true, 1612, 7) returning id")).id;
const manualNull = (await one("insert into profiles (display_name, is_manual) values (null, true) returning id")).id;
const manualTab = (await one("insert into profiles (display_name, is_manual) values (E'\\t ', true) returning id")).id;
eq(await nameOf(noMeta), null, "before: a Google account with no name got a nameless profile");
const before = (await db.query("select id, display_name, avatar_url, elo_rating, elo_games_played, is_admin, is_manual, approved from profiles order by id")).rows;

await db.exec(fs.readFileSync(new URL(`../migrations/${MIGRATION}`, import.meta.url), "utf8"));

// ------------------------------------------------------------ backfill
for (const id of [noMeta, blankMeta, manualBlank, manualNull, manualTab]) eq(await nameOf(id), "New player", "nameless profile gets the placeholder");
eq(await nameOf(named), "Named Player", "named profile untouched");
const after = (await db.query("select id, display_name, avatar_url, elo_rating, elo_games_played, is_admin, is_manual, approved from profiles order by id")).rows;
eq(after.map(({ display_name, ...r }) => r), before.map(({ display_name, ...r }) => r), "backfill touches nothing but the missing names");
eq((await one("select elo_rating, elo_games_played from profiles where id = $1", [manualBlank])), { elo_rating: 1612, elo_games_played: 7 }, "rating kept");

// ------------------------------------------------------------ new sign-ups
eq(await nameOf(await user({ full_name: "  Ana   Lima " })), "Ana Lima", "Google full_name, tidied");
eq(await nameOf(await user({ name: "Only Name" })), "Only Name", "falls back to Google's name");
eq(await nameOf(await user({ full_name: " ", name: "Second Try" })), "Second Try", "blank full_name falls back to name");
eq(await nameOf(await user({ email: "secret@example.com" })), "New player", "never the email address");
eq(await nameOf(await user({})), "New player", "no metadata at all");

// ------------------------------------------------------------ the constraint vs every write path
const admin = await user({ full_name: "Admin" });
await db.query("update profiles set is_admin = true where id = $1", [admin]);
const insertManual = (name) => as(admin, "insert into profiles (display_name, is_manual) values ($1, true) returning id", [name]);
await fails(() => insertManual(""), /profiles_display_name_not_blank/, "admin can't add a manual profile with an empty name");
await fails(() => insertManual("   "), /profiles_display_name_not_blank/, "nor a spaces-only name");
await fails(() => insertManual(null), /profiles_display_name_not_blank/, "nor no name");
const manual = (await insertManual("Pat Manual"))[0].id;
ok(manual, "admin can still add a named manual profile");
await fails(() => db.query("update profiles set display_name = ' ' where id = $1", [named]), /profiles_display_name_not_blank/, "no direct blank update either");

eq((await as(admin, "select admin_set_display_name($1, '  Renamed  Player ') n", [manual]))[0].n, "Renamed Player", "admin rename still works");
await fails(() => as(admin, "select admin_set_display_name($1, '  ')", [manual]), /Name can't be empty/, "admin rename keeps its own blank-name message");

// Elo: a ranked game rates players (trigger updates profiles), and
// Recompute Elo (whole-table update) still runs.
const [p1, p2, p3] = [await user({ full_name: "P1" }), await user({ full_name: "P2" }), await user({ full_name: "P3" })];
const { id: game } = await one(
  "insert into games (user_id, name_a, name_b, score_a, score_b, mode, played_date, played_time) values ($1, 'A', 'B', 21, 15, 'ranked', '2026-10-24', '10:00') returning id",
  [named],
);
await as(named, "insert into game_players (game_id, user_id, slot) values ($1, $2, 'a2'), ($1, $3, 'b1'), ($1, $4, 'b2')", [game, p1, p2, p3]);
ok((await one("select elo_rating from profiles where id = $1", [named])).elo_rating > 1500, "saving a ranked game still rates it");
await as(admin, "select recompute_all_elo()");
ok((await one("select elo_rating from profiles where id = $1", [named])).elo_rating > 1500, "Recompute Elo still works");

// Merge: the placeholder's game moves onto the kept profile.
const dup = (await insertManual("Dup"))[0].id;
await db.query("update game_players set user_id = $1 where game_id = $2 and slot = 'b2'", [dup, game]);
await as(admin, "select merge_profiles($1, $2)", [p3, dup]);
eq(await one("select count(*)::int n from profiles where id = $1", [dup]), { n: 0 }, "merge still works");

// ------------------------------------------------------------ photo bucket limits
eq(await one("select file_size_limit::int, allowed_mime_types from storage.buckets where id = 'profile-photos'"),
  { file_size_limit: 2097152, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] }, "profile-photos bucket has limits");

// ------------------------------------------------------------ set_my_avatar_url pinned to the login's project
const me = named;
await db.query("insert into storage.objects (bucket_id, name, owner) values ('profile-photos', $1, $2)", [`${me}/a.jpg`, me]);
const url = (ref) => `https://${ref}.supabase.co/storage/v1/object/public/profile-photos/${me}/a.jpg`;
const setUrl = (ref, iss) => as(me, "select set_my_avatar_url($1)", [url(ref)], iss);
await setUrl("ourproject", "https://ourproject.supabase.co/auth/v1");
eq((await one("select avatar_url from profiles where id = $1", [me])).avatar_url, url("ourproject"), "a photo on the login's own project is accepted");
await fails(() => setUrl("otherproject", "https://ourproject.supabase.co/auth/v1"), /Invalid profile photo/, "a same-path photo on another project is refused");
await setUrl("ourproject", null);
ok(true, "a token with no issuer keeps the old check");
await fails(() => as(me, "select set_my_avatar_url($1)", [url("ourproject").replace(`${me}/a.jpg`, `${me}/missing.jpg`)], "https://ourproject.supabase.co/auth/v1"), /Invalid profile photo/, "the photo must exist");
await fails(() => as(p1, "select set_my_avatar_url($1)", [url("ourproject")], "https://ourproject.supabase.co/auth/v1"), /Invalid profile photo/, "and be in your own folder");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
