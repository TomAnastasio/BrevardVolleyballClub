import { expect, test } from "@playwright/test";
import { PLAYER_NAME, signInAsPlayer } from "./signInAsTestUser.js";

// Covers starting a casual 2v2 beach game, scoring it to a win, saving it,
// and seeing it show up in Past Games. Runs against a staging Supabase
// project (see .env.local): "New Game" requires sign-in (e96f18c), so this
// authenticates as the ordinary "player" test bot instead of a real Google
// OAuth round trip (see signInAsTestUser.js). Player slots must be picked
// from a real search of known profiles (98738b4, 2026-10-04) -- the staging
// project is seeded with three manual profiles named Bob/Carla/Dana for
// that (see seedStaging.js, run via the admin test bot), and the bot itself
// fills the 4th slot (A1), same as a real member recording their own game --
// deliberately NOT some unrelated identity, which would trip the "new A1
// player must already be linked to this game" guard in assign_beach_game_a1
// (20261004180000), a real safety check, just not one a real user ever hits.
// Admin-only flows get their own spec, signed in as the admin bot instead.
async function pickPlayer(page, label, name) {
  await page.getByLabel(label).fill(name);
  // .first(): display_name has no uniqueness constraint (an admin could
  // create two real profiles with the same name too), so more than one
  // match is expected, not a bug -- any of them is a valid, correct pick.
  await page.getByRole("option", { name }).first().click();
}

test("play and save a casual beach game end to end", async ({ page }) => {
  await signInAsPlayer(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Game tracking" }).click();
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: "Beach" }).click();
  await page.getByRole("button", { name: "2v2 Beach" }).click();
  await page.getByRole("button", { name: "Casual" }).click();

  await pickPlayer(page, "First side, player 1 name", PLAYER_NAME);
  await pickPlayer(page, "First side, player 2 name", "Bob");
  await pickPlayer(page, "Second side, player 1 name", "Carla");
  await pickPlayer(page, "Second side, player 2 name", "Dana");

  await page.getByRole("button", { name: "Start Game" }).click();

  const addPointA = page.getByRole("button", { name: "Add point to Team A" });
  for (let i = 0; i < 21; i++) {
    await addPointA.click();
  }

  await expect(page.getByRole("alert")).toContainText("wins!");
  await page.getByRole("button", { name: "Save Game" }).click();

  // handleSaveGame() returns to the game-tracking menu on success.
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();

  await page.getByRole("button", { name: "Past Games" }).click();
  // Scoped to this game's own row: the staging project accumulates real
  // saved games across test runs, so loose page-wide text matches (e.g.
  // "21") become ambiguous once more than one game happens to have that
  // score.
  const savedGame = page.getByRole("listitem").filter({ hasText: `${PLAYER_NAME} & Bob` }).first();
  await expect(savedGame).toBeVisible();
  await expect(savedGame).toContainText("21");
  await expect(savedGame).toContainText("Carla & Dana");
});
