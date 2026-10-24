// Who can call what: every function the public API exposes, checked as an
// anonymous visitor and as a signed-in player. usage: node security.test.mjs
import { freshDb } from "./harness.mjs";

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log("FAIL:", what); } };

const db = await freshDb();
const one = async (sql, p = []) => (await db.query(sql, p)).rows[0];

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
const denied = async (fn, what) => {
  try { await fn(); ok(false, `${what} (expected permission denied)`); }
  catch (e) { ok(/permission denied/.test(e.message), `${what}: error was "${e.message}"`); }
};

const user = async (name, admin = false) => {
  const { id } = await one("insert into auth.users (raw_user_meta_data) values ($1) returning id", [{ full_name: name }]);
  if (admin) await db.query("update profiles set is_admin = true where id = $1", [id]);
  return id;
};

// ------------------------------------------------------------ internal Elo functions
const [admin, p1, p2, p3, p4] = [await user("Admin", true), await user("P1"), await user("P2"), await user("P3"), await user("P4")];
const elo = "select apply_elo_update($1, $2, 1500, 0, 1, 0.5)";
const { id: game } = await one(
  "insert into games (user_id, name_a, name_b, score_a, score_b, mode, played_date, played_time) values ($1, 'A', 'B', 21, 15, 'ranked', '2026-10-24', '10:00') returning id",
  [p1],
);

await denied(() => asAnon(elo, [game, p2]), "anonymous visitor can't write a rating");
await denied(() => as(p1, elo, [game, p2]), "signed-in player can't write a rating");
await denied(() => asAnon("select replay_all_elo_internal()"), "anonymous visitor can't replay all Elo");
await denied(() => as(p1, "select replay_all_elo_internal()"), "signed-in player can't replay all Elo");
ok((await one("select elo_rating from profiles where id = $1", [p2])).elo_rating === 1500, "rating untouched by the blocked calls");

// The app's own paths still rate games (they call these functions internally).
await as(p1, "insert into game_players (game_id, user_id, slot) values ($1, $2, 'a2'), ($1, $3, 'b1'), ($1, $4, 'b2')", [game, p2, p3, p4]);
const rated = await one("select elo_rating from profiles where id = $1", [p1]);
ok(rated.elo_rating > 1500, `saving a ranked game still rates it (P1 now ${rated.elo_rating})`);
await as(admin, "select recompute_all_elo()");
ok((await one("select elo_rating from profiles where id = $1", [p1])).elo_rating === rated.elo_rating, "admin Recompute Elo still works and gives the same rating");
await denied(() => as(p1, "select recompute_all_elo()").catch((e) => { throw /admin access required/.test(e.message) ? new Error("permission denied (admin check)") : e; }), "non-admin Recompute Elo is refused");

// ------------------------------------------------------------ Player 1 reassignment
// It once let visitors through: auth.uid() is null for them, and
// `user_id <> null` isn't true, so the submitter check passed.
{
  const outsider = await user("Outsider");
  await denied(() => asAnon("select assign_beach_game_a1($1, $2)", [game, outsider]), "anonymous visitor can't change a game's Player 1");
  let refused = false;
  try { await as(p2, "select assign_beach_game_a1($1, $2)", [game, outsider]); } catch (e) { refused = /only the original submitter/.test(e.message); }
  ok(refused, "a signed-in player who didn't submit the game can't change its Player 1");
  ok((await one("select user_id from games where id = $1", [game])).user_id === p1, "Player 1 unchanged");
}

// ------------------------------------------------------------ inventory
// Every security-definer function anon can still run must be one we've
// looked at and know refuses a caller who isn't signed in (auth.uid() is
// null for them, so "is this my row?" checks need an explicit null test),
// or is harmless. New functions should revoke anon instead of joining this.
const anonCallable = (await db.query(`
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
    and has_function_privilege('anon', p.oid, 'execute')
  order by 1`)).rows.map((r) => r.proname);
const reviewed = new Set([
  "is_current_user_admin", "is_game_participant", "tournament_is_visible", "require_admin", // read-only helpers used by RLS
  "admin_delete_game", "admin_profile_details", "admin_update_beach_game_players", "admin_update_beach_squad_game_players",
  "admin_update_indoor_game_players", "merge_profiles", "recompute_all_elo", // require_admin()
  "submit_tournament_match_score", "update_tournament_match_live_score", "cast_costume_vote", // auth.uid() checks
  "costume_vote_tally", // read-only, gated on tournament status
]);
const unexpected = anonCallable.filter((f) => !reviewed.has(f));
ok(unexpected.length === 0, `functions anyone can call that nobody has reviewed: ${unexpected.join(", ")}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
