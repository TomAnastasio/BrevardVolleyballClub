import { expect, test } from "@playwright/test";

// Covers starting a casual 2v2 beach game, scoring it to a win, saving it,
// and seeing it show up in Past Games. NOTE: as of the "directory-only"
// player selection change (98738b4, 2026-10-04), players must be picked
// from a real search of signed-in profiles — this test can no longer run
// against an empty/unconfigured backend and needs a Supabase project with
// at least a couple of seeded player profiles to get past name entry.
// Everything else (ranked games, sign-in, admin) needs a real Google OAuth
// round trip and isn't covered here.
test("play and save a casual beach game end to end", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Game tracking" }).click();
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: "Beach" }).click();
  await page.getByRole("button", { name: "2v2 Beach" }).click();
  await page.getByRole("button", { name: "Casual" }).click();

  await page.getByLabel("First side, player 1 name").fill("Alice");
  await page.getByLabel("First side, player 2 name").fill("Bob");
  await page.getByLabel("Second side, player 1 name").fill("Carla");
  await page.getByLabel("Second side, player 2 name").fill("Dana");

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
  await expect(page.getByText("Alice & Bob")).toBeVisible();
  await expect(page.getByText("21")).toBeVisible();
  await expect(page.getByText("Carla & Dana")).toBeVisible();
});
