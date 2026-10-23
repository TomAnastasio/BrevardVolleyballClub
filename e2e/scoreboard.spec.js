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
// fills the 4th slot (A1), same as a real member recording their own game.
// The logger in other slots, or not playing at all, is covered by
// gameSlots.spec.js.
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
  await page.getByRole("button", { name: "Live Scoreboard" }).click();
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

  // Tapping the game opens its details: both rosters, each player opens
  // their profile, and Back steps back through each screen in turn. Staging
  // has many look-alike games from earlier runs (some from before their
  // players were linked, and the save above finishes in the background), so
  // this only relies on what's true of all of them: the submitter (A1) is
  // always linked, and every name shows either way.
  await savedGame.getByRole("button", { name: /^Game details:/ }).click();
  await expect(page.getByRole("heading", { name: "Game", exact: true })).toBeVisible();
  await expect(page.getByText("Team A · Won")).toBeVisible();
  for (const name of ["Bob", "Carla", "Dana"]) await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "✏️ Edit game" })).toHaveCount(0);
  await page.getByRole("button", { name: `View ${PLAYER_NAME}'s profile` }).click();
  await expect(page.getByText("Overall", { exact: true })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Game", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Past Games" })).toBeVisible();
});

// "Enter Final Score": same setup screens, but the result is typed in
// instead of tracked point by point -- open to every signed-in player, not
// just admins (this runs as the ordinary player bot on purpose).
test("enter a just-finished game's final score as a regular player", async ({ page }) => {
  await signInAsPlayer(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Game tracking" }).click();
  await expect(page.getByRole("button", { name: "Log Past Game" })).toHaveCount(0);
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: "Enter Final Score" }).click();
  await page.getByRole("button", { name: "Beach" }).click();
  await page.getByRole("button", { name: "2v2 Beach" }).click();
  await page.getByRole("button", { name: "Casual" }).click();

  await pickPlayer(page, "First side, player 1 name", PLAYER_NAME);
  await pickPlayer(page, "First side, player 2 name", "Carla");
  await pickPlayer(page, "Second side, player 1 name", "Bob");
  await pickPlayer(page, "Second side, player 2 name", "Dana");

  await page.getByRole("button", { name: "Add Score" }).click();
  await page.getByLabel(`${PLAYER_NAME} & Carla final score`).fill("25");
  await page.getByLabel("Bob & Dana final score").fill("23");
  await page.getByRole("button", { name: "Save Game" }).click();

  // Lands straight on Past Games, with the new game in it.
  const savedGame = page.getByRole("listitem").filter({ hasText: `${PLAYER_NAME} & Carla` }).first();
  await expect(savedGame).toBeVisible();
  await expect(savedGame).toContainText("25");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

// Held upright, the scoreboard uses its own portrait layout (not a rotated
// landscape one): serve marker follows whoever won the last rally, −1 takes
// back that team's latest point, and beach games get a "Switch sides"
// banner every 7 points. Doesn't save, so it leaves nothing on staging.
test("portrait scoreboard shows the server and side switches", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsPlayer(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Game tracking" }).click();
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: "Live Scoreboard" }).click();
  await page.getByRole("button", { name: "Beach" }).click();
  await page.getByRole("button", { name: "2v2 Beach" }).click();
  await page.getByRole("button", { name: "Casual" }).click();

  await pickPlayer(page, "First side, player 1 name", PLAYER_NAME);
  await pickPlayer(page, "First side, player 2 name", "Bob");
  await pickPlayer(page, "Second side, player 1 name", "Carla");
  await pickPlayer(page, "Second side, player 2 name", "Dana");
  await page.getByRole("button", { name: "Start Game" }).click();

  const panelA = page.getByRole("region", { name: "Team A scoring panel" });
  const panelB = page.getByRole("region", { name: "Team B scoring panel" });
  const addA = page.getByRole("button", { name: "Add point to Team A" });
  const addB = page.getByRole("button", { name: "Add point to Team B" });

  // Not rotated: Team A sits above Team B on screen.
  const boxA = await panelA.boundingBox();
  const boxB = await panelB.boundingBox();
  expect(boxA.y + boxA.height).toBeLessThanOrEqual(boxB.y + 1);
  expect(boxA.width).toBeGreaterThan(300);

  await expect(page.getByText("SERVING")).toHaveCount(0);
  await addA.click();
  await expect(panelA.getByText("SERVING")).toBeVisible();
  await addB.click();
  await expect(panelB.getByText("SERVING")).toBeVisible();
  await expect(panelA.getByText("SERVING")).toHaveCount(0);

  // −1 on Team B hands the serve back to Team A (who won the rally before).
  await page.getByRole("button", { name: "Remove point from Team B, fix a mistake" }).click();
  await expect(panelA.getByText("SERVING")).toBeVisible();

  // 1-0 → 4-3 is 7 points played.
  const switchBanner = page.getByRole("status").filter({ hasText: "Switch sides" });
  for (let i = 0; i < 3; i++) await addA.click();
  for (let i = 0; i < 2; i++) await addB.click();
  await expect(switchBanner).toHaveCount(0);
  await addB.click();
  await expect(switchBanner).toContainText("7 points played");
  await switchBanner.getByRole("button", { name: "Done" }).click();
  await expect(switchBanner).toHaveCount(0);
  await addA.click();
  await expect(switchBanner).toHaveCount(0);
});
