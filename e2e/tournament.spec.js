import { expect, test } from "@playwright/test";
import { PLAYER_NAME, signInAsAdmin, signInAsPlayer } from "./signInAsTestUser.js";

// Whole Queen of the Court flow, start to finish, across three people:
//   admin  -> creates the tournament, imports a pasted roster, checks
//             everyone in, builds pools, publishes, starts scoring
//   player -> (any signed-in member) opens the shared ?t= link, sees their
//             next game, enters a final score
//   public -> (signed out) sees the live page with the result
// then the admin undoes the score and deletes the tournament, so repeated
// runs don't pile up tournaments on staging. Needs migration
// 20261022180000_tournaments.sql on staging (apply-migrations-staging.yml).
//
// Roster names are the manual profiles from seedStaging.js plus the player
// bot, so the import matches existing profiles instead of creating new ones.
// The tournament is unranked so it doesn't move staging Elo.
test("admin runs a Queen of the Court tournament and a player scores a game", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const name = `E2E Queen ${Date.now()}`;

  await signInAsAdmin(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Tournaments" }).click();
  await page.getByRole("button", { name: "+ New tournament" }).click();

  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Date").fill("2026-10-31");
  await page.getByLabel("Divisions").fill("E2E Open");
  await page.getByLabel("Games count toward Elo rankings").uncheck();
  await page.getByRole("button", { name: "Create tournament" }).click();

  // Import: pasted tab-separated rows, like copying from the response sheet.
  await page.getByRole("button", { name: "Import registrations" }).click();
  const roster = ["Alice", "Bob", "Carla", "Dana", PLAYER_NAME];
  await page
    .getByLabel("Pasted registration list")
    .fill(["First name\tLast name\tDate of birth\tDivision", ...roster.map((n) => `${n}\t\t01/01/1990\tE2E Open`)].join("\n"));
  await page.getByRole("button", { name: "Review players" }).click();
  // Staging has several same-named seeded manual profiles, so these rows
  // default to "new profile"; pick an existing one so each run doesn't
  // create five more. The bot's real (Google) account is matched on its own.
  for (const player of roster.slice(0, 4)) {
    await page.getByLabel(`Profile for ${player}`).selectOption({ index: 1 });
  }
  await expect(page.getByLabel(`Profile for ${PLAYER_NAME}`)).not.toHaveValue("__new__");
  await page.getByRole("button", { name: "Import 5" }).click();
  await expect(page.getByText("✓ Added 5 players")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  // Check everyone in.
  await page.getByRole("button", { name: "Players & check-in" }).click();
  for (const player of roster) {
    await page.getByRole("button", { name: `${player}: tap to check in` }).click();
    await expect(page.getByRole("button", { name: `${player}: checked in, tap to undo` })).toBeVisible();
  }
  await page.getByRole("button", { name: `‹ ${name}` }).click();

  // One pool of 5 -> 5 games, everyone partners everyone once.
  await page.getByRole("button", { name: "Pools & schedule" }).click();
  await page.getByRole("button", { name: /Preview pools \(5 players\)/ }).click();
  await expect(page.getByText("Pool A · 5 players · 5 games")).toBeVisible();
  await page.getByRole("button", { name: "Save pools" }).click();
  await expect(page.getByText("✓ Pools and game order saved")).toBeVisible();
  await page.getByRole("button", { name: `‹ ${name}` }).click();

  await page.getByRole("button", { name: "Publish (post pools publicly)" }).click();
  await page.getByRole("button", { name: "Start tournament (open scoring)" }).click();
  await expect(page.getByText("Live now")).toBeVisible();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/[?&]t=/);
  const tournamentId = new URL(page.url()).searchParams.get("t");

  // A regular member opens the shared link and scores their next game.
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();
  await signInAsPlayer(playerPage);
  await playerPage.goto(`/?t=${tournamentId}`);
  await expect(playerPage.getByText("Your next game")).toBeVisible({ timeout: 20_000 });
  await playerPage.getByRole("button", { name: /^Game 1: .* Keep score$/ }).click();
  await playerPage.getByRole("button", { name: "Already finished? Type the final score" }).click();
  await playerPage.locator("#team-a-final").fill("21");
  await playerPage.locator("#team-b-final").fill("15");
  await playerPage.getByRole("button", { name: "Review score" }).click();
  await playerPage.getByRole("button", { name: "Yes, submit" }).click();
  await expect(playerPage.getByRole("status")).toContainText("Saved:");
  await expect(playerPage.getByText("Final", { exact: true })).toBeVisible();
  await playerContext.close();

  // Signed out, the public page shows the result and standings.
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`/?t=${tournamentId}`);
  await expect(publicPage.getByRole("heading", { name })).toBeVisible();
  await expect(publicPage.getByText("Final", { exact: true })).toBeVisible();
  await expect(publicPage.getByRole("cell", { name: "1–0" }).first()).toBeVisible();
  await publicContext.close();

  // Cleanup through the app's own admin tools: undo the score, step back to
  // draft, delete.
  await page.reload();
  await page.getByRole("button", { name: "Admin: undo this score" }).click();
  await page.getByRole("button", { name: "Undo score" }).click();
  await expect(page.getByText("Final", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Manage tournament" }).click();
  await page.getByRole("button", { name: "Pause scoring (back to check-in)" }).click();
  await page.getByRole("button", { name: "Unpublish (back to draft)" }).click();
  await page.getByRole("button", { name: "Delete this draft" }).click();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await expect(page.getByRole("button", { name: "+ New tournament" })).toBeVisible();
  await expect(page.getByText(name)).toHaveCount(0);
});
