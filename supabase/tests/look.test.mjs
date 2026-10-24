// Scenarios for 20261024230000_avatar_and_skin_color.sql (already in the migrations folder).
import { freshDb } from "./harness.mjs";
let pass = 0, fail = 0;
const ok = (c, w) => { if (c) pass++; else { fail++; console.log("FAIL:", w); } };
const eq = (a, b, w) => ok(JSON.stringify(a) === JSON.stringify(b), `${w}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const db = await freshDb();
const one = async (s, p = []) => (await db.query(s, p)).rows[0];
async function as(uid, sql, p = []) { return db.transaction(async (tx) => { await tx.query("set local role authenticated"); await tx.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)", [uid]); return (await tx.query(sql, p)).rows; }); }
async function asAnon(sql, p = []) { return db.transaction(async (tx) => { await tx.query("set local role anon"); return (await tx.query(sql, p)).rows; }); }
const fails = async (fn, re, w) => { try { await fn(); ok(false, w + " (expected error)"); } catch (e) { ok(re.test(e.message), `${w}: "${e.message}"`); } };
const user = async (n) => (await one("insert into auth.users (raw_user_meta_data) values ($1) returning id", [{ full_name: n }])).id;

const a = await user("A"), b = await user("B");
// an existing outfit row from before the migration's columns matter
await db.query("insert into cosmetic_items (key, slot, tier, name, item_set) values ('head/x/rare/y', 'head', 'rare', 'Y', 't') on conflict do nothing");
await db.query("insert into player_items (player_id, item_key) values ($1, 'head/x/rare/y')", [a]);
await as(a, "select equip_item('head/x/rare/y')");
eq(await one("select avatar, skin from player_outfits where player_id = $1", [a]), { avatar: 1, skin: 2 }, "existing outfits default to Avatar 1, skin color 2");
await as(a, "select set_look(2, 4)");
eq(await one("select head, avatar, skin from player_outfits where player_id = $1", [a]), { head: "head/x/rare/y", avatar: 2, skin: 4 }, "set_look changes the look and keeps the outfit");
await as(b, "select set_look(1, 1)");
eq(await one("select head, avatar, skin from player_outfits where player_id = $1", [b]), { head: null, avatar: 1, skin: 1 }, "set_look works with no outfit row yet");
await fails(() => as(a, "select set_look(3, 1)"), /Unknown avatar/, "avatar must be 1 or 2");
await fails(() => as(a, "select set_look(1, 5)"), /Unknown skin color/, "skin must be 1-4");
await fails(() => as(a, "select set_look(1, 0)"), /Unknown skin color/, "skin must be 1-4 (low)");
await fails(() => asAnon("select set_look(1, 1)"), /permission denied/, "signed out can't call it");
await fails(() => as(a, "update player_outfits set skin = 1 where player_id = $1", [b]).then((r) => { throw new Error("no error"); }), /no error|permission|policy/, "no direct writes");
eq((await one("select skin from player_outfits where player_id = $1", [b])).skin, 1, "another player's look is untouched");
eq((await as(b, "select avatar, skin from player_outfits where player_id = $1", [a]))[0], { avatar: 2, skin: 4 }, "others can see your look");
eq((await asAnon("select avatar from player_outfits where player_id = $1", [a]))[0], { avatar: 2 }, "signed out can see it too");
await as(a, "select unequip('head')");
eq(await one("select avatar, skin from player_outfits where player_id = $1", [a]), { avatar: 2, skin: 4 }, "unequip keeps the look");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
