import { expect, test } from "@playwright/test";
import { ADMIN_NAME, signInAsAdmin } from "./signInAsTestUser.js";

// Covers the admin-only "Add Manual Profile" flow (AddManualProfileView.jsx)
// -- creating a player profile with no Google account -- then confirming
// the profile is actually searchable afterward, not just that the insert
// didn't error. Authenticates as the admin test bot (profiles.is_admin=true
// on staging, granted by hand once via SQL Editor) instead of a real Google
// OAuth round trip, same approach as scoreboard.spec.js.
test("admin can add a manual profile and it's searchable afterward", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Admin Panel" }).click();
  await page.getByRole("button", { name: "Add Manual Profile" }).click();

  await page.getByLabel("Player name").fill("ManualTestPlayer");
  await page.getByRole("button", { name: "Save" }).click();

  // onDone() returns to the admin menu on success -- if the insert had
  // failed, saveError would render instead and this card wouldn't reappear.
  await expect(page.getByRole("button", { name: "Add Manual Profile" })).toBeVisible();

  // Confirm it's really there and searchable, same as any other known
  // profile -- the actual consumer of this data, not just a DB round trip.
  await page.getByRole("button", { name: "Back to main menu" }).click();
  await page.getByRole("button", { name: "Game tracking" }).click();
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: "Live Scoreboard" }).click();
  await page.getByRole("button", { name: "Beach" }).click();
  await page.getByRole("button", { name: "2v2 Beach" }).click();
  await page.getByRole("button", { name: "Casual" }).click();

  await page.getByLabel("First side, player 1 name").fill("ManualTestPlayer");
  await expect(page.getByRole("option", { name: "ManualTestPlayer" }).first()).toBeVisible();
});

// Covers the "Find a player" box on Merge Profiles (PlayerLookup in
// MergeProfilesView.jsx): an existing name shows up as a match, a new name
// can be added right there, and the new profile is then pickable as the
// manual profile to remove. Timestamped name so the "Add" button shows on
// every run (it's hidden once a profile with exactly that name exists).
test("admin can look up a player on Merge Profiles and add a missing one", async ({ page }) => {
  const newName = `Lookup${Date.now().toString().slice(-8)}`;
  await signInAsAdmin(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Admin Panel" }).click();
  await page.getByRole("button", { name: "Merge Profiles" }).click();

  const lookup = page.getByLabel("Find a player");
  await lookup.fill(ADMIN_NAME);
  const matches = page.getByRole("list", { name: "Matching players" });
  await expect(matches.getByText(ADMIN_NAME, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /as a new player/ })).toHaveCount(0);

  await lookup.fill(newName);
  await expect(matches.getByText(`No players match "${newName}".`)).toBeVisible();
  await page.getByRole("button", { name: `+ Add "${newName}" as a new player` }).click();
  await expect(page.getByText(`Added ${newName} as a manual profile.`)).toBeVisible();

  await page.getByLabel("Manual profile to remove").fill(newName);
  await expect(page.getByRole("option", { name: newName })).toBeVisible();
});
