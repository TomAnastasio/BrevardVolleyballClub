import { existsSync, readFileSync } from "node:fs";

// Playwright runs as plain Node, which doesn't get Vite's automatic
// .env.local loading, so pull it in by hand the first time this module
// is imported.
const envPath = new URL("../.env.local", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim();
  }
}

// Display names the bots sign up with (set via signup metadata -- see
// below) so each bot shows up in the player-search directory under its own
// name and can be picked as one of the 4 players in a game, same as any
// real member. There's no self-serve way to rename an existing profile
// (no update policy, by design -- see create_profiles_table.sql), so these
// must be set at signup time, not patched in afterward.
export const PLAYER_NAME = "TestBotPlayer";
export const ADMIN_NAME = "TestBotAdmin";

// Talk to GoTrue's REST API directly instead of via @supabase/supabase-js --
// the SDK's createClient() also spins up a Realtime websocket client, which
// throws under plain Node < 22 (no native WebSocket) and isn't needed here.
async function signUpOrSignIn(email, password, fullName) {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  async function goTrue(path, extra) {
    const res = await fetch(`${url}/auth/v1${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey },
      body: JSON.stringify({ email, password, ...extra }),
    });
    const body = await res.json();
    return { ok: res.ok, body };
  }

  let { ok, body } = await goTrue("/token?grant_type=password");
  if (!ok) {
    // Only signup (account creation) sets user_metadata -- the
    // handle_new_user() trigger reads it into profiles.display_name once,
    // at insert time, so this only has an effect the very first time.
    ({ ok, body } = await goTrue("/signup", { data: { full_name: fullName } }));
    if (!ok) throw new Error(`signUpOrSignIn(${email}): sign-up failed: ${JSON.stringify(body)}`);
  }
  if (!body.access_token) {
    throw new Error(
      `signUpOrSignIn(${email}): sign-up succeeded but returned no session -- check that ` +
        "the staging project has the Email provider enabled and 'Confirm email' turned off " +
        "(Authentication settings), so new accounts don't need an email confirmation click. " +
        `Response: ${JSON.stringify(body)}`,
    );
  }
  return body;
}

// Signs in (or, on first run, signs up) a test-only email/password account in
// the staging Supabase project, then injects the resulting session into the
// browser's localStorage before any page script runs -- the same slot
// supabase-js itself writes to after a real sign-in. This lets e2e tests
// cover signed-in flows without a human doing a real Google OAuth round trip.
async function signIn(page, email, password, fullName) {
  const url = process.env.VITE_SUPABASE_URL;
  if (!url || !process.env.VITE_SUPABASE_ANON_KEY || !email || !password) {
    throw new Error("signIn: missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / email / password in .env.local");
  }

  const session = await signUpOrSignIn(email, password, fullName);

  const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  await page
    .context()
    .addInitScript(([key, value]) => window.localStorage.setItem(key, value), [storageKey, JSON.stringify(session)]);

  return session;
}

// An ordinary signed-in account with no special privileges, named
// PLAYER_NAME so it's pickable from search as one of the 4 players --
// covers whatever a regular member can do (casual/ranked games, browsing).
export function signInAsPlayer(page) {
  return signIn(page, process.env.E2E_PLAYER_EMAIL, process.env.E2E_PLAYER_PASSWORD, PLAYER_NAME);
}

// Has profiles.is_admin=true on staging (set by hand via SQL Editor -- no
// self-serve way to grant admin), named ADMIN_NAME so it's pickable from
// search too. Covers admin-only flows (delete game, merge profiles, edit
// participants) and lets scripts seed test fixtures (like manual profiles)
// via the API instead of the SQL Editor.
export function signInAsAdmin(page) {
  return signIn(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD, ADMIN_NAME);
}

// For one-off Node scripts (not Playwright) that need the admin's access
// token to call the REST API directly, e.g. seeding fixtures.
export function getAdminSession() {
  return signUpOrSignIn(process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD, ADMIN_NAME);
}
