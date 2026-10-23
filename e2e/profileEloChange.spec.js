import { expect, test } from "@playwright/test";
import { signInAsPlayer } from "./signInAsTestUser.js";

// Uses seedStagingGames.js's permanent demo data: Sam Whitaker always has
// ranked games on staging, so this checks real Elo history, not faked rows.
const RANKED_PLAYER = "Sam Whitaker";
const ELO_PILL = /^[+-]?\d+ Elo$/;

test("a profile's ranked game cards show that player's Elo change, matching the game's details", async ({ page }) => {
  await signInAsPlayer(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Rankings" }).click();
  await page.getByRole("button", { name: `View ${RANKED_PLAYER}'s profile` }).click();

  // The first game card carrying an Elo pill; its stretched details button
  // sits in the same list item.
  const card = page.getByRole("listitem").filter({ has: page.getByText(ELO_PILL) }).first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  const delta = (await card.getByText(ELO_PILL).textContent()).replace(" Elo", "");

  await card.getByRole("button", { name: /^Game details:/ }).click();
  await expect(page.getByRole("button", { name: `View ${RANKED_PLAYER}'s profile` })).toContainText(delta, { timeout: 20_000 });
});
