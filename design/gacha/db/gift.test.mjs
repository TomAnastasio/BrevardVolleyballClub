// Scenarios for 20261024235000_gift_10_tokens.sql.
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { STUB } from "./harness.mjs";
let pass = 0, fail = 0;
const ok = (c, w) => { if (c) pass++; else { fail++; console.log("FAIL:", w); } };
const eq = (a, b, w) => ok(JSON.stringify(a) === JSON.stringify(b), `${w}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const dir = "/workspace/supabase/migrations";
const GIFT = "20261024235000_gift_10_tokens.sql";
const db = new PGlite();
await db.exec(STUB);
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) if (f !== GIFT) await db.exec(fs.readFileSync(`${dir}/${f}`, "utf8"));
const one = async (s, p = []) => (await db.query(s, p)).rows[0];
async function as(uid, sql, p = []) { return db.transaction(async (tx) => { await tx.query("set local role authenticated"); await tx.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)", [uid]); return (await tx.query(sql, p)).rows; }); }
const user = async (n, provider) => { const { id } = await one("insert into auth.users (raw_user_meta_data) values ($1) returning id", [{ full_name: n }]); if (provider) await db.query("insert into auth.identities (user_id, provider) values ($1, $2)", [id, provider]); return id; };
const bal = async (id) => (await one("select balance, earned, spent from token_balances where player_id = $1", [id])) ?? null;

const fresh = await user("Fresh", "google");                  // no balance row yet
const rich = await user("Rich", "google");                    // already has tokens
await db.query("insert into token_balances (player_id, balance, earned, spent) values ($1, 3, 5, 2)", [rich]);
const email = await user("Email", "email");                    // not Google
const both = await user("Both", "email"); await db.query("insert into auth.identities (user_id, provider) values ($1, 'google')", [both]);
const placeholder = (await one("insert into profiles (display_name, is_manual) values ('Manual', true) returning id")).id;

await db.exec(fs.readFileSync(`${dir}/${GIFT}`, "utf8"));
eq(await bal(fresh), { balance: 10, earned: 10, spent: 0 }, "Google account with no tokens gets 10");
eq(await bal(rich), { balance: 13, earned: 15, spent: 2 }, "Google account with tokens gets +10 on top");
eq(await bal(both), { balance: 10, earned: 10, spent: 0 }, "account with Google plus another sign-in gets 10");
eq(await bal(email), null, "email-only account gets nothing");
eq(await bal(placeholder), null, "placeholder profile gets nothing");
eq((await one("select count(*)::int n from token_gifts")).n, 3, "one gift record per Google account");

// running the gift statements again must not pay twice
const sql = fs.readFileSync(`${dir}/${GIFT}`, "utf8");
await db.exec(sql.slice(sql.indexOf("with given as")));
eq(await bal(fresh), { balance: 10, earned: 10, spent: 0 }, "re-running doesn't pay twice");

const later = await user("Later", "google");
eq((await as(later, "select my_tokens() t"))[0].t.balance, 0, "someone signing up afterwards doesn't get it");

eq((await as(fresh, "select my_tokens() t"))[0].t.balance, 10, "my_tokens shows the gift");
const r = (await as(fresh, "select brew() r"))[0].r;
ok(r.key && r.balance === 9, "the gift tokens brew: " + JSON.stringify(r));
eq((await as(fresh, "select count(*)::int n from token_gifts"))[0].n, 1, "players see only their own gift");
eq((await as(email, "select count(*)::int n from token_gifts"))[0].n, 0, "and nobody else's");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
