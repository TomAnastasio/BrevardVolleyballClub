import { expect, test } from "@playwright/test";
import { PLAYER_NAME, signInAsPlayer } from "./signInAsTestUser.js";

// 1x1 PNG — any real image works; the app re-crops and re-encodes it.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// Opens the signed-in player's own profile the same way a QR-code sign-up
// does (the post-sign-in breadcrumb), so this doesn't depend on whether the
// bot currently shows up as ranked or unranked on the leaderboard.
async function openOwnProfile(page) {
  await page.goto("/");
  await page.evaluate(() =>
    sessionStorage.setItem("bvc-just-joined", JSON.stringify({ expiresAt: Date.now() + 60_000 })),
  );
  await page.reload();
  await expect(page.getByText(PLAYER_NAME, { exact: true })).toBeVisible();
}

// Covers ProfilePhotoEditor end to end against staging: pick a photo from
// the library, preview it, save, and confirm the new photo is what's stored
// (it survives a reload). Needs migration 20261022120000 pushed to staging.
test("player can change their own profile photo", async ({ page }) => {
  await signInAsPlayer(page);
  await openOwnProfile(page);

  await page.getByRole("button", { name: "Change profile photo" }).click();
  await expect(page.getByRole("button", { name: /Take photo/ })).toBeVisible();

  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Choose from library/ }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "me.png", mimeType: "image/png", buffer: TINY_PNG });

  await expect(page.getByRole("img", { name: "Preview of your new profile photo" })).toBeVisible();
  await page.getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByRole("status")).toHaveText(/Profile photo updated/);

  const savedSrc = await page
    .getByRole("button", { name: "Change profile photo" })
    .locator("img")
    .getAttribute("src");
  expect(savedSrc).toMatch(/\/storage\/v1\/object\/public\/profile-photos\/[0-9a-f-]+\/[0-9a-f-]+\.jpg$/);

  await openOwnProfile(page);
  await expect(page.getByRole("button", { name: "Change profile photo" }).locator("img")).toHaveAttribute(
    "src",
    savedSrc,
  );
});

test("other players' profiles have no photo editing", async ({ page }) => {
  await signInAsPlayer(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Rankings" }).click();
  // The seeded fixtures (Bob/Carla/Dana) have no ranked games, so they're
  // listed under the collapsed "Unranked players" section.
  await page.getByRole("button", { name: /Unranked players/ }).click();
  await page.getByRole("button", { name: /Bob|Carla|Dana/ }).first().click();
  await expect(page.getByRole("button", { name: "Back to rankings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change profile photo" })).toHaveCount(0);
});
