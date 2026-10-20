// One-off seeding script for the staging Supabase project -- run with
// `node e2e/seedStaging.js`. Uses the admin test bot's own session (normal
// anon key + password auth, never the service-role key) to insert manual
// profiles via the same "Admins can insert manual profiles" policy a real
// admin uses, satisfying the player-search requirement in e2e tests.
//
// Checks for existing names first and only inserts what's missing -- there's
// no unique constraint on display_name (by design, same as a real admin
// could create), so re-running this blindly would create duplicates.
import { getAdminSession } from "./signInAsTestUser.js";

const PLAYERS = ["Alice", "Bob", "Carla", "Dana"];

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const session = await getAdminSession();
  const headers = { apikey: anonKey, Authorization: `Bearer ${session.access_token}` };

  const existingRes = await fetch(`${url}/rest/v1/profiles?select=display_name&is_manual=eq.true`, { headers });
  const existing = new Set((await existingRes.json()).map((p) => p.display_name));
  const missing = PLAYERS.filter((name) => !existing.has(name));

  if (!missing.length) {
    console.log("Nothing to seed -- all of", PLAYERS.join(", "), "already exist.");
    return;
  }

  const res = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(missing.map((display_name) => ({ display_name, is_manual: true, approved: true }))),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(`seedStaging: insert failed: ${JSON.stringify(body)}`);
  console.log("Seeded profiles:", body.map((p) => p.display_name).join(", "));
}

main();
