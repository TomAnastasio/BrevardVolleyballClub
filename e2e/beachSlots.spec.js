import { expect, test } from "@playwright/test";
import { PLAYER_NAME, signInAsPlayer } from "./signInAsTestUser.js";

// Whoever logs a 2v2 beach game can be in any of the 4 slots, or not
// playing at all. Player 1 (A1) has no game_players row -- it's
// games.user_id, which starts out as the submitter and is moved to the real
// A1 by assign_beach_game_a1 -- so this checks the saved game, not just the
// screen: each person in exactly their own slot, nobody twice.
//
// Real bug (2026-10-23): a member who put themselves in slot 3 ended up as
// both player 1 and player 3, because that function only accepted a new A1
// who was already linked to the game, and A1 never is.

async function pickPlayer(page, label, name) {
  await page.getByLabel(label).fill(name);
  await page.getByRole("option", { name }).first().click();
}

async function rest(session, path) {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Who the database says is in each slot of this bot's latest game with
// that exact score.
async function savedSlots(session, scoreA, scoreB) {
  const rows = await rest(
    session,
    `games?submitted_by_name=eq.${PLAYER_NAME}&score_a=eq.${scoreA}&score_b=eq.${scoreB}` +
      "&order=created_at.desc&limit=1" +
      "&select=id,a1:profiles!games_user_id_fkey(display_name),game_players(slot,profiles(display_name))",
  );
  const game = rows[0];
  if (!game) return null;
  const slots = { a1: game.a1?.display_name };
  for (const gp of game.game_players) slots[gp.slot] = gp.profiles?.display_name;
  return { id: game.id, slots };
}

async function logFinalScore(page, { mode, a1, a2, b1, b2, scoreA, scoreB }) {
  await page.goto("/");
  await page.getByRole("button", { name: "Game tracking" }).click();
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: "Enter Final Score" }).click();
  await page.getByRole("button", { name: "Beach" }).click();
  await page.getByRole("button", { name: "2v2 Beach" }).click();
  await page.getByRole("button", { name: mode }).click();

  await pickPlayer(page, "First side, player 1 name", a1);
  await pickPlayer(page, "First side, player 2 name", a2);
  await pickPlayer(page, "Second side, player 1 name", b1);
  await pickPlayer(page, "Second side, player 2 name", b2);

  await page.getByRole("button", { name: "Add Score" }).click();
  await page.getByLabel(`${a1} & ${a2} final score`).fill(String(scoreA));
  await page.getByLabel(`${b1} & ${b2} final score`).fill(String(scoreB));
  await page.getByRole("button", { name: "Save Game" }).click();
  await expect(page.getByRole("heading", { name: "Past Games" })).toBeVisible();
}

// Unusual scores so each case finds its own game among the many earlier
// runs have left on staging.
const CASES = [
  { title: "logger is player 2", a1: "Bob", a2: PLAYER_NAME, b1: "Carla", b2: "Dana", scoreA: 31, scoreB: 29 },
  { title: "logger is player 3", a1: "Bob", a2: "Carla", b1: PLAYER_NAME, b2: "Dana", scoreA: 32, scoreB: 30 },
  { title: "logger is player 4", a1: "Bob", a2: "Carla", b1: "Dana", b2: PLAYER_NAME, scoreA: 33, scoreB: 31 },
  { title: "logger isn't playing", a1: "Alice", a2: "Bob", b1: "Carla", b2: "Dana", scoreA: 34, scoreB: 32 },
];

for (const c of CASES) {
  test(`casual 2v2 beach: ${c.title}`, async ({ page }) => {
    const session = await signInAsPlayer(page);
    const before = await savedSlots(session, c.scoreA, c.scoreB);
    await logFinalScore(page, { mode: "Casual", ...c });

    await expect
      .poll(async () => {
        const saved = await savedSlots(session, c.scoreA, c.scoreB);
        return saved && saved.id !== before?.id ? saved.slots : null;
      })
      .toEqual({ a1: c.a1, a2: c.a2, b1: c.b1, b2: c.b2 });
    await expect(page.getByRole("alert")).toHaveCount(0);

    // And the game details screen shows the same 4 people, once each.
    const row = page.getByRole("listitem").filter({ hasText: `${c.a1} & ${c.a2}` }).filter({ hasText: String(c.scoreA) });
    await row.first().getByRole("button", { name: /^Game details:/ }).click();
    for (const name of [c.a1, c.a2, c.b1, c.b2]) {
      await expect(page.getByRole("button", { name: `View ${name}'s profile` })).toHaveCount(1);
    }
  });
}

// Ranked: the rating change has to land on the 4 real players, once each.
test("ranked 2v2 beach with the logger as player 3 rates each player once", async ({ page }) => {
  const session = await signInAsPlayer(page);
  const c = { a1: "Bob", a2: "Carla", b1: PLAYER_NAME, b2: "Dana", scoreA: 35, scoreB: 33 };
  const before = await savedSlots(session, c.scoreA, c.scoreB);
  await logFinalScore(page, { mode: "Ranked", ...c });

  let gameId;
  await expect
    .poll(async () => {
      const saved = await savedSlots(session, c.scoreA, c.scoreB);
      if (!saved || saved.id === before?.id) return null;
      gameId = saved.id;
      return saved.slots;
    })
    .toEqual({ a1: c.a1, a2: c.a2, b1: c.b1, b2: c.b2 });

  await expect
    .poll(async () => {
      const history = await rest(session, `elo_history?game_id=eq.${gameId}&select=delta,profiles(display_name)`);
      return history.map((h) => `${h.profiles?.display_name} ${h.delta > 0 ? "up" : "down"}`).sort();
    })
    .toEqual([`${c.a1} up`, `${c.a2} up`, `${c.b1} down`, `${c.b2} down`].sort());
});
